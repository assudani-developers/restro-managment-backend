"use client";

import { BedDouble, Check, LayoutGrid, Printer, QrCode, RefreshCw, Store, Wifi } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Btn, Field, Input, PageHeader, Panel, Segmented, Toggle } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useBoard, useHotelSettings, useUpdateHotelSettings } from "@/hooks/use-hotel";
import { useFloors, useRotateQrToken } from "@/hooks/use-tables";
import { cn } from "@/lib/utils";

type Source = "rooms" | "tables" | "general";
type Layout = "tent" | "sticker" | "poster";
type ThemeKey =
  | "heritage"
  | "sandstone"
  | "royal"
  | "minimal"
  | "midnight"
  | "garden"
  | "saffron"
  | "sunset"
  | "ocean"
  | "noirGold"
  | "goldFoil"
  | "royalPlum";

interface Target {
  id: string;
  title: string;
  kicker: string;
  url: string | null;
  tableId?: string;
}

const THEMES: Record<ThemeKey, { name: string; bg: string; fg: string; sub: string; frame: string; qrFg: string; qrBg: string; pattern?: boolean }> = {
  heritage: { name: "Heritage", bg: "#17110D", fg: "#FBE9C9", sub: "#D9C3A0", frame: "var(--brand-accent)", qrFg: "#17110D", qrBg: "#FFF8EC", pattern: true },
  sandstone: { name: "Sandstone", bg: "#F4E9D8", fg: "#3A2A1E", sub: "#7C6550", frame: "var(--primary)", qrFg: "#2A1D14", qrBg: "#FFFDF8" },
  royal: { name: "Royal", bg: "var(--gradient-primary)", fg: "#FFF8F0", sub: "#FBE9C9", frame: "var(--brand-accent)", qrFg: "#1E1712", qrBg: "#FFFFFF", pattern: true },
  minimal: { name: "Minimal", bg: "#FFFFFF", fg: "#111111", sub: "#666666", frame: "#111111", qrFg: "#111111", qrBg: "#FFFFFF" },
  midnight: { name: "Midnight", bg: "linear-gradient(160deg,#0E1A2B,#1D2F4A)", fg: "#EAF1FF", sub: "#9DB4D9", frame: "#7FA7E8", qrFg: "#0E1A2B", qrBg: "#FFFFFF" },
  garden: { name: "Garden", bg: "linear-gradient(160deg,#10372A,#1F5A44)", fg: "#ECF8EF", sub: "#A9D7B9", frame: "#E8C36A", qrFg: "#10372A", qrBg: "#FFFFFF", pattern: true },
  saffron: { name: "Saffron", bg: "linear-gradient(150deg,#F59E0B,#C2410C)", fg: "#FFFFFF", sub: "#FEF3C7", frame: "#FFFFFF", qrFg: "#2B160A", qrBg: "#FFFFFF", pattern: true },
  sunset: { name: "Sunset", bg: "linear-gradient(150deg,#FB923C,#DB2777)", fg: "#FFFFFF", sub: "#FCE7F3", frame: "#FFFFFF", qrFg: "#3B0A1E", qrBg: "#FFFFFF" },
  ocean: { name: "Ocean", bg: "linear-gradient(150deg,#0EA5E9,#1E3A8A)", fg: "#FFFFFF", sub: "#E0F2FE", frame: "#FFFFFF", qrFg: "#0C2A44", qrBg: "#FFFFFF" },
  noirGold: { name: "Noir Gold", bg: "linear-gradient(150deg,#1A1712,#050505)", fg: "#E8C872", sub: "#C9A23A", frame: "#D4AF37", qrFg: "#111111", qrBg: "#FFFFFF", pattern: true },
  goldFoil: { name: "Gold Foil", bg: "linear-gradient(150deg,#FFF8E6,#F3E3B5)", fg: "#6B4E0E", sub: "#8A6616", frame: "#C9A23A", qrFg: "#3A2A08", qrBg: "#FFFFFF" },
  royalPlum: { name: "Royal Plum", bg: "linear-gradient(150deg,#5B2179,#260A33)", fg: "#F7D98B", sub: "#E9D5FF", frame: "#F7D98B", qrFg: "#2A0F33", qrBg: "#FFFFFF", pattern: true },
};

