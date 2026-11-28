import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';

export interface OcrVariant {
  name: string;
  price: number;
}

export interface OcrMenuItem {
  name: string;
  price: number;
  description: string;
  isVeg: boolean;
  spiceLevel: 'NONE' | 'MILD' | 'MEDIUM' | 'SPICY';
  variants: OcrVariant[];
  confidence: number;
}

export interface OcrMenuCategory {
  name: string;
  items: OcrMenuItem[];
}

export interface OcrScanResult {
  categories: OcrMenuCategory[];
  totalItems: number;
  rawLinesCount: number;
}

interface LexiconData {
  sections?: string[];
  dishes?: string[];
}

const PRICE_RE =
  /(?:₹|rs\.?|inr)?\s*(\d{2,5})(?:\s*[\/|:;]\s*(\d{2,5}))?(?:\s*[\/|:;]\s*(\d{2,5}))?\s*(?:\/-|-)?\s*$/i;
const SECTION_WORDS_RE =
  /^(starters?|appetizers?|soups?|salads?|main ?course|mains|breads?|rotis?|rice|biryani|desserts?|sweets|beverages?|drinks|shakes|mocktails|snacks|chinese|tandoor|thali|combos?|breakfast|sandwich(es)?|pizzas?|burgers?|pasta|south indian|north indian|specials?|sides?|chaat|rolls|momos|noodles|raita|veg|non[ -]?veg|boiler|gavran|mutton|chicken|paneer|seafood|egg|fish)\b/i;
const NONVEG_RE =
  /chicken|mutton|fish|prawn|egg|keema|lamb|kebab|tikka masala|seekh|meat|crab|gavran|boiler|non[ -]?veg/i;

