import { randomBytes, randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type FolioEntryType, type RoomStatus } from '@prisma/client';
import type { z } from 'zod';
import { distanceMetres } from '../../common/geofence-pass';
import { round2 } from '../../common/money';
import { addDaysToDate, localDate, localMinuteAndDay, zonedRange } from '../../common/time';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { HotelNotifyService, type NotificationTrigger } from './hotel-notify.service';
import type {
  bookingSchema,
  checkInSchema,
  folioChargeSchema,
  folioPaymentSchema,
  hotelSettingsSchema,
  mealPlanSchema,
  quoteSchema,
  roomBulkSchema,
  roomCategorySchema,
  roomSchema,
  roomUpdateSchema,
} from './hotel.schemas';

type BookingDto = z.infer<typeof bookingSchema>;
type QuoteDto = z.infer<typeof quoteSchema>;

const ACTIVE_BOOKING = ['CONFIRMED', 'CHECKED_IN'] as const;
const CHARGE_TYPES: FolioEntryType[] = [
  'ROOM', 'MEAL_PLAN', 'RESTAURANT', 'ROOM_SERVICE', 'POOL', 'EVENT', 'EXTRA', 'TAX',
];

/** Board colour status — derived, never stored, so it can't drift. */
export type BoardStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'DIRTY'
  | 'INSPECTION'
  | 'BOOKED'
  | 'CHECKOUT_SOON'
  | 'MAINTENANCE';

