import { Injectable, NotFoundException } from '@nestjs/common';
import type { CartItemDto } from '@restrocore/types';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PublicMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async resolveTable(qrToken: string) {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      include: { floor: { include: { branch: true } } },
    });
    if (!table) throw new NotFoundException('This QR code is not recognized');
    return table;
  }

  async getMenuByQrToken(qrToken: string) {
    const table = await this.resolveTable(qrToken);
    const branch = table.floor.branch;
    const categories = await this.menuCategoriesForBranch(branch.id);
    return {
      branchName: branch.name,
      tableName: table.name ?? `Table ${table.number}`,
      categories,
    };
  }

  /** Public digital menu for a whole branch, used for universal table QR and direct delivery ordering. */
  async getBranchMenu(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        restaurant: true,
        floors: {
          include: {
            tables: {
              where: { status: { not: 'OUT_OF_SERVICE' } },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const categories = await this.menuCategoriesForBranch(branchId);
    const tables = branch.floors.flatMap((f) =>
      f.tables.map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name ?? `Table ${t.number}`,
        status: t.status,
      })),
    );

    return {
      branchId: branch.id,
      branchName: branch.name,
      restaurantName: branch.restaurant.name,
      logoUrl: branch.restaurant.logoUrl,
      currency: branch.restaurant.currency,
      tables,
      categories,
    };
  }

  async createBranchOrder(
    branchId: string,
    dto: {
      orderType: 'DINE_IN' | 'DELIVERY';
      tableId?: string;
      guestName?: string;
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      pincode?: string;
      items: CartItemDto[];
    },
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const staff = await this.prisma.userBranch.findFirst({
      where: { branchId },
      orderBy: { userId: 'asc' },
    });
    const createdById = staff?.userId;
    if (!createdById) {
      throw new NotFoundException('This branch has no staff to receive the order');
    }

    const normalizedItems = dto.items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      modifierIds: i.modifierIds ?? [],
    }));

    if (dto.orderType === 'DINE_IN') {
      let tableId = dto.tableId;
      if (!tableId) {
        const firstTable = await this.prisma.table.findFirst({
          where: { floor: { branchId } },
        });
        tableId = firstTable?.id;
      }

      return this.ordersService.createOrder(
        branchId,
        createdById,
        {
          type: 'QR_ORDER',
          tableId,
          guestName: dto.guestName ?? 'Guest (QR)',
          items: normalizedItems,
        },
        { channel: 'ONLINE', requireAcceptance: false },
      );
    } else {
      const notes = [
        dto.deliveryAddress ? `Address: ${dto.deliveryAddress}` : null,
        dto.pincode ? `Pincode: ${dto.pincode}` : null,
        dto.customerPhone ? `Phone: ${dto.customerPhone}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      return this.ordersService.createOrder(
        branchId,
        createdById,
        {
          type: 'DELIVERY',
          guestName: dto.customerName ?? 'Delivery Guest',
          notes: notes || undefined,
          items: normalizedItems,
        },
        { channel: 'ONLINE', requireAcceptance: false },
      );
    }
  }

  /** Customer-visible menu tree, shared by the table-QR page and the kiosk. */
  menuCategoriesForBranch(branchId: string) {
    return this.prisma.menuCategory.findMany({
      where: { branchId, isActive: true, showOnWebsite: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            price: true,
            taxRatePercent: true,
            isVeg: true,
            isVegan: true,
            spiceLevel: true,
            allergens: true,
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              select: {
                modifierGroup: {
                  select: {
                    id: true,
                    name: true,
                    minSelect: true,
                    maxSelect: true,
                    isRequired: true,
                    modifiers: {
                      orderBy: { sortOrder: 'asc' },
                      select: {
                        id: true,
                        name: true,
                        priceAdjustment: true,
                        isDefault: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createOrder(qrToken: string, items: CartItemDto[], guestName: string) {
    const table = await this.resolveTable(qrToken);
    const branchId = table.floor.branchId;

    // A guest who already ordered once this visit and scans again to add
    // more (e.g. drinks now, food later) should land on the same tab, not
    // open a second order for the table — mirrors how staff add a round
    // from the POS for an occupied table.
    const openOrder = await this.prisma.order.findFirst({
      where: { branchId, tableId: table.id, status: 'OPEN' },
    });
    if (openOrder) {
      return this.ordersService.addItems(branchId, openOrder.id, items, {
        enforceModifierLimits: true,
        websiteOnly: true,
      });
    }

    // A guest scanning a QR code has no staff account, but Order.createdById
    // is a required FK — attribute the order to whoever is on the floor for
    // this table (assigned waiter), falling back to any staff member linked
    // to the branch (every branch has at least its owner) so this never
    // fails for lack of a "system user" that doesn't otherwise exist.
    const createdById =
      table.assignedWaiterId ??
      (
        await this.prisma.userBranch.findFirst({
          where: { branchId },
          orderBy: { userId: 'asc' },
        })
      )?.userId;
    if (!createdById) {
      throw new NotFoundException(
        'This branch has no staff to receive the order',
      );
    }

    return this.ordersService.createOrder(
      branchId,
      createdById,
      {
        type: 'QR_ORDER',
        tableId: table.id,
        guestName,
        items,
      },
      { channel: 'ONLINE' },
    );
  }

  /** Live status of the table's current tab, for the guest's QR page. */
  async getStatus(qrToken: string) {
    const table = await this.resolveTable(qrToken);
    const order = await this.prisma.order.findFirst({
      where: { tableId: table.id, status: { in: ['OPEN', 'BILLED'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        orderNumber: true,
        status: true,
        acceptance: true,
        totalAmount: true,
        items: {
          select: {
            id: true,
            nameSnapshot: true,
            quantity: true,
            status: true,
          },
        },
      },
    });
    const requests = await this.prisma.tableRequest.findMany({
      where: { tableId: table.id, resolvedAt: null },
      select: { type: true },
    });
    return { order, openRequests: requests.map((r) => r.type) };
  }

  /** "Call waiter" / "Bring the bill". One open request per type per table. */
  async createRequest(qrToken: string, type: 'WAITER' | 'BILL') {
    const table = await this.resolveTable(qrToken);
    const branchId = table.floor.branchId;
    const existing = await this.prisma.tableRequest.findFirst({
      where: { tableId: table.id, type, resolvedAt: null },
    });
    if (existing) return { ok: true, alreadyRequested: true };

    const request = await this.prisma.tableRequest.create({
      data: { branchId, tableId: table.id, type },
    });
    this.realtime.emitToBranch(branchId, 'table.request', { id: request.id });
    const tableName = table.name ?? `Table ${table.number}`;
    try {
      await this.notifications.notifyByPermission(branchId, 'tables.manage', {
        type: type === 'BILL' ? 'table.bill' : 'table.waiter',
        title:
          type === 'BILL'
            ? `${tableName} wants the bill`
            : `${tableName} needs a waiter`,
        body: 'Requested from the table QR code',
        entity: 'Table',
        entityId: table.id,
      });
    } catch {
      // Best-effort: the request row and live event already exist.
    }
    return { ok: true, alreadyRequested: false };
  }
}