function tidy(s: string): string {
  return s
    .replace(/^\s*[\[(][^\])\s]{0,3}[\])]?\s+/, '')
    .replace(/^[^A-Za-z0-9\u0900-\u097F]+/, '')
    .replace(/[|_~`•·…]+/g, ' ')
    .replace(/\.{2,}|-{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toTitleCase(s: string): string {
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : s;
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return m[a.length][b.length];
}

function repairSpelling(name: string, list: string[], minScore = 0.84): string {
  const n = name.toLowerCase();
  let best: string | null = null;
  let bestScore = 0;
  for (const candidate of list) {
    const l = candidate.toLowerCase();
    if (Math.abs(l.length - n.length) > 3) continue;
    const score = 1 - levenshtein(n, l) / Math.max(n.length, l.length);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= minScore && bestScore < 1 && best
    ? best.replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : name;
}

@Injectable()
export class MenuOcrService {
  private readonly logger = new Logger(MenuOcrService.name);
  private lexicon: LexiconData = { sections: [], dishes: [] };
  private tessWorker: any = null;
  private workerStarting: Promise<any> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.loadLexicon();
  }

  private loadLexicon() {
    try {
      const candidates = [
        path.join(__dirname, 'lexicon.json'),
        path.join(process.cwd(), 'src/modules/menu/lexicon.json'),
        path.join(process.cwd(), 'backend/src/modules/menu/lexicon.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          this.lexicon = JSON.parse(fs.readFileSync(p, 'utf8')) as LexiconData;
          return;
        }
      }
    } catch (err) {
      this.logger.warn(`Could not load culinary lexicon: ${String(err)}`);
    }
  }

  private ensureTessDataDir(): string {
    const dataDir = path.join(process.cwd(), 'tmp', 'tessdata');
    fs.mkdirSync(dataDir, { recursive: true });
    const dst = path.join(dataDir, 'eng.traineddata.gz');
    if (!fs.existsSync(dst)) {
      const pkgJsonPath = require.resolve('@tesseract.js-data/eng/package.json');
      const src = path.join(
        path.dirname(pkgJsonPath),
        '4.0.0_best_int',
        'eng.traineddata.gz',
      );
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }
    return dataDir;
  }

  private async getWorker() {
    if (this.tessWorker) return this.tessWorker;
    if (this.workerStarting) return this.workerStarting;

    this.workerStarting = (async () => {
      const dataDir = this.ensureTessDataDir();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createWorker } = require('tesseract.js');
      const w = await createWorker(['eng'], 1, {
        langPath: dataDir,
        cachePath: dataDir,
        gzip: true,
        logger: () => {},
      });
      await w.setParameters({ preserve_interword_spaces: '1' });
      this.tessWorker = w;
      this.workerStarting = null;
      return w;
    })();

    try {
      return await this.workerStarting;
    } catch (err) {
      this.workerStarting = null;
      throw err;
    }
  }

  private scheduleRelease() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(async () => {
      const w = this.tessWorker;
      this.tessWorker = null;
      if (w) {
        await w.terminate().catch(() => {});
      }
    }, 10 * 60 * 1000);
    if (this.idleTimer.unref) this.idleTimer.unref();
  }

  private parseLines(lines: Array<{ text: string; confidence: number }>): OcrScanResult {
    const categories: OcrMenuCategory[] = [];
    let current: OcrMenuCategory | null = null;
    let lastItem: OcrMenuItem | null = null;

    const getOrCreateCat = (name: string): OcrMenuCategory => {
      const cleanName = repairSpelling(
        toTitleCase(name),
        this.lexicon.sections ?? [],
        0.8,
      );
      let existing = categories.find(
        (c) => c.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (!existing) {
        existing = { name: cleanName, items: [] };
        categories.push(existing);
      }
      current = existing;
      return existing;
    };

    for (const raw of lines) {
      const t = tidy(raw.text);
      if (t.length < 2) continue;

      const priceMatch = t.match(PRICE_RE);
      const letters = t.replace(/[^A-Za-z\u0900-\u097F]/g, '');

      if (priceMatch && letters.length >= 2) {
        const dishRaw = tidy(t.slice(0, priceMatch.index))
          .replace(/[:\-–]+$/, '')
          .trim();
        if (dishRaw.length < 2) continue;

        const prices = [priceMatch[1], priceMatch[2], priceMatch[3]]
          .filter(Boolean)
          .map(Number)
          .filter((p) => p >= 5 && p <= 50000);
        if (!prices.length) continue;

        const cat = current ?? getOrCreateCat('Menu');
        const dishName = repairSpelling(
          toTitleCase(dishRaw),
          this.lexicon.dishes ?? [],
          0.84,
        );
        const item: OcrMenuItem = {
          name: dishName,
          price: Math.min(...prices),
          description: '',
          isVeg: !NONVEG_RE.test(`${dishName} ${cat.name}`),
          spiceLevel: /spicy|chilli|schezwan|peri|vindaloo/i.test(dishName)
            ? 'SPICY'
            : 'NONE',
          variants:
            prices.length === 2
              ? [
                  { name: 'Half', price: prices[0] },
                  { name: 'Full', price: prices[1] },
                ]
              : prices.length === 3
                ? ['Small', 'Medium', 'Large'].map((n, idx) => ({
                    name: n,
                    price: prices[idx],
                  }))
                : [],
          confidence: Number(((raw.confidence ?? 80) / 100).toFixed(2)),
        };
        cat.items.push(item);
        lastItem = item;
        continue;
      }

      if (!letters.length) {
        const pm = t.match(/(\d{2,5})/);
        if (lastItem && pm && !lastItem.price) {
          lastItem.price = Number(pm[1]);
        }
        continue;
      }

      // Likely a section header
      if (
        t.length <= 36 &&
        (SECTION_WORDS_RE.test(t) ||
          t === t.toUpperCase() ||
          t.split(/\s+/).length <= 3)
      ) {
        getOrCreateCat(t);
        lastItem = null;
      } else if (lastItem && t.length <= 90 && !lastItem.description) {
        lastItem.description = t;
      }
    }

    const nonEmpty = categories.filter((c) => c.items.length > 0);
    return {
      categories: nonEmpty,
      totalItems: nonEmpty.reduce((acc, c) => acc + c.items.length, 0),
      rawLinesCount: lines.length,
    };
  }

  async scanMenuImage(buffer: Buffer): Promise<OcrScanResult> {
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 1200;
    const processed = await sharp(buffer)
      .rotate()
      .resize({
        width: width < 1400 ? 1800 : Math.min(width, 2600),
        withoutEnlargement: false,
      })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    const worker = await this.getWorker();
    try {
      const result = await worker.recognize(processed);
      const rawLines: Array<{ text: string; confidence: number }> =
        result?.data?.lines?.map((l: any) => ({
          text: String(l.text ?? ''),
          confidence: Number(l.confidence ?? 80),
        })) ??
        String(result?.data?.text ?? '')
          .split('\n')
          .map((text: string) => ({ text, confidence: 80 }));

      return this.parseLines(rawLines);
    } finally {
      this.scheduleRelease();
    }
  }

  async importScannedMenu(
    branchId: string,
    categories: OcrMenuCategory[],
  ): Promise<{ createdCategories: number; createdItems: number }> {
    return this.prisma.$transaction(async (tx) => {
      const existingCats = await tx.menuCategory.findMany({
        where: { branchId },
      });
      const existingItems = await tx.menuItem.findMany({
        where: { branchId },
        select: { name: true, categoryId: true },
      });

      const catByName = new Map(
        existingCats.map((c) => [c.name.trim().toLowerCase(), c]),
      );
      const itemKeys = new Set(
        existingItems.map(
          (i) => `${i.categoryId}:${i.name.trim().toLowerCase()}`,
        ),
      );

      let sortOrder = existingCats.length;
      let createdCategories = 0;
      let createdItems = 0;

      for (const catInput of categories) {
        const cleanCat = catInput.name.trim();
        if (!cleanCat || !catInput.items?.length) continue;

        let cat = catByName.get(cleanCat.toLowerCase());
        if (!cat) {
          cat = await tx.menuCategory.create({
            data: {
              branchId,
              name: cleanCat,
              sortOrder: sortOrder++,
              isActive: true,
              showOnWebsite: true,
            },
          });
          catByName.set(cleanCat.toLowerCase(), cat);
          createdCategories++;
        }

        for (const item of catInput.items) {
          const cleanName = item.name.trim();
          if (!cleanName) continue;
          const key = `${cat.id}:${cleanName.toLowerCase()}`;
          if (itemKeys.has(key)) continue;

          const basePrice = Math.max(0, Number(item.price) || 0);
          const created = await tx.menuItem.create({
            data: {
              branchId,
              categoryId: cat.id,
              name: cleanName,
              description: item.description?.trim() || null,
              price: basePrice,
              isVeg: Boolean(item.isVeg),
              spiceLevel: item.spiceLevel === 'SPICY' ? 'HOT' : (item.spiceLevel ?? 'NONE'),
              isActive: true,
            },
          });

          if (item.variants && item.variants.length >= 2) {
            const group = await tx.modifierGroup.create({
              data: {
                branchId,
                name: 'Portion',
                minSelect: 1,
                maxSelect: 1,
                isRequired: true,
                modifiers: {
                  create: item.variants.map((v, idx) => ({
                    name: v.name,
                    priceAdjustment: Math.max(0, Number(v.price) - basePrice),
                    isDefault: idx === 0,
                  })),
                },
              },
            });
            await tx.menuItemModifierGroup.create({
              data: {
                menuItemId: created.id,
                modifierGroupId: group.id,
                sortOrder: 0,
              },
            });
          }

          itemKeys.add(key);
          createdItems++;
        }
      }

      return { createdCategories, createdItems };
    });
  }
}
