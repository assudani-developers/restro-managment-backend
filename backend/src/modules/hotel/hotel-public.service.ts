import { timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PublicMenuService } from '../public/public-menu.service';
import { HotelNotifyService } from './hotel-notify.service';
import { HotelService, folioTotals } from './hotel.service';
import type { publicRoomOrderSchema } from './hotel.schemas';

const pinEq = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Hotel branding block every guest-facing screen renders with. */
function brandOf(r: { name: string; tagline: string | null; logoUrl: string | null; coverImageUrl: string | null; brandColor: string | null; accentColor: string | null; currency: string }) {
  return {
    hotelName: r.name,
    tagline: r.tagline,
    logoUrl: r.logoUrl,
    coverImageUrl: r.coverImageUrl,
    brandColor: r.brandColor ?? '#7A2E1F',
    accentColor: r.accentColor ?? '#C9973F',
    currency: r.currency,
  };
}

@Injectable()
export class HotelPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly publicMenu: PublicMenuService,
    private readonly hotel: HotelService,
    private readonly notify: HotelNotifyService,
    private readonly staffNotifications: NotificationsService,
  ) {}

  private async resolveRoom(qrToken: string) {
    const room = await this.prisma.room.findUnique({
      where: { qrToken },
      include: { branch: { include: { restaurant: true } }, category: { select: { name: true } } },
    });
    if (!room || !room.isActive) throw new NotFoundException('This room QR code is not recognised');
    return room;
  }

  private activeStay(roomId: string) {
    return this.prisma.booking.findFirst({ where: { roomId, status: 'CHECKED_IN' } });
  }

  /** Menu for the room: either the restaurant menu as-is, or the separate room-service menu. */
  private async roomMenu(branchId: string, mode: string) {
    const categories = await this.publicMenu.menuCategoriesForBranch(branchId);
    const extra = await this.prisma.menuItem.findMany({
      where: { branchId, isActive: true },
      select: { id: true, roomServiceEnabled: true, roomServicePrice: true, isSoldOut: true, prepTimeMinutes: true },
    });
    const meta = new Map(extra.map((e) => [e.id, e]));
    return categories
      .map((c) => ({
        ...c,
        items: c.items
          .filter((i) => mode !== 'SEPARATE' || meta.get(i.id)?.roomServiceEnabled)
          .map((i) => {
            const m = meta.get(i.id);
            const price = mode === 'SEPARATE' && m?.roomServicePrice != null ? m.roomServicePrice : i.price;
            return { ...i, price, isSoldOut: m?.isSoldOut ?? false, prepTimeMinutes: m?.prepTimeMinutes ?? null };
          }),
      }))
      .filter((c) => c.items.length > 0);
  }

  /**
   * A 4-digit PIN has only 10,000 values, so the per-IP throttle alone can't
   * stop a patient guesser. Count failures on the stay itself: 5 wrong tries
   * lock charge-to-room for 15 minutes and alert reception.
   */
  private async checkPin(stay: { id: string; stayPin: string; pinFailures: number; pinLockedUntil: Date | null }, pin: string | undefined, branchId: string, roomNumber: string) {
    if (stay.pinLockedUntil && stay.pinLockedUntil > new Date()) {
      const mins = Math.ceil((stay.pinLockedUntil.getTime() - Date.now()) / 60_000);
      throw new BadRequestException(`Too many wrong PINs. Charge to room is locked for ${mins} more minute(s). Choose pay on delivery or call reception.`);
    }
    if (pin && pinEq(pin, stay.stayPin)) {
      if (stay.pinFailures) await this.prisma.booking.update({ where: { id: stay.id }, data: { pinFailures: 0, pinLockedUntil: null } });
      return;
    }
    const failures = stay.pinFailures + 1;
    const locked = failures >= 5;
    await this.prisma.booking.update({
      where: { id: stay.id },
      data: locked ? { pinFailures: 0, pinLockedUntil: new Date(Date.now() + 15 * 60_000) } : { pinFailures: failures },
    });
    if (locked) {
      try {
        await this.staffNotifications.notifyByPermission(branchId, 'hotel.frontdesk', {
          type: 'room.pin_locked',
          title: `Room ${roomNumber}: room PIN locked`,
          body: '5 wrong PIN attempts on charge-to-room. Locked for 15 minutes.',
          entity: 'Room',
        });
      } catch {
        // best effort
      }
      throw new BadRequestException('Too many wrong PINs. Charge to room is locked for 15 minutes. Choose pay on delivery or call reception.');
    }
    throw new BadRequestException(`Room PIN is incorrect (${5 - failures} ${5 - failures === 1 ? 'try' : 'tries'} left). It is in your check-in message, or ask reception.`);
  }

  async getRoom(qrToken: string) {
    const room = await this.resolveRoom(qrToken);
    const b = room.branch;
    const stay = await this.activeStay(room.id);
    return {
      brand: brandOf(b.restaurant),
      branchId: b.id,
      room: { number: room.number, category: room.category.name },
      menuMode: b.roomMenuMode,
      serviceCharge: Number(b.roomServiceCharge),
      facilities: {
        wifiName: stay ? b.wifiName : null,
        wifiPassword: stay ? b.wifiPassword : null,
        checkOutTime: b.checkOutTime,
        phone: b.phone,
        address: b.address,
      },
      // First name only — the QR is physically in the room, but anyone who
      // photographed it must not learn who is staying there.
      stay: stay ? { guestFirstName: stay.guestName.split(' ')[0], checkOut: stay.checkOut.toISOString().slice(0, 10), canChargeToRoom: true } : null,
      categories: await this.roomMenu(b.id, b.roomMenuMode),
    };
  }

  async createRoomOrder(qrToken: string, dto: z.infer<typeof publicRoomOrderSchema>) {
    const room = await this.resolveRoom(qrToken);
    const branchId = room.branchId;
    const stay = await this.activeStay(room.id);
    if (dto.chargeToRoom) {
      if (!stay) throw new BadRequestException('No guest is checked in to this room. Please choose pay on delivery.');
      await this.checkPin(stay, dto.stayPin, room.branchId, room.number);
    }

    const soldOut = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map((i) => i.menuItemId) }, branchId, OR: [{ isSoldOut: true }, ...(room.branch.roomMenuMode === 'SEPARATE' ? [{ roomServiceEnabled: false }] : [])] },
      select: { name: true },
    });
    if (soldOut.length) throw new BadRequestException(`${soldOut.map((s) => s.name).join(', ')} is not available right now`);

    let priceOverrides: Map<string, number> | undefined;
    if (room.branch.roomMenuMode === 'SEPARATE') {
      const items = await this.prisma.menuItem.findMany({
        where: { id: { in: dto.items.map((i) => i.menuItemId) }, branchId, roomServicePrice: { not: null } },
        select: { id: true, roomServicePrice: true },
      });
      priceOverrides = new Map(items.map((i) => [i.id, Number(i.roomServicePrice)]));
    }

    const createdById = (await this.prisma.userBranch.findFirst({ where: { branchId }, orderBy: { userId: 'asc' } }))?.userId;
    if (!createdById) throw new NotFoundException('This hotel has no staff to receive the order');

    const order = await this.orders.createOrder(
      branchId,
      createdById,
      {
        type: 'ROOM_SERVICE',
        guestName: dto.guestName?.trim() || (stay ? stay.guestName : `Room ${room.number}`),
        notes: [`Room ${room.number}`, dto.notes].filter(Boolean).join(' · '),
        items: dto.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, modifierIds: i.modifierIds, kitchenNote: i.notes })),
      },
      { channel: 'ONLINE', roomId: room.id, bookingId: stay?.id, priceOverrides },
    );

    const orderId = (order as { id: string }).id;
    const created = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, orderNumber: true, totalAmount: true } });
    if (dto.chargeToRoom && stay) await this.hotel.postOrderToFolio(branchId, orderId, createdById, stay.id);
    if (stay)
      await this.hotel.notifyBooking(branchId, stay.id, 'FOOD_ORDERED', { orderNumber: created.orderNumber, amount: `₹${Number(created.totalAmount)}` });
    try {
      await this.staffNotifications.notifyByPermission(branchId, 'orders.create', {
        type: 'room.order',
        title: `Room ${room.number} ordered food`,
        body: `${created.orderNumber} · ₹${Number(created.totalAmount)}${dto.chargeToRoom ? ' · charged to room' : ''}`,
        entity: 'Order',
        entityId: orderId,
      });
    } catch {
      // best effort
    }
    return { id: created.id, orderNumber: created.orderNumber, totalAmount: Number(created.totalAmount), chargedToRoom: Boolean(dto.chargeToRoom && stay) };
  }

  async roomOrders(qrToken: string) {
    const room = await this.resolveRoom(qrToken);
    const stay = await this.activeStay(room.id);
    // Never show a previous guest's orders: start at this stay's check-in, or
    // (no one in house) at the later of 3h ago and the room's last checkout.
    let since = stay?.checkedInAt ?? new Date(Date.now() - 3 * 3600_000);
    if (!stay) {
      const last = await this.prisma.booking.findFirst({
        where: { roomId: room.id, checkedOutAt: { not: null } },
        orderBy: { checkedOutAt: 'desc' },
        select: { checkedOutAt: true },
      });
      if (last?.checkedOutAt && last.checkedOutAt > since) since = last.checkedOutAt;
    }
    const orders = await this.prisma.order.findMany({
      where: { roomId: room.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, orderNumber: true, status: true, totalAmount: true, folioPostedAt: true, createdAt: true,
        items: { select: { id: true, nameSnapshot: true, quantity: true, status: true } },
        kots: { select: { status: true } },
      },
    });
    return orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      stage:
        o.status === 'CANCELLED' ? 'CANCELLED'
          : o.kots.length && o.kots.every((k) => k.status === 'SERVED') ? 'DELIVERED'
            : o.kots.some((k) => k.status === 'READY') ? 'ON_THE_WAY'
              : o.kots.some((k) => k.status === 'PREPARING' || k.status === 'ACCEPTED') ? 'PREPARING'
                : 'RECEIVED',
    }));
  }

  async requestService(qrToken: string, kind: string) {
    const room = await this.resolveRoom(qrToken);
    const labels: Record<string, string> = {
      HOUSEKEEPING: 'needs housekeeping',
      TOWELS: 'needs fresh towels',
      WATER: 'needs drinking water',
      RECEPTION: 'asked reception to call',
      LATE_CHECKOUT: 'requests late checkout',
    };
    const label = labels[kind];
    if (!label) throw new BadRequestException('Unknown request');
    await this.staffNotifications.notifyByPermission(room.branchId, 'hotel.housekeeping', {
      type: 'room.request',
      title: `Room ${room.number} ${label}`,
      body: 'Requested from the in-room QR',
      entity: 'Room',
      entityId: room.id,
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------- guest portal (secure link)

  async stay(guestToken: string) {
    const b = await this.prisma.booking.findUnique({
      where: { guestToken },
      include: {
        branch: { include: { restaurant: true } },
        category: true,
        mealPlan: true,
        room: { select: { number: true, qrToken: true } },
        folio: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!b) throw new NotFoundException('This link is not valid');
    const r = b.branch.restaurant;
    const totals = folioTotals(b.folio);
    return {
      brand: brandOf(r),
      upi: r.upiVpa ? { vpa: r.upiVpa, payee: r.upiPayeeName ?? r.name } : null,
      hotel: {
        address: b.branch.address,
        phone: b.branch.phone,
        gstNumber: b.branch.gstNumber,
        checkInTime: b.branch.checkInTime,
        checkOutTime: b.branch.checkOutTime,
        latitude: b.branch.latitude,
        longitude: b.branch.longitude,
        wifiName: b.status === 'CHECKED_IN' ? b.branch.wifiName : null,
        wifiPassword: b.status === 'CHECKED_IN' ? b.branch.wifiPassword : null,
      },
      booking: {
        code: b.code,
        status: b.status,
        guestName: b.guestName,
        checkIn: b.checkIn.toISOString().slice(0, 10),
        checkOut: b.checkOut.toISOString().slice(0, 10),
        nights: b.nights,
        adults: b.adults,
        children: b.children,
        roomType: b.category.name,
        amenities: b.category.amenities,
        room: b.room?.number ?? null,
        roomQrToken: b.status === 'CHECKED_IN' ? b.room?.qrToken ?? null : null,
        mealPlan: b.mealPlan ? { code: b.mealPlan.code, name: b.mealPlan.name, breakfast: b.mealPlan.includesBreakfast, lunch: b.mealPlan.includesLunch, dinner: b.mealPlan.includesDinner } : null,
      },
      folio: b.folio.map((f) => ({ id: f.id, type: f.type, description: f.description, amount: Number(f.amount), method: f.method, createdAt: f.createdAt })),
      totals,
    };
  }
}