const LAYOUT: Record<Layout, { label: string; cols: string; w: string; h: string; qr: number; title: string }> = {
  tent: { label: "Tent card · 4/page", cols: "grid-cols-2", w: "w-full", h: "h-[128mm]", qr: 150, title: "text-[26px]" },
  sticker: { label: "Sticker · 6/page", cols: "grid-cols-2", w: "w-full", h: "h-[84mm]", qr: 104, title: "text-[18px]" },
  poster: { label: "Poster · 1/page", cols: "grid-cols-1", w: "w-full", h: "h-[260mm]", qr: 340, title: "text-[44px]" },
};

export default function QrStudioPage() {
  const { branchId } = useBranch();
  const { data: hotel } = useHotelSettings(branchId);
  const saveSettings = useUpdateHotelSettings(branchId);
  const { data: board } = useBoard(branchId);
  const { data: floors } = useFloors(branchId);
  const rotate = useRotateQrToken(branchId);
  const [origin, setOrigin] = useState("");
  const [source, setSource] = useState<Source>("rooms");
  const [theme, setTheme] = useState<ThemeKey>("heritage");
  const [layout, setLayout] = useState<Layout>("tent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [showWifi, setShowWifi] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const targets: Target[] = useMemo(() => {
    if (source === "rooms")
      return (board?.rooms ?? []).map((r) => ({ id: r.id, title: `Room ${r.number}`, kicker: r.category.name, url: origin ? `${origin}/room/${r.qrToken}` : null }));
    if (source === "tables")
      return (floors ?? []).flatMap((f) =>
        f.tables.map((t) => ({ id: t.id, tableId: t.id, title: t.name ?? `Table ${t.number}`, kicker: f.name, url: t.qrToken && origin ? `${origin}/order/${t.qrToken}` : null })),
      );
    return [{ id: "general", title: hotel?.hotelName ?? "Our menu", kicker: "Restaurant & delivery", url: origin && branchId ? `${origin}/menu-order/${branchId}` : null }];
  }, [source, board, floors, origin, hotel, branchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(targets.filter((t) => t.url).map((t) => t.id)));
  }, [source, targets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const printable = targets.filter((t) => selected.has(t.id) && t.url);
  const defaultHead = source === "rooms" ? "In-Room Dining" : source === "tables" ? "Scan · Order · Pay" : "Our Menu";
  const defaultSub = source === "rooms" ? "Order food, request services & view your bill" : source === "tables" ? "Browse the menu and order from your table" : "Order online for dine-in or delivery";
  const th = THEMES[theme];
  const L = LAYOUT[layout];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="print-hidden">
        <PageHeader
          title="QR codes"
          actions={
            <Btn onClick={() => window.print()} disabled={!printable.length}>
              <Printer /> Print {printable.length} card{printable.length === 1 ? "" : "s"}
            </Btn>
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5 print-hidden">
          <Panel title="1 · What to print">
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                { value: "rooms", label: <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> Rooms</span> },
                { value: "tables", label: <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Tables</span> },
                { value: "general", label: <span className="flex items-center gap-1"><Store className="h-3.5 w-3.5" /> General</span> },
              ]}
            />
            {source === "rooms" && hotel && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3">
                <p className="text-[13px] font-medium text-muted-foreground">Room menu</p>
                <Segmented
                  className="mt-2"
                  value={hotel.roomMenuMode}
                  onChange={(v) => saveSettings.mutate({ roomMenuMode: v })}
                  options={[{ value: "SYNCED", label: "Synced with restaurant" }, { value: "SEPARATE", label: "Separate menu" }]}
                />
                <p className="mt-2 text-[11px] text-muted-foreground">Set separate room prices & dishes under Room Service → Room menu.</p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {selected.size}/{targets.length} selected
              </span>
              <div className="flex gap-2">
                <button type="button" className="font-semibold text-brand" onClick={() => setSelected(new Set(targets.filter((t) => t.url).map((t) => t.id)))}>
                  All
                </button>
                <button type="button" className="font-semibold text-muted-foreground" onClick={() => setSelected(new Set())}>
                  None
                </button>
              </div>
            </div>
            <div className="no-scrollbar mt-2 max-h-72 space-y-1 overflow-y-auto">
              {targets.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                  <button
                    type="button"
                    disabled={!t.url}
                    onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}
                    className={cn("flex h-5 w-5 items-center justify-center rounded-md border", selected.has(t.id) ? "border-brand bg-brand text-primary-foreground" : "border-stone-300")}
                    aria-label={`Select ${t.title}`}
                  >
                    {selected.has(t.id) && <Check className="h-3 w-3" />}
                  </button>
                  <span className="flex-1 truncate text-sm">{t.title}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{t.kicker}</span>
                  {!t.url && t.tableId && (
                    <Btn size="sm" variant="soft" loading={rotate.isPending} onClick={() => rotate.mutate(t.tableId!)}>
                      <RefreshCw /> Issue QR
                    </Btn>
                  )}
                </div>
              ))}
              {targets.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
            </div>
          </Panel>

          <Panel title="2 · Theme & layout">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setTheme(k)} className={cn("overflow-hidden rounded-xl border text-left transition", theme === k ? "border-brand ring-2 ring-brand/30" : "border-border")}>
                  <span className="block h-12" style={{ background: THEMES[k].bg }} />
                  <span className="block px-2 py-1.5 text-[11px] font-semibold">{THEMES[k].name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(Object.keys(LAYOUT) as Layout[]).map((k) => (
                <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm", layout === k ? "border-brand bg-brand/5" : "border-border")}>
                  <input type="radio" name="layout" checked={layout === k} onChange={() => setLayout(k)} className="accent-[var(--primary)]" />
                  {LAYOUT[k].label}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="3 · Words">
            <div className="space-y-3">
              <Field label="Headline">
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={defaultHead} />
              </Field>
              <Field label="Sub-line">
                <Input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder={defaultSub} />
              </Field>
              {source === "rooms" && (
                <label className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-brand" /> Print Wi-Fi on room cards
                  </span>
                  <Toggle checked={showWifi} onChange={setShowWifi} />
                </label>
              )}
            </div>
          </Panel>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between print-hidden">
            <p className="text-sm font-semibold text-muted-foreground">Print preview · A4</p>
            <p className="text-xs text-muted-foreground">Tip: enable “Background graphics” in the print dialog.</p>
          </div>
          <div className="rounded-3xl border border-border bg-[#E9E2D7] p-4 sm:p-6 print:border-0 print:bg-white print:p-0">
            <div className={cn("mx-auto grid max-w-[210mm] gap-4 [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:gap-[6mm]", L.cols)}>
              {printable.map((t, i) => (
                <motion.article
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className={cn("relative flex break-inside-avoid flex-col items-center justify-between overflow-hidden rounded-[18px] p-[7%] text-center shadow-lg print:shadow-none", L.w, L.h)}
                  style={{ background: th.bg, color: th.fg }}
                >
                  {th.pattern && <span className="jaali pointer-events-none absolute inset-0 opacity-25" />}
                  <span className="pointer-events-none absolute inset-[8px] rounded-[12px] border" style={{ borderColor: th.frame, opacity: 0.55 }} />
                  <div className="relative">
                    {hotel?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hotel.logoUrl} alt="" className="mx-auto mb-1 h-8 w-auto object-contain" />
                    ) : null}
                    <p className="text-[13px] font-medium" style={{ color: th.sub }}>
                      {hotel?.hotelName}
                    </p>
                    <h3 className={cn("mt-1 font-display leading-none font-semibold", L.title)}>{headline || defaultHead}</h3>
                  </div>
                  <div className="relative rounded-2xl p-3" style={{ background: th.qrBg, boxShadow: `0 0 0 3px ${th.frame}` }}>
                    {t.url && <QRCodeSVG value={t.url} size={L.qr} level="M" fgColor={th.qrFg} bgColor={th.qrBg} />}
                  </div>
                  <div className="relative">
                    <p className="font-display text-xl font-semibold">{t.title}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: th.sub }}>
                      {subline || defaultSub}
                    </p>
                    {source === "rooms" && showWifi && hotel?.wifiName && layout !== "sticker" && (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgb(255 255 255 / 0.12)", color: th.sub }}>
                        <Wifi className="h-3 w-3" /> {hotel.wifiName}
                        {hotel.wifiPassword ? ` · ${hotel.wifiPassword}` : ""}
                      </p>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
            {printable.length === 0 && (
              <div className="flex h-80 flex-col items-center justify-center text-center text-muted-foreground">
                <QrCode className="mb-2 h-10 w-10" />
                Select rooms or tables to preview their cards.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
