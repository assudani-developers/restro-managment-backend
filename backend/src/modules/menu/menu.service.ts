import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MenuCategoryDto,
  MenuItemDto,
  ModifierGroupDto,
} from '@restrocore/types';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Categories ---------------------------------------------------------

  listCategories(branchId: string) {
    return this.prisma.menuCategory.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  createCategory(branchId: string, dto: MenuCategoryDto) {
    return this.prisma.menuCategory.create({ data: { ...dto, branchId } });
  }

  async updateCategory(
    branchId: string,
    id: string,
    dto: Partial<MenuCategoryDto>,
  ) {
    await this.assertCategoryInBranch(branchId, id);
    return this.prisma.menuCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(branchId: string, id: string) {
    await this.assertCategoryInBranch(branchId, id);
    await this.prisma.menuCategory.delete({ where: { id } });
    return { ok: true };
  }

  private async assertCategoryInBranch(branchId: string, id: string) {
    const category = await this.prisma.menuCategory.findFirst({
      where: { id, branchId },
    });
    if (!category) throw new NotFoundException('Category not found');
  }

  // --- Kitchen stations -----------------------------------------------------

  listStations(branchId: string) {
    return this.prisma.kitchenStation.findMany({ where: { branchId } });
  }

  createStation(branchId: string, name: string, printerName?: string) {
    return this.prisma.kitchenStation.create({
      data: { branchId, name, printerName },
    });
  }

  // --- Menu items -----------------------------------------------------------

  listItems(branchId: string, categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: { branchId, ...(categoryId ? { categoryId } : {}) },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: true,
        station: true,
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: true } } },
        },
      },
    });
  }

  async getItem(branchId: string, id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, branchId },
      include: {
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createItem(branchId: string, dto: MenuItemDto) {
    const { modifierGroupIds, ...rest } = dto;
    await this.assertModifierGroupsInBranch(branchId, modifierGroupIds);
    return this.prisma.menuItem.create({
      data: {
        ...rest,
        branchId,
        modifierGroups: {
          create: modifierGroupIds.map((modifierGroupId, index) => ({
            modifierGroupId,
            sortOrder: index,
          })),
        },
      },
      include: { modifierGroups: { include: { modifierGroup: true } } },
    });
  }

  async updateItem(
    branchId: string,
    id: string,
    userId: string,
    dto: Partial<MenuItemDto>,
  ) {
    const existing = await this.getItem(branchId, id);
    const { modifierGroupIds, ...rest } = dto;
    if (modifierGroupIds) {
      await this.assertModifierGroupsInBranch(branchId, modifierGroupIds);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (modifierGroupIds) {
        await tx.menuItemModifierGroup.deleteMany({
          where: { menuItemId: id },
        });
        await tx.menuItemModifierGroup.createMany({
          data: modifierGroupIds.map((modifierGroupId, index) => ({
            menuItemId: id,
            modifierGroupId,
            sortOrder: index,
          })),
        });
      }
      return tx.menuItem.update({ where: { id }, data: rest });
    });

    // Price is the single most owner-relevant field here, so it's logged
    // explicitly (before → after) in addition to the raw change set —
    // everything else in `rest` (name, availability, dietary flags, ...)
    // still shows up via `changes`.
    await this.audit.record({
      userId,
      action: 'menu_item.updated',
      entity: 'MenuItem',
      entityId: id,
      metadata: {
        name: updated.name,
        priceBefore: Number(existing.price),
        priceAfter: Number(updated.price),
        changes: rest,
      },
    });

    return updated;
  }

  private async assertModifierGroupsInBranch(
    branchId: string,
    modifierGroupIds: string[],
  ) {
    if (modifierGroupIds.length === 0) return;
    const count = await this.prisma.modifierGroup.count({
      where: { id: { in: modifierGroupIds }, branchId },
    });
    if (count !== new Set(modifierGroupIds).size) {
      throw new BadRequestException(
        'One or more modifier groups are invalid for this branch',
      );
    }
  }

  async deleteItem(branchId: string, id: string) {
    await this.getItem(branchId, id);
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  // --- Modifier groups --------------------------------------------------------

  listModifierGroups(branchId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { branchId },
      include: { modifiers: true },
    });
  }

  createModifierGroup(branchId: string, dto: ModifierGroupDto) {
    const { modifiers, ...rest } = dto;
    return this.prisma.modifierGroup.create({
      data: { ...rest, branchId, modifiers: { create: modifiers } },
      include: { modifiers: true },
    });
  }

  async updateModifierGroup(
    branchId: string,
    id: string,
    dto: Partial<ModifierGroupDto>,
  ) {
    await this.assertModifierGroupInBranch(branchId, id);

    const { modifiers, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (modifiers) {
        await tx.modifier.deleteMany({ where: { groupId: id } });
        await tx.modifier.createMany({
          data: modifiers.map((m) => ({ ...m, groupId: id })),
        });
      }
      return tx.modifierGroup.update({
        where: { id },
        data: rest,
        include: { modifiers: true },
      });
    });
  }

  async deleteModifierGroup(branchId: string, id: string) {
    await this.assertModifierGroupInBranch(branchId, id);
    await this.prisma.modifierGroup.delete({ where: { id } });
    return { ok: true };
  }

  private async assertModifierGroupInBranch(branchId: string, id: string) {
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, branchId },
    });
    if (!group) throw new NotFoundException('Modifier group not found');
  }

  // --- Combo meals -----------------------------------------------------------

  async setComboComponents(
    branchId: string,
    comboItemId: string,
    components: { componentItemId: string; quantity: number }[],
  ) {
    await this.getItem(branchId, comboItemId);
    if (components.some((c) => c.componentItemId === comboItemId)) {
      throw new BadRequestException(
        'A combo cannot include itself as a component',
      );
    }
    const componentIds = components.map((c) => c.componentItemId);
    if (componentIds.length > 0) {
      const count = await this.prisma.menuItem.count({
        where: { id: { in: componentIds }, branchId },
      });
      if (count !== new Set(componentIds).size) {
        throw new BadRequestException(
          'One or more combo components are invalid for this branch',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.comboComponent.deleteMany({ where: { comboItemId } });
      if (components.length > 0) {
        await tx.comboComponent.createMany({
          data: components.map((c) => ({ comboItemId, ...c })),
        });
      }
      await tx.menuItem.update({
        where: { id: comboItemId },
        data: { isCombo: components.length > 0 },
      });
      return tx.comboComponent.findMany({
        where: { comboItemId },
        include: {
          componentItem: { select: { id: true, name: true, price: true } },
        },
      });
    });
  }

  async getComboComponents(branchId: string, comboItemId: string) {
    await this.getItem(branchId, comboItemId);
    return this.prisma.comboComponent.findMany({
      where: { comboItemId },
      include: {
        componentItem: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async bulkAdjustPrices(
    branchId: string,
    dto: {
      mode: 'PERCENT' | 'FLAT';
      amount: number;
      categoryId?: string;
      roundTo?: number;
    },
  ) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      throw new BadRequestException('Adjustment amount must be non-zero');
    }
    const items = await this.prisma.menuItem.findMany({
      where: {
        branchId,
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      },
      select: { id: true, price: true },
    });

    const roundTo = dto.roundTo && dto.roundTo > 0 ? dto.roundTo : 1;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const current = Number(item.price);
        let next =
          dto.mode === 'PERCENT'
            ? current * (1 + amount / 100)
            : current + amount;
        next = Math.max(0, Math.round(next / roundTo) * roundTo);
        if (next !== current) {
          await tx.menuItem.update({
            where: { id: item.id },
            data: { price: next },
          });
          updated++;
        }
      }
    });

    return { updated, total: items.length };
  }

  async getMenuHealth(branchId: string) {
    const [categories, items] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { branchId },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.menuItem.findMany({
        where: { branchId },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          imageUrl: true,
          isActive: true,
          isSoldOut: true,
        },
      }),
    ]);

    const totalItems = items.length;
    const missingPhoto = items.filter((i) => !i.imageUrl).length;
    const missingDescription = items.filter((i) => !i.description?.trim()).length;
    const zeroPrice = items.filter((i) => Number(i.price) <= 0).length;
    const soldOutCount = items.filter((i) => i.isSoldOut || !i.isActive).length;
    const emptyCategories = categories.filter((c) => c._count.items === 0).length;

    const score =
      totalItems === 0
        ? 0
        : Math.max(
            0,
            Math.round(
              100 -
                (missingPhoto / totalItems) * 30 -
                (missingDescription / totalItems) * 25 -
                (zeroPrice / totalItems) * 25 -
                (categories.length ? (emptyCategories / categories.length) * 20 : 0),
            ),
          );

    return {
      score,
      totalCategories: categories.length,
      totalItems,
      missingPhoto,
      missingDescription,
      zeroPrice,
      soldOutCount,
      emptyCategories,
    };
  }

  async getMenuDesign(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        name: true,
        tagline: true,
        logoUrl: true,
        coverImageUrl: true,
        brandColor: true,
        accentColor: true,
        menuDesign: true,
      },
    });
    const raw = (restaurant?.menuDesign as Record<string, unknown> | null) ?? {};
    return {
      themeId: (raw.themeId as string) || 'haveli',
      qrThemeId: (raw.qrThemeId as string) || 'classic',
      layout: (raw.layout as string) || undefined,
      header: (raw.header as string) || undefined,
      announcement: (raw.announcement as string) || '',
      showLogo: raw.showLogo !== false,
      showCover: raw.showCover !== false,
      showPrices: raw.showPrices !== false,
      instagramUrl: (raw.instagramUrl as string) || '',
      whatsappNumber: (raw.whatsappNumber as string) || '',
      googleMapsUrl: (raw.googleMapsUrl as string) || '',
      googleReviewUrl: (raw.googleReviewUrl as string) || '',
      restaurantName: restaurant?.name ?? '',
      tagline: restaurant?.tagline ?? '',
      logoUrl: restaurant?.logoUrl ?? '',
      coverImageUrl: restaurant?.coverImageUrl ?? '',
    };
  }

  async updateMenuDesign(restaurantId: string, dto: Record<string, unknown>) {
    const current = await this.getMenuDesign(restaurantId);
    const nextDesign = {
      themeId: typeof dto.themeId === 'string' ? dto.themeId : current.themeId,
      qrThemeId: typeof dto.qrThemeId === 'string' ? dto.qrThemeId : current.qrThemeId,
      layout: typeof dto.layout === 'string' ? dto.layout : current.layout,
      header: typeof dto.header === 'string' ? dto.header : current.header,
      announcement:
        typeof dto.announcement === 'string' ? dto.announcement : current.announcement,
      showLogo: typeof dto.showLogo === 'boolean' ? dto.showLogo : current.showLogo,
      showCover: typeof dto.showCover === 'boolean' ? dto.showCover : current.showCover,
      showPrices:
        typeof dto.showPrices === 'boolean' ? dto.showPrices : current.showPrices,
      instagramUrl:
        typeof dto.instagramUrl === 'string' ? dto.instagramUrl : current.instagramUrl,
      whatsappNumber:
        typeof dto.whatsappNumber === 'string'
          ? dto.whatsappNumber
          : current.whatsappNumber,
      googleMapsUrl:
        typeof dto.googleMapsUrl === 'string' ? dto.googleMapsUrl : current.googleMapsUrl,
      googleReviewUrl:
        typeof dto.googleReviewUrl === 'string'
          ? dto.googleReviewUrl
          : current.googleReviewUrl,
    };

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        menuDesign: nextDesign,
        ...(typeof dto.tagline === 'string' ? { tagline: dto.tagline } : {}),
      },
    });

    return { ...current, ...nextDesign };
  }
}