const dateOnly = (d: string) => new Date(`${d}T00:00:00Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const nightsBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const n = (v: Prisma.Decimal | number | null | undefined) => Number(v ?? 0);

export function folioTotals(entries: { type: FolioEntryType; amount: Prisma.Decimal | number }[]) {
  let charges = 0;
  let discounts = 0;
  let payments = 0;
  let refunds = 0;
  for (const e of entries) {
    const a = n(e.amount);
    if (e.type === 'PAYMENT') payments += a;
    else if (e.type === 'REFUND') refunds += a;
    else if (e.type === 'DISCOUNT') discounts += a;
    else charges += a;
  }
  const total = round2(charges - discounts);
  const paid = round2(payments - refunds);
  return {
    charges: round2(charges),
    discounts: round2(discounts),
    total,
    paid,
    refunds: round2(refunds),
    balance: round2(total - paid),
  };
}

@Injectable()
export class HotelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notify: HotelNotifyService,
  ) {}

  // ------------------------------------------------------------------ helpers

  async branchContext(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { restaurant: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  guestLink(token: string) {
    const origin = (process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    return `${origin}/stay/${token}`;
  }

  private emit(branchId: string, what: string, payload: unknown = {}) {
    this.realtime.emitToBranch(branchId, `hotel.${what}`, payload);
  }

  private async setRoomStatus(
    tx: Prisma.TransactionClient,
    roomId: string,
    from: RoomStatus | null,
    to: RoomStatus,
    note?: string,
    byUserId?: string,
  ) {
    await tx.room.update({ where: { id: roomId }, data: { status: to, statusSince: new Date() } });
    await tx.roomStatusLog.create({
      data: { roomId, fromStatus: from, toStatus: to, note, byUserId },
    });
  }

  private async bookingVars(bookingId: string, extra: Record<string, string | number> = {}) {
    const b = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { category: true, mealPlan: true, room: true, folio: true, branch: { include: { restaurant: true } } },
    });
    const t = folioTotals(b.folio);
    const cur = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    return {
      booking: b,
      vars: {
        guestName: b.guestName,
        hotelName: b.branch.restaurant.name,
        bookingCode: b.code,
        roomType: b.category.name,
        room: b.room?.number ?? 'to be assigned',
        checkIn: isoDay(b.checkIn),
        checkOut: isoDay(b.checkOut),
        checkInTime: b.branch.checkInTime,
        checkOutTime: b.branch.checkOutTime,
        mealPlan: b.mealPlan ? `${b.mealPlan.code} – ${b.mealPlan.name}` : 'Room only',
        total: cur(t.total),
        paid: cur(t.paid),
        balance: cur(Math.max(0, t.balance)),
        link: this.guestLink(b.guestToken),
        pin: b.stayPin,
        wifiName: b.branch.wifiName ?? '-',
        wifiPassword: b.branch.wifiPassword ?? '-',
        ...extra,
      } as Record<string, string | number>,
    };
  }

  async notifyBooking(branchId: string, bookingId: string, trigger: NotificationTrigger, extra: Record<string, string | number> = {}) {
    const { booking, vars } = await this.bookingVars(bookingId, extra);
    await this.notify.dispatch(branchId, trigger, booking, vars);
  }

  // ------------------------------------------------------------------ settings

  async getSettings(branchId: string) {
    const b = await this.branchContext(branchId);
    const r = b.restaurant;
    return {
      hotelName: r.name,
      businessType: r.businessType,
      enabledModules: r.enabledModules,
      tagline: r.tagline,
      logoUrl: r.logoUrl,
      coverImageUrl: r.coverImageUrl,
      brandColor: r.brandColor ?? '#7A2E1F',
      accentColor: r.accentColor ?? '#C9973F',
      upiVpa: r.upiVpa,
      upiPayeeName: r.upiPayeeName,
      currency: r.currency,
      timezone: r.timezone,
      branchName: b.name,
      address: b.address,
      phone: b.phone,
      gstNumber: b.gstNumber,
      latitude: b.latitude,
      longitude: b.longitude,
      geofenceEnabled: b.geofenceEnabled,
      geofenceRadiusM: b.geofenceRadiusM,
      checkInTime: b.checkInTime,
      checkOutTime: b.checkOutTime,
      checkoutSoonHours: b.checkoutSoonHours,
      roomMenuMode: b.roomMenuMode,
      roomServiceCharge: n(b.roomServiceCharge),
      wifiName: b.wifiName,
      wifiPassword: b.wifiPassword,
      poolAdultRate: n(b.poolAdultRate),
      poolChildRate: n(b.poolChildRate),
      poolSlotCapacity: b.poolSlotCapacity,
    };
  }

  async updateSettings(branchId: string, dto: z.infer<typeof hotelSettingsSchema>) {
    const b = await this.branchContext(branchId);
    const {
      hotelName, tagline, logoUrl, coverImageUrl, brandColor, accentColor, upiVpa, upiPayeeName,
      businessType, enabledModules,
      ...branchFields
    } = dto;
    const restaurantData: Prisma.RestaurantUpdateInput = {};
    if (hotelName !== undefined) restaurantData.name = hotelName;
    if (tagline !== undefined) restaurantData.tagline = tagline;
    if (logoUrl !== undefined) restaurantData.logoUrl = logoUrl;
    if (coverImageUrl !== undefined) restaurantData.coverImageUrl = coverImageUrl;
    if (brandColor !== undefined) restaurantData.brandColor = brandColor;
    if (accentColor !== undefined) restaurantData.accentColor = accentColor;
    if (upiVpa !== undefined) restaurantData.upiVpa = upiVpa;
    if (upiPayeeName !== undefined) restaurantData.upiPayeeName = upiPayeeName;
    if (businessType !== undefined) restaurantData.businessType = businessType;
    if (enabledModules !== undefined) restaurantData.enabledModules = enabledModules;
    await this.prisma.$transaction([
      this.prisma.restaurant.update({ where: { id: b.restaurantId }, data: restaurantData }),
      this.prisma.branch.update({ where: { id: branchId }, data: branchFields }),
    ]);
    return this.getSettings(branchId);
  }

  async geofenceCheck(branchId: string, lat: number, lng: number, accuracy?: number) {
    const b = await this.branchContext(branchId);
    if (!b.geofenceEnabled || b.latitude == null || b.longitude == null)
      return { enforced: false, allowed: true, distanceM: null, radiusM: b.geofenceRadiusM };
    const distanceM = distanceMetres(b.latitude, b.longitude, lat, lng);
    // A fix whose error circle is wider than the fence can't prove anything.
    const tooInaccurate = accuracy != null && accuracy > Math.max(b.geofenceRadiusM, 150);
    return {
      enforced: true,
      allowed: distanceM <= b.geofenceRadiusM && !tooInaccurate,
      distanceM,
      radiusM: b.geofenceRadiusM,
      reason: tooInaccurate ? 'Location accuracy too low. Turn on precise location or move near a window.' : undefined,
    };
  }

  // ------------------------------------------------------------------ categories / meal plans / rooms

  listCategories(branchId: string) {
    return this.prisma.roomCategory.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: 'asc' }, { baseRate: 'asc' }],
      include: { _count: { select: { rooms: true } } },
    });
  }

  async createCategory(branchId: string, dto: z.infer<typeof roomCategorySchema>) {
    try {
      return await this.prisma.roomCategory.create({ data: { ...dto, branchId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException(`Category code ${dto.code} already exists`);
      throw e;
    }
  }

  async updateCategory(branchId: string, id: string, dto: Partial<z.infer<typeof roomCategorySchema>>) {
    await this.prisma.roomCategory.findFirstOrThrow({ where: { id, branchId } }).catch(() => {
      throw new NotFoundException('Room category not found');
    });
    return this.prisma.roomCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(branchId: string, id: string) {
    const used = await this.prisma.room.count({ where: { categoryId: id, branchId } });
    const booked = await this.prisma.booking.count({ where: { categoryId: id, branchId } });
    if (used || booked) {
      await this.prisma.roomCategory.updateMany({ where: { id, branchId }, data: { isActive: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.roomCategory.deleteMany({ where: { id, branchId } });
    return { ok: true, archived: false };
  }

  listMealPlans(branchId: string) {
    return this.prisma.mealPlan.findMany({ where: { branchId }, orderBy: [{ sortOrder: 'asc' }, { pricePerNight: 'asc' }] });
  }

  async createMealPlan(branchId: string, dto: z.infer<typeof mealPlanSchema>) {
    try {
      return await this.prisma.mealPlan.create({ data: { ...dto, branchId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException(`Meal plan ${dto.code} already exists`);
      throw e;
    }
  }

  async updateMealPlan(branchId: string, id: string, dto: Partial<z.infer<typeof mealPlanSchema>>) {
    const r = await this.prisma.mealPlan.updateMany({ where: { id, branchId }, data: dto });
    if (!r.count) throw new NotFoundException('Meal plan not found');
    return this.prisma.mealPlan.findUnique({ where: { id } });
  }

  async deleteMealPlan(branchId: string, id: string) {
    const used = await this.prisma.booking.count({ where: { mealPlanId: id, branchId } });
    if (used) {
      await this.prisma.mealPlan.updateMany({ where: { id, branchId }, data: { isActive: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.mealPlan.deleteMany({ where: { id, branchId } });
    return { ok: true, archived: false };
  }

  private async assertCategory(branchId: string, categoryId: string) {
    const c = await this.prisma.roomCategory.findFirst({ where: { id: categoryId, branchId } });
    if (!c) throw new BadRequestException('Room category is invalid for this branch');
    return c;
  }

  async createRoom(branchId: string, dto: z.infer<typeof roomSchema>) {
    await this.assertCategory(branchId, dto.categoryId);
    try {
      const room = await this.prisma.room.create({
        data: { ...dto, branchId, qrToken: randomBytes(18).toString('base64url') },
      });
      this.emit(branchId, 'rooms');
      return room;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException(`Room ${dto.number} already exists`);
      throw e;
    }
  }

  async createRooms(branchId: string, dto: z.infer<typeof roomBulkSchema>) {
    await this.assertCategory(branchId, dto.categoryId);
    const numbers = [...new Set(dto.numbers.map((x) => x.trim()).filter(Boolean))];
    const existing = await this.prisma.room.findMany({
      where: { branchId, number: { in: numbers } },
      select: { number: true },
    });
    if (existing.length)
      throw new ConflictException(`Already exists: ${existing.map((e) => e.number).join(', ')}`);
    await this.prisma.room.createMany({
      data: numbers.map((number) => ({
        branchId,
        number,
        categoryId: dto.categoryId,
        floorLabel: dto.floorLabel,
        qrToken: randomBytes(18).toString('base64url'),
      })),
    });
    this.emit(branchId, 'rooms');
    return { created: numbers.length };
  }

  async updateRoom(branchId: string, id: string, dto: z.infer<typeof roomUpdateSchema>) {
    if (dto.categoryId) await this.assertCategory(branchId, dto.categoryId);
    const r = await this.prisma.room.updateMany({ where: { id, branchId }, data: dto });
    if (!r.count) throw new NotFoundException('Room not found');
    this.emit(branchId, 'rooms');
    return this.prisma.room.findUnique({ where: { id } });
  }

  async rotateRoomQr(branchId: string, id: string) {
    const r = await this.prisma.room.updateMany({
      where: { id, branchId },
      data: { qrToken: randomBytes(18).toString('base64url') },
    });
    if (!r.count) throw new NotFoundException('Room not found');
    return this.prisma.room.findUnique({ where: { id } });
  }

  async deleteRoom(branchId: string, id: string) {
    const bookings = await this.prisma.booking.count({ where: { roomId: id, branchId } });
    if (bookings) {
      await this.prisma.room.updateMany({ where: { id, branchId }, data: { isActive: false } });
    } else {
      await this.prisma.room.deleteMany({ where: { id, branchId } });
    }
    this.emit(branchId, 'rooms');
    return { ok: true, archived: bookings > 0 };
  }

  // ------------------------------------------------------------------ live board

  async board(branchId: string) {
    const b = await this.branchContext(branchId);
    const tz = b.restaurant.timezone;
    const today = localDate(new Date(), tz);
    const nowMin = localMinuteAndDay(new Date(), tz).minute;
    const [h, m] = b.checkOutTime.split(':').map(Number);
    const checkoutMin = h * 60 + m;
    const soonFrom = checkoutMin - b.checkoutSoonHours * 60;

    const rooms = await this.prisma.room.findMany({
      where: { branchId, isActive: true },
      include: {
        category: { select: { id: true, name: true, code: true, bedType: true, baseRate: true } },
        bookings: {
          where: { status: { in: [...ACTIVE_BOOKING] }, checkOut: { gte: dateOnly(today) } },
          orderBy: { checkIn: 'asc' },
          select: {
            id: true, code: true, status: true, guestName: true, guestPhone: true,
            checkIn: true, checkOut: true, adults: true, children: true, source: true,
            mealPlan: { select: { code: true } },
          },
        },
      },
    });
    rooms.sort((a, z2) => a.number.localeCompare(z2.number, undefined, { numeric: true }));

    const inHouseIds = rooms.flatMap((r) => r.bookings.filter((x) => x.status === 'CHECKED_IN').map((x) => x.id));
    const folios = inHouseIds.length
      ? await this.prisma.folioEntry.findMany({ where: { bookingId: { in: inHouseIds } }, select: { bookingId: true, type: true, amount: true } })
      : [];
    const balanceOf = (id: string) => folioTotals(folios.filter((f) => f.bookingId === id)).balance;

    const board = rooms.map((r) => {
      const current = r.bookings.find((x) => x.status === 'CHECKED_IN') ?? null;
      const next = r.bookings.find((x) => x.status === 'CONFIRMED') ?? null;
      let display: BoardStatus = r.status as BoardStatus;
      if (r.status === 'MAINTENANCE') display = 'MAINTENANCE';
      else if (current) {
        const dueToday = isoDay(current.checkOut) <= today;
        display = dueToday && nowMin >= soonFrom ? 'CHECKOUT_SOON' : 'OCCUPIED';
      } else if (r.status === 'AVAILABLE' && next && isoDay(next.checkIn) <= today) display = 'BOOKED';
      return {
        id: r.id,
        number: r.number,
        floorLabel: r.floorLabel,
        status: r.status,
        display,
        statusSince: r.statusSince,
        notes: r.notes,
        qrToken: r.qrToken,
        category: { ...r.category, baseRate: n(r.category.baseRate) },
        current: current
          ? { ...current, checkIn: isoDay(current.checkIn), checkOut: isoDay(current.checkOut), balance: balanceOf(current.id) }
          : null,
        next: next ? { ...next, checkIn: isoDay(next.checkIn), checkOut: isoDay(next.checkOut) } : null,
      };
    });

    const counts = board.reduce<Record<string, number>>((acc, r) => {
      acc[r.display] = (acc[r.display] ?? 0) + 1;
      return acc;
    }, {});

    const [arrivals, departures] = await Promise.all([
      this.prisma.booking.findMany({
        where: { branchId, status: 'CONFIRMED', checkIn: { lte: dateOnly(today) } },
        include: { category: { select: { name: true } }, room: { select: { number: true } } },
        orderBy: { checkIn: 'asc' },
        take: 50,
      }),
      this.prisma.booking.findMany({
        where: { branchId, status: 'CHECKED_IN', checkOut: { lte: dateOnly(today) } },
        include: { room: { select: { number: true } } },
        take: 50,
      }),
    ]);

    return {
      today,
      checkOutTime: b.checkOutTime,
      rooms: board,
      counts,
      arrivals: arrivals.map((a) => ({ id: a.id, code: a.code, guestName: a.guestName, category: a.category.name, room: a.room?.number ?? null, checkIn: isoDay(a.checkIn), arrivalTime: a.arrivalTime })),
      departures: departures.map((d) => ({ id: d.id, code: d.code, guestName: d.guestName, room: d.room?.number ?? null, checkOut: isoDay(d.checkOut) })),
    };
  }

  async changeRoomStatus(branchId: string, id: string, to: RoomStatus, note: string | undefined, userId: string) {
    const room = await this.prisma.room.findFirst({ where: { id, branchId } });
    if (!room) throw new NotFoundException('Room not found');
    const inHouse = await this.prisma.booking.findFirst({ where: { roomId: id, status: 'CHECKED_IN' } });
    if (inHouse && to !== 'OCCUPIED' && to !== 'MAINTENANCE')
      throw new BadRequestException(`Room ${room.number} has a checked-in guest (${inHouse.code}). Check them out first.`);
    if (!inHouse && to === 'OCCUPIED')
      throw new BadRequestException('A room becomes Occupied only through guest check-in');
    await this.prisma.$transaction((tx) => this.setRoomStatus(tx, id, room.status, to, note, userId));
    this.emit(branchId, 'rooms');
    return { ok: true };
  }

  async roomHistory(branchId: string, id: string) {
    const room = await this.prisma.room.findFirst({ where: { id, branchId } });
    if (!room) throw new NotFoundException('Room not found');
    return this.prisma.roomStatusLog.findMany({ where: { roomId: id }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  // ------------------------------------------------------------------ availability & quotes

  /** Rooms of a category free for the whole [checkIn, checkOut) stay. */
  async freeRooms(branchId: string, categoryId: string | null, checkIn: string, checkOut: string, excludeBookingId?: string, tx: Prisma.TransactionClient = this.prisma) {
    const rooms = await tx.room.findMany({
      where: { branchId, isActive: true, ...(categoryId ? { categoryId } : {}) },
      include: { category: { select: { id: true, name: true } } },
    });
    const clashes = await tx.booking.findMany({
      where: {
        branchId,
        status: { in: [...ACTIVE_BOOKING] },
        roomId: { not: null },
        checkIn: { lt: dateOnly(checkOut) },
        checkOut: { gt: dateOnly(checkIn) },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { roomId: true },
    });
    const taken = new Set(clashes.map((c) => c.roomId));
    return rooms
      .filter((r) => !taken.has(r.id) && r.status !== 'MAINTENANCE')
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }

  async availability(branchId: string, checkIn: string, checkOut: string) {
    if (nightsBetween(checkIn, checkOut) < 1) throw new BadRequestException('Check-out must be after check-in');
    const categories = await this.prisma.roomCategory.findMany({ where: { branchId, isActive: true }, orderBy: { baseRate: 'asc' } });
    const rooms = await this.prisma.room.findMany({ where: { branchId, isActive: true }, select: { id: true, categoryId: true, status: true } });
    const overlapping = await this.prisma.booking.findMany({
      where: {
        branchId,
        status: { in: [...ACTIVE_BOOKING] },
        checkIn: { lt: dateOnly(checkOut) },
        checkOut: { gt: dateOnly(checkIn) },
      },
      select: { categoryId: true },
    });
    return categories.map((c) => {
      const total = rooms.filter((r) => r.categoryId === c.id && r.status !== 'MAINTENANCE').length;
      const sold = overlapping.filter((o) => o.categoryId === c.id).length;
      return {
        categoryId: c.id,
        name: c.name,
        code: c.code,
        bedType: c.bedType,
        baseRate: n(c.baseRate),
        maxAdults: c.maxAdults,
        maxChildren: c.maxChildren,
        amenities: c.amenities,
        imageUrl: c.imageUrl,
        totalRooms: total,
        available: Math.max(0, total - sold),
      };
    });
  }

  async quote(branchId: string, dto: QuoteDto) {
    const nights = nightsBetween(dto.checkIn, dto.checkOut);
    if (nights < 1) throw new BadRequestException('Check-out must be after check-in');
    if (nights > 60) throw new BadRequestException('A single booking can be at most 60 nights');
    const category = await this.assertCategory(branchId, dto.categoryId);
    if (dto.adults > category.maxAdults + 1)
      throw new BadRequestException(`${category.name} allows up to ${category.maxAdults} adults (+1 extra bed)`);
    const plan = dto.mealPlanId
      ? await this.prisma.mealPlan.findFirst({ where: { id: dto.mealPlanId, branchId } })
      : null;
    if (dto.mealPlanId && !plan) throw new BadRequestException('Meal plan is invalid');
    const extraAdults = Math.max(0, dto.adults - category.maxAdults);
    const roomRate = round2(n(category.baseRate) + extraAdults * n(category.extraGuestRate));
    const mealRate = round2(plan ? n(plan.pricePerNight) * (dto.adults + dto.children) : 0);
    const roomTotal = round2(roomRate * nights);
    const mealTotal = round2(mealRate * nights);
    const discount = Math.min(dto.discountAmount ?? 0, roomTotal + mealTotal);
    const taxRate = n(category.taxRatePercent);
    const tax = round2(((roomTotal - Math.min(discount, roomTotal)) * taxRate) / 100);
    const grand = round2(roomTotal + mealTotal + tax - discount);
    return {
      nights,
      category: { id: category.id, name: category.name },
      mealPlan: plan ? { id: plan.id, code: plan.code, name: plan.name } : null,
      roomRate, mealRate, roomTotal, mealTotal, discount, taxRatePercent: taxRate, tax, grandTotal: grand,
    };
  }

  // ------------------------------------------------------------------ bookings

  private async nextCode(tx: Prisma.TransactionClient, branchId: string, prefixSource: string, table: 'booking' | 'event') {
    const initials = prefixSource
      .replace(/[^A-Za-z ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !['the', 'and', 'of'].includes(w.toLowerCase()))
      .map((w) => w[0].toUpperCase())
      .join('')
      .slice(0, 3) || 'HTL';
    const prefix = table === 'event' ? `${initials}-EV` : initials;
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-`;
    const count =
      table === 'booking'
        ? await tx.booking.count({ where: { branchId, code: { startsWith: like } } })
        : await tx.eventBooking.count({ where: { branchId, code: { startsWith: like } } });
    return `${like}${String(count + 1).padStart(5, '0')}`;
  }

  async createBooking(branchId: string, userId: string | null, dto: BookingDto) {
    const q = await this.quote(branchId, dto);
    const b = await this.branchContext(branchId);
    const booking = await this.prisma.$transaction(
      async (tx) => {
        // Serialise bookings per branch so two desks can't sell the last room twice.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${branchId}))`;
        const avail = await tx.room.count({ where: { branchId, categoryId: dto.categoryId, isActive: true, status: { not: 'MAINTENANCE' } } });
        const sold = await tx.booking.count({
          where: {
            branchId, categoryId: dto.categoryId, status: { in: [...ACTIVE_BOOKING] },
            checkIn: { lt: dateOnly(dto.checkOut) }, checkOut: { gt: dateOnly(dto.checkIn) },
          },
        });
        if (sold >= avail) throw new ConflictException(`No ${q.category.name} rooms left for these dates`);
        if (dto.roomId) {
          const free = await this.freeRooms(branchId, dto.categoryId, dto.checkIn, dto.checkOut, undefined, tx);
          if (!free.some((r) => r.id === dto.roomId))
            throw new ConflictException('That room is not free for the whole stay');
        }
        const code = await this.nextCode(tx, branchId, b.restaurant.name, 'booking');
        const created = await tx.booking.create({
          data: {
            branchId,
            code,
            source: dto.source,
            otaName: dto.otaName,
            otaReference: dto.otaReference,
            otaCommissionPercent: dto.otaCommissionPercent,
            guestName: dto.guestName,
            guestPhone: dto.guestPhone || null,
            guestEmail: dto.guestEmail || null,
            guestAddress: dto.guestAddress,
            consentMessages: dto.consentMessages,
            categoryId: dto.categoryId,
            roomId: dto.roomId || null,
            mealPlanId: dto.mealPlanId || null,
            checkIn: dateOnly(dto.checkIn),
            checkOut: dateOnly(dto.checkOut),
            nights: q.nights,
            adults: dto.adults,
            children: dto.children,
            arrivalTime: dto.arrivalTime,
            specialRequests: dto.specialRequests,
            roomRate: q.roomRate,
            mealRate: q.mealRate,
            taxRatePercent: q.taxRatePercent,
            discountAmount: q.discount,
            guestToken: randomBytes(24).toString('base64url'),
            stayPin: String(randomInt(1000, 10000)),
            createdById: userId,
          },
        });
        const entries: Prisma.FolioEntryCreateManyInput[] = [
          { bookingId: created.id, type: 'ROOM', description: `Room rent – ${q.category.name} (${q.nights} night${q.nights > 1 ? 's' : ''} × ₹${q.roomRate})`, amount: q.roomTotal, quantity: q.nights, byUserId: userId },
        ];
        if (q.mealTotal > 0)
          entries.push({ bookingId: created.id, type: 'MEAL_PLAN', description: `${q.mealPlan!.code} meal plan – ${dto.adults + dto.children} guest(s) × ${q.nights} night(s)`, amount: q.mealTotal, quantity: q.nights, byUserId: userId });
        if (q.tax > 0)
          entries.push({ bookingId: created.id, type: 'TAX', description: `GST on room @ ${q.taxRatePercent}%`, amount: q.tax, byUserId: userId });
        if (q.discount > 0)
          entries.push({ bookingId: created.id, type: 'DISCOUNT', description: 'Booking discount', amount: q.discount, byUserId: userId });
        if (dto.advance && dto.advance.amount > 0)
          entries.push({ bookingId: created.id, type: 'PAYMENT', description: 'Advance payment', amount: dto.advance.amount, method: dto.advance.method, reference: dto.advance.reference, byUserId: userId });
        await tx.folioEntry.createMany({ data: entries });
        return created;
      },
      { timeout: 15_000 },
    );
    this.emit(branchId, 'bookings');
    await this.notifyBooking(branchId, booking.id, 'BOOKING_CONFIRMED');
    if (dto.advance && dto.advance.amount > 0)
      await this.notifyBooking(branchId, booking.id, 'PAYMENT_RECEIVED', { amount: `₹${dto.advance.amount}` });
    return this.getBooking(branchId, booking.id);
  }

  async listBookings(branchId: string, q: { status?: string; search?: string; from?: string; to?: string; source?: string }) {
    const where: Prisma.BookingWhereInput = { branchId };
    if (q.status && q.status !== 'ALL') where.status = q.status as never;
    if (q.source && q.source !== 'ALL') where.source = q.source as never;
    if (q.from || q.to) {
      where.checkIn = {};
      if (q.to) where.checkIn.lte = dateOnly(q.to);
      if (q.from) where.checkOut = { gte: dateOnly(q.from) };
    }
    if (q.search) {
      where.OR = [
        { code: { contains: q.search, mode: 'insensitive' } },
        { guestName: { contains: q.search, mode: 'insensitive' } },
        { guestPhone: { contains: q.search } },
      ];
    }
    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: { checkIn: 'desc' },
      take: 300,
      include: {
        category: { select: { name: true } },
        room: { select: { number: true } },
        mealPlan: { select: { code: true } },
        folio: { select: { type: true, amount: true } },
      },
    });
    return rows.map(({ folio, ...r }) => ({
      ...r,
      checkIn: isoDay(r.checkIn),
      checkOut: isoDay(r.checkOut),
      ...folioTotals(folio),
    }));
  }

  async getBooking(branchId: string, id: string) {
    const b = await this.prisma.booking.findFirst({
      where: { id, branchId },
      include: {
        category: true,
        room: true,
        mealPlan: true,
        folio: { orderBy: { createdAt: 'asc' } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 50 },
        poolPasses: true,
      },
    });
    if (!b) throw new NotFoundException('Booking not found');
    const orders = await this.prisma.order.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, status: true, totalAmount: true, folioPostedAt: true, createdAt: true, type: true, items: { select: { nameSnapshot: true, quantity: true } } },
    });
    return {
      ...b,
      checkIn: isoDay(b.checkIn),
      checkOut: isoDay(b.checkOut),
      totals: folioTotals(b.folio),
      guestLink: this.guestLink(b.guestToken),
      orders,
      entitlement: this.entitlement(b),
    };
  }

  /** Meals already paid in the package, so restaurant staff don't bill them again. */
  private entitlement(b: { nights: number; adults: number; children: number; mealPlan: { includesBreakfast: boolean; includesLunch: boolean; includesDinner: boolean; code: string } | null }) {
    const guests = b.adults + b.children;
    const per = (on: boolean | undefined) => (on ? guests * b.nights : 0);
    return {
      plan: b.mealPlan?.code ?? 'EP',
      breakfast: per(b.mealPlan?.includesBreakfast),
      lunch: per(b.mealPlan?.includesLunch),
      dinner: per(b.mealPlan?.includesDinner),
    };
  }

  async assignRoom(branchId: string, id: string, roomId: string) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CONFIRMED') throw new BadRequestException('Room can only be changed before check-in');
    const free = await this.freeRooms(branchId, b.categoryId, isoDay(b.checkIn), isoDay(b.checkOut), b.id);
    if (!free.some((r) => r.id === roomId)) throw new ConflictException('That room is not free for this stay');
    await this.prisma.booking.update({ where: { id }, data: { roomId } });
    this.emit(branchId, 'bookings');
    return this.getBooking(branchId, id);
  }

  async checkIn(branchId: string, id: string, userId: string, dto: z.infer<typeof checkInSchema>) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CONFIRMED') throw new BadRequestException(`Booking is ${b.status.replace('_', ' ').toLowerCase()}`);
    const free = await this.freeRooms(branchId, null, isoDay(b.checkIn), isoDay(b.checkOut), b.id);
    const room = free.find((r) => r.id === dto.roomId);
    if (!room) throw new ConflictException('That room is not free for this stay');
    if (room.status !== 'AVAILABLE')
      throw new BadRequestException(`Room ${room.number} is ${room.status.toLowerCase()} — housekeeping must clear it first`);
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { status: 'CHECKED_IN', roomId: room.id, checkedInAt: new Date(), guestIdType: dto.guestIdType, guestIdNumber: dto.guestIdNumber },
      });
      await this.setRoomStatus(tx, room.id, room.status, 'OCCUPIED', `Check-in ${b.code}`, userId);
    });
    this.emit(branchId, 'rooms');
    await this.notifyBooking(branchId, id, 'CHECKED_IN');
    return this.getBooking(branchId, id);
  }

  async checkOut(branchId: string, id: string, userId: string, allowDue: boolean) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId }, include: { folio: true, room: true } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CHECKED_IN') throw new BadRequestException('Only checked-in guests can check out');
    const unposted = await this.prisma.order.count({ where: { bookingId: id, status: { in: ['OPEN', 'BILLED'] }, folioPostedAt: null } });
    if (unposted && !allowDue)
      throw new BadRequestException(`${unposted} room-service order(s) are still open — post them to the folio or settle them first`);
    const t = folioTotals(b.folio);
    if (t.balance > 0.009 && !allowDue)
      throw new BadRequestException(`Outstanding balance ₹${t.balance} — collect payment before checkout`);
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: 'CHECKED_OUT', checkedOutAt: new Date() } });
      if (b.roomId) await this.setRoomStatus(tx, b.roomId, b.room?.status ?? null, 'DIRTY', `Checkout ${b.code}`, userId);
    });
    this.emit(branchId, 'rooms');
    if (t.balance <= 0.009) await this.notifyBooking(branchId, id, 'PAYMENT_COMPLETED');
    await this.notifyBooking(branchId, id, 'CHECKED_OUT');
    return this.getBooking(branchId, id);
  }

  async cancel(branchId: string, id: string, userId: string, reason: string) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId }, include: { folio: true } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CONFIRMED') throw new BadRequestException('Only bookings not yet checked in can be cancelled');
    const t = folioTotals(b.folio);
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
      // Reverse the stay charges so the folio balance shows only what is owed back.
      if (t.total > 0)
        await tx.folioEntry.create({ data: { bookingId: id, type: 'DISCOUNT', description: `Cancellation reversal – ${reason}`, amount: t.total, byUserId: userId } });
    });
    this.emit(branchId, 'bookings');
    await this.notifyBooking(branchId, id, 'BOOKING_CANCELLED', {
      refundStatus: t.paid > 0 ? `₹${t.paid} refund pending` : 'No payment was taken',
    });
    return this.getBooking(branchId, id);
  }

  async markNoShow(branchId: string, id: string) {
    const r = await this.prisma.booking.updateMany({ where: { id, branchId, status: 'CONFIRMED' }, data: { status: 'NO_SHOW' } });
    if (!r.count) throw new BadRequestException('Only confirmed bookings can be marked no-show');
    this.emit(branchId, 'bookings');
    return this.getBooking(branchId, id);
  }

  // ------------------------------------------------------------------ folio

  async addCharge(branchId: string, id: string, userId: string, dto: z.infer<typeof folioChargeSchema>) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') throw new BadRequestException('Folio is closed');
    await this.prisma.folioEntry.create({
      data: { bookingId: id, type: dto.type, description: dto.description, amount: round2(dto.amount * dto.quantity), quantity: dto.quantity, byUserId: userId },
    });
    this.emit(branchId, 'folio', { bookingId: id });
    if (dto.type !== 'DISCOUNT') await this.notifyBooking(branchId, id, 'FOLIO_UPDATED');
    return this.getBooking(branchId, id);
  }

  async addPayment(branchId: string, id: string, userId: string, dto: z.infer<typeof folioPaymentSchema>) {
    const b = await this.prisma.booking.findFirst({ where: { id, branchId }, include: { folio: true } });
    if (!b) throw new NotFoundException('Booking not found');
    const t = folioTotals(b.folio);
    if (dto.refund && dto.amount > t.paid + 0.009) throw new BadRequestException(`Cannot refund more than ₹${t.paid} paid`);
    try {
      await this.prisma.folioEntry.create({
        data: {
          bookingId: id,
          type: dto.refund ? 'REFUND' : 'PAYMENT',
          description: dto.refund ? 'Refund' : `Payment – ${dto.method.replace('_', ' ')}`,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          idempotencyKey: dto.idempotencyKey,
          byUserId: userId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return this.getBooking(branchId, id);
      throw e;
    }
    this.emit(branchId, 'folio', { bookingId: id });
    if (!dto.refund) {
      const after = await this.getBooking(branchId, id);
      await this.notifyBooking(branchId, id, after.totals.balance <= 0.009 ? 'PAYMENT_COMPLETED' : 'PAYMENT_RECEIVED', { amount: `₹${dto.amount}` });
      return after;
    }
    return this.getBooking(branchId, id);
  }

  /** Charge to room: post a room-service/restaurant order's total to the in-house folio. */
  async postOrderToFolio(branchId: string, orderId: string, userId: string, bookingIdHint?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, branchId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.folioPostedAt) throw new BadRequestException('Already charged to the room');
    if (order.status === 'CANCELLED' || order.status === 'PAID') throw new BadRequestException(`Order is ${order.status.toLowerCase()}`);
    const booking = await this.prisma.booking.findFirst({
      where: {
        branchId,
        status: 'CHECKED_IN',
        ...(bookingIdHint ? { id: bookingIdHint } : order.bookingId ? { id: order.bookingId } : { roomId: order.roomId ?? '__none__' }),
      },
    });
    if (!booking) throw new BadRequestException('No checked-in guest to charge this order to');
    const items = await this.prisma.orderItem.findMany({ where: { orderId }, select: { nameSnapshot: true, quantity: true } });
    await this.prisma.$transaction(async (tx) => {
      await tx.folioEntry.create({
        data: {
          bookingId: booking.id,
          type: order.type === 'ROOM_SERVICE' ? 'ROOM_SERVICE' : 'RESTAURANT',
          description: `Order ${order.orderNumber}: ${items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(', ').slice(0, 140)}`,
          amount: order.totalAmount,
          orderId,
          idempotencyKey: `order:${orderId}`,
          byUserId: userId,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { folioPostedAt: new Date(), bookingId: booking.id, status: 'PAID', billedAt: order.billedAt ?? new Date() },
      });
      await tx.payment.create({
        data: { orderId, method: 'OTHER', amount: order.totalAmount, reference: `FOLIO ${booking.code}`, createdById: userId },
      });
    });
    this.emit(branchId, 'folio', { bookingId: booking.id });
    this.realtime.emitToBranch(branchId, 'order.updated', { id: orderId });
    await this.notifyBooking(branchId, booking.id, 'FOLIO_UPDATED');
    return { ok: true, bookingId: booking.id };
  }

  // ------------------------------------------------------------------ room service

  async roomService(branchId: string) {
    const b = await this.branchContext(branchId);
    const today = localDate(new Date(), b.restaurant.timezone);
    const since = zonedRange(addDaysToDate(today, -1), today, b.restaurant.timezone).gte;
    const orders = await this.prisma.order.findMany({
      where: { branchId, roomId: { not: null }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { number: true } },
        items: { select: { id: true, nameSnapshot: true, quantity: true, status: true } },
        kots: { select: { status: true } },
      },
    });
    const byRoom = new Map<string, { room: string; orders: number; delivered: number; pending: number; unbilled: number }>();
    for (const o of orders) {
      const k = o.room!.number;
      const row = byRoom.get(k) ?? { room: k, orders: 0, delivered: 0, pending: 0, unbilled: 0 };
      row.orders += 1;
      const served = o.kots.length > 0 && o.kots.every((x) => x.status === 'SERVED' || x.status === 'CANCELLED');
      if (served) row.delivered += 1;
      else if (o.status !== 'CANCELLED') row.pending += 1;
      if (o.status === 'OPEN' || o.status === 'BILLED') row.unbilled += n(o.totalAmount);
      byRoom.set(k, row);
    }
    return {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        room: o.room?.number,
        roomId: o.roomId,
        bookingId: o.bookingId,
        status: o.status,
        guestName: o.guestName,
        totalAmount: n(o.totalAmount),
        folioPostedAt: o.folioPostedAt,
        createdAt: o.createdAt,
        notes: o.notes,
        kitchen: o.kots.length === 0 ? 'NEW' : o.kots.every((x) => x.status === 'SERVED') ? 'SERVED' : o.kots.some((x) => x.status === 'READY') ? 'READY' : 'PREPARING',
        items: o.items,
      })),
      rooms: [...byRoom.values()].sort((a, z2) => a.room.localeCompare(z2.room, undefined, { numeric: true })),
    };
  }

  async roomMenuItems(branchId: string) {
    return this.prisma.menuItem.findMany({
      where: { branchId, isActive: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true, name: true, price: true, imageUrl: true, isVeg: true,
        roomServiceEnabled: true, roomServicePrice: true, isSoldOut: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  async updateRoomMenuItem(branchId: string, id: string, dto: { roomServiceEnabled?: boolean; roomServicePrice?: number | null; isSoldOut?: boolean }) {
    const r = await this.prisma.menuItem.updateMany({ where: { id, branchId }, data: dto });
    if (!r.count) throw new NotFoundException('Menu item not found');
    this.realtime.emitToBranch(branchId, 'menu.updated', { id });
    return { ok: true };
  }

  // ------------------------------------------------------------------ analytics

  async analytics(branchId: string, from: string, to: string) {
    const b = await this.branchContext(branchId);
    const tz = b.restaurant.timezone;
    const days = Math.min(92, Math.max(1, nightsBetween(from, to) + 1));
    const range = zonedRange(from, to, tz);

    const [rooms, bookings, folioPays, folioCharges, orderPays, events, pool, orders] = await Promise.all([
      this.prisma.room.findMany({ where: { branchId, isActive: true }, select: { id: true, status: true } }),
      this.prisma.booking.findMany({
        where: { branchId, checkIn: { lte: dateOnly(to) }, checkOut: { gt: dateOnly(from) } },
        select: { id: true, status: true, source: true, checkIn: true, checkOut: true, roomRate: true, otaCommissionPercent: true, nights: true, createdAt: true },
      }),
      this.prisma.folioEntry.findMany({ where: { booking: { branchId }, type: { in: ['PAYMENT', 'REFUND'] }, createdAt: range }, select: { type: true, method: true, amount: true } }),
      this.prisma.folioEntry.findMany({ where: { booking: { branchId }, createdAt: range }, select: { type: true, amount: true, createdAt: true } }),
      this.prisma.payment.findMany({ where: { order: { branchId }, createdAt: range, method: { not: 'OTHER' } }, select: { method: true, amount: true } }),
      this.prisma.eventBooking.findMany({ where: { branchId, status: { not: 'CANCELLED' } }, select: { payments: true, eventDate: true } }),
      this.prisma.poolPass.findMany({ where: { branchId, createdAt: range, status: { not: 'CANCELLED' } }, select: { amount: true, paymentMethod: true, adults: true, children: true } }),
      this.prisma.order.findMany({ where: { branchId, status: 'PAID', createdAt: range }, select: { totalAmount: true, type: true, createdAt: true, folioPostedAt: true } }),
    ]);

    // Payment mix: method is the instrument; folio payments + restaurant payments.
    const mix = new Map<string, number>();
    const add = (k: string, v: number) => mix.set(k, round2((mix.get(k) ?? 0) + v));
    for (const p of folioPays) add(p.method ?? 'OTHER', p.type === 'REFUND' ? -n(p.amount) : n(p.amount));
    for (const p of orderPays) add(p.method, n(p.amount));
    for (const e of events)
      for (const p of (e.payments as { amount: number; method: string; at: string }[]) ?? [])
        if (p.at >= range.gte.toISOString() && p.at < range.lt.toISOString()) add(p.method, n(p.amount));
    for (const p of pool) if (p.paymentMethod && !['FOLIO', 'INCLUDED'].includes(p.paymentMethod)) add(p.paymentMethod, n(p.amount));
    const mixTotal = [...mix.values()].reduce((a, v) => a + v, 0);

    // Occupancy per night.
    const totalRooms = rooms.length;
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length;
    const occupancy: { date: string; occupied: number; reserved: number; available: number; maintenance: number }[] = [];
    let roomNightsSold = 0;
    let roomRevenue = 0;
    for (let i = 0; i < days; i++) {
      const d = addDaysToDate(from, i);
      let occ = 0;
      let res = 0;
      for (const bk of bookings) {
        if (bk.status === 'CANCELLED' || bk.status === 'NO_SHOW') continue;
        if (isoDay(bk.checkIn) <= d && d < isoDay(bk.checkOut)) {
          if (bk.status === 'CONFIRMED') res++;
          else {
            occ++;
            roomNightsSold++;
            roomRevenue += n(bk.roomRate);
          }
        }
      }
      occupancy.push({ date: d, occupied: occ, reserved: res, maintenance, available: Math.max(0, totalRooms - occ - res - maintenance) });
    }

    // Department revenue (charges posted in range).
    const dept = { Rooms: 0, Restaurant: 0, 'Room Service': 0, Events: 0, Pool: 0, Other: 0 };
    for (const c of folioCharges) {
      const a = n(c.amount);
      if (c.type === 'ROOM' || c.type === 'MEAL_PLAN' || c.type === 'TAX') dept.Rooms += a;
      else if (c.type === 'DISCOUNT') dept.Rooms -= a;
      else if (c.type === 'EXTRA') dept.Other += a;
      else if (c.type === 'EVENT') dept.Events += a;
      else if (c.type === 'POOL') dept.Pool += a;
    }
    for (const o of orders) {
      // Folio-posted orders are already counted through the folio charge.
      if (o.type === 'ROOM_SERVICE') dept['Room Service'] += n(o.totalAmount);
      else dept.Restaurant += n(o.totalAmount);
    }
    for (const e of events)
      for (const p of (e.payments as { amount: number; at: string }[]) ?? [])
        if (p.at >= range.gte.toISOString() && p.at < range.lt.toISOString()) dept.Events += n(p.amount);
    for (const p of pool) if (p.paymentMethod !== 'FOLIO') dept.Pool += n(p.amount);

    // Revenue trend per day (folio charges + paid orders).
    const trend = new Map<string, number>();
    for (let i = 0; i < days; i++) trend.set(addDaysToDate(from, i), 0);
    for (const c of folioCharges) {
      if (c.type === 'PAYMENT' || c.type === 'REFUND') continue;
      const sign = c.type === 'DISCOUNT' ? -1 : 1;
      const d = localDate(c.createdAt, tz);
      if (trend.has(d)) trend.set(d, round2(trend.get(d)! + sign * n(c.amount)));
    }
    for (const o of orders) {
      if (o.folioPostedAt) continue;
      const d = localDate(o.createdAt, tz);
      if (trend.has(d)) trend.set(d, round2(trend.get(d)! + n(o.totalAmount)));
    }

    const sources = bookings.reduce<Record<string, number>>((acc, bk) => {
      acc[bk.source] = (acc[bk.source] ?? 0) + 1;
      return acc;
    }, {});
    const otaGross = bookings.filter((x) => x.source === 'OTA' && x.status !== 'CANCELLED').reduce((a, x) => a + n(x.roomRate) * x.nights, 0);
    const otaCommission = bookings
      .filter((x) => x.source === 'OTA' && x.status !== 'CANCELLED')
      .reduce((a, x) => a + (n(x.roomRate) * x.nights * n(x.otaCommissionPercent)) / 100, 0);
    const cancelled = bookings.filter((x) => x.status === 'CANCELLED').length;
    const availableRoomNights = Math.max(1, (totalRooms - maintenance) * days);

    const inHouse = await this.prisma.booking.findMany({ where: { branchId, status: 'CHECKED_IN' }, select: { folio: { select: { type: true, amount: true } } } });
    const outstanding = inHouse.reduce((a, x) => a + Math.max(0, folioTotals(x.folio).balance), 0);

    return {
      from,
      to,
      totalRooms,
      paymentMix: [...mix.entries()]
        .filter(([, v]) => v > 0)
        .map(([method, amount]) => ({ method, amount, percent: mixTotal ? round2((amount / mixTotal) * 100) : 0 }))
        .sort((a, z2) => z2.amount - a.amount),
      occupancy,
      departments: Object.entries(dept).map(([name, amount]) => ({ name, amount: round2(amount) })),
      revenueTrend: [...trend.entries()].map(([date, amount]) => ({ date, amount })),
      sources: Object.entries(sources).map(([source, count]) => ({ source, count })),
      kpis: {
        occupancyPercent: round2((roomNightsSold / availableRoomNights) * 100),
        adr: roomNightsSold ? round2(roomRevenue / roomNightsSold) : 0,
        revpar: round2(roomRevenue / availableRoomNights),
        roomNightsSold,
        cancellationRate: bookings.length ? round2((cancelled / bookings.length) * 100) : 0,
        otaGross: round2(otaGross),
        otaCommission: round2(otaCommission),
        otaNet: round2(otaGross - otaCommission),
        outstanding: round2(outstanding),
        totalCollected: round2(mixTotal),
      },
    };
  }

  /** Charge types counted as revenue on the folio. */
  static readonly CHARGE_TYPES = CHARGE_TYPES;
}
