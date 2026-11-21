import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { round2 } from '../../common/money';
import { PrismaService } from '../../prisma/prisma.service';
import { HotelService } from './hotel.service';
import type { eventPaymentSchema, eventSchema, poolPassSchema, venueSchema } from './hotel.schemas';

type EventDto = z.infer<typeof eventSchema>;
type ServiceLine = { name: string; amount: number };
type PaymentLine = { amount: number; method: string; reference?: string | null; at: string };

const dateOnly = (d: string) => new Date(`${d}T00:00:00Z`);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

@Injectable()
export class HotelResortService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotel: HotelService,
  ) {}

  // ----------------------------------------------------------------- venues

  listVenues(branchId: string) {
    return this.prisma.venue.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
  }
  createVenue(branchId: string, dto: z.infer<typeof venueSchema>) {
    return this.prisma.venue.create({ data: { ...dto, branchId } });
  }
  async updateVenue(branchId: string, id: string, dto: Partial<z.infer<typeof venueSchema>>) {
    const r = await this.prisma.venue.updateMany({ where: { id, branchId }, data: dto });
    if (!r.count) throw new NotFoundException('Venue not found');
    return this.prisma.venue.findUnique({ where: { id } });
  }

  // ----------------------------------------------------------------- events

  private totals(e: { venueCharge: unknown; cateringPerPlate: unknown; guestCount: number; services: unknown; taxRatePercent: unknown; payments: unknown }) {
    const services = (e.services as ServiceLine[]) ?? [];
    const payments = (e.payments as PaymentLine[]) ?? [];
    const catering = Number(e.cateringPerPlate) * e.guestCount;
    const serviceTotal = services.reduce((a, s) => a + Number(s.amount), 0);
    const subtotal = round2(Number(e.venueCharge) + catering + serviceTotal);
    const tax = round2((subtotal * Number(e.taxRatePercent)) / 100);
    const total = round2(subtotal + tax);
    const paid = round2(payments.reduce((a, p) => a + Number(p.amount), 0));
    return { catering: round2(catering), serviceTotal: round2(serviceTotal), subtotal, tax, total, paid, balance: round2(total - paid) };
  }

  private shape<T extends { eventDate: Date; venueCharge: unknown; cateringPerPlate: unknown; guestCount: number; services: unknown; taxRatePercent: unknown; payments: unknown }>(e: T) {
    return { ...e, eventDate: e.eventDate.toISOString().slice(0, 10), totals: this.totals(e) };
  }

  private async assertSlotFree(branchId: string, dto: Pick<EventDto, 'venueId' | 'eventDate' | 'startTime' | 'endTime'>, excludeId?: string) {
    const venue = await this.prisma.venue.findFirst({ where: { id: dto.venueId, branchId } });
    if (!venue) throw new BadRequestException('Venue is invalid');
    if (toMin(dto.endTime) <= toMin(dto.startTime) && dto.endTime !== '00:00')
      throw new BadRequestException('End time must be after start time');
    const sameDay = await this.prisma.eventBooking.findMany({
      where: {
        branchId, venueId: dto.venueId, eventDate: dateOnly(dto.eventDate),
        status: { in: ['QUOTED', 'CONFIRMED'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const s = toMin(dto.startTime);
    const e = dto.endTime === '00:00' ? 1440 : toMin(dto.endTime);
    const clash = sameDay.find((x) => {
      const xs = toMin(x.startTime);
      const xe = x.endTime === '00:00' ? 1440 : toMin(x.endTime);
      return s < xe && xs < e;
    });
    if (clash) throw new ConflictException(`${venue.name} is already booked ${clash.startTime}–${clash.endTime} (${clash.code})`);
    return venue;
  }

  async listEvents(branchId: string, from?: string, to?: string) {
    const rows = await this.prisma.eventBooking.findMany({
      where: {
        branchId,
        ...(from || to ? { eventDate: { ...(from ? { gte: dateOnly(from) } : {}), ...(to ? { lte: dateOnly(to) } : {}) } } : {}),
      },
      include: { venue: { select: { id: true, name: true, kind: true } } },
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
      take: 400,
    });
    return rows.map((r) => this.shape(r));
  }

  async createEvent(branchId: string, dto: EventDto) {
    const venue = dto.status === 'ENQUIRY' || dto.status === 'CANCELLED'
      ? await this.prisma.venue.findFirst({ where: { id: dto.venueId, branchId } })
      : await this.assertSlotFree(branchId, dto);
    if (!venue) throw new BadRequestException('Venue is invalid');
    const b = await this.hotel.branchContext(branchId);
    const created = await this.prisma.$transaction(async (tx) => {
      const initials = b.restaurant.name.split(/\s+/).filter((w) => !/^(the|and|of)$/i.test(w)).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 3) || 'HTL';
      const like = `${initials}-EV-${new Date().getFullYear()}-`;
      const count = await tx.eventBooking.count({ where: { branchId, code: { startsWith: like } } });
      return tx.eventBooking.create({
        data: {
          ...dto,
          branchId,
          code: `${like}${String(count + 1).padStart(4, '0')}`,
          eventDate: dateOnly(dto.eventDate),
          venueCharge: dto.venueCharge || Number(venue.baseRate),
          cateringPerPlate: dto.cateringPerPlate || Number(venue.perPlateRate),
          services: dto.services,
          payments: [],
        },
        include: { venue: { select: { id: true, name: true, kind: true } } },
      });
    });
    return this.shape(created);
  }

  async updateEvent(branchId: string, id: string, dto: Partial<EventDto>) {
    const cur = await this.prisma.eventBooking.findFirst({ where: { id, branchId } });
    if (!cur) throw new NotFoundException('Event not found');
    const merged = {
      venueId: dto.venueId ?? cur.venueId,
      eventDate: dto.eventDate ?? cur.eventDate.toISOString().slice(0, 10),
      startTime: dto.startTime ?? cur.startTime,
      endTime: dto.endTime ?? cur.endTime,
    };
    const status = dto.status ?? cur.status;
    if (status === 'QUOTED' || status === 'CONFIRMED') await this.assertSlotFree(branchId, merged, id);
    const updated = await this.prisma.eventBooking.update({
      where: { id },
      data: { ...dto, ...(dto.eventDate ? { eventDate: dateOnly(dto.eventDate) } : {}) },
      include: { venue: { select: { id: true, name: true, kind: true } } },
    });
    return this.shape(updated);
  }

  async addEventPayment(branchId: string, id: string, dto: z.infer<typeof eventPaymentSchema>) {
    const cur = await this.prisma.eventBooking.findFirst({ where: { id, branchId } });
    if (!cur) throw new NotFoundException('Event not found');
    if (cur.status === 'CANCELLED') throw new BadRequestException('Event is cancelled');
    const payments = [...((cur.payments as PaymentLine[]) ?? []), { ...dto, at: new Date().toISOString() }];
    const updated = await this.prisma.eventBooking.update({
      where: { id },
      data: { payments, status: cur.status === 'ENQUIRY' || cur.status === 'QUOTED' ? 'CONFIRMED' : cur.status },
      include: { venue: { select: { id: true, name: true, kind: true } } },
    });
    return this.shape(updated);
  }

  // ----------------------------------------------------------------- pool

  async listPasses(branchId: string, date: string) {
    const b = await this.hotel.branchContext(branchId);
    const passes = await this.prisma.poolPass.findMany({
      where: { branchId, sessionDate: dateOnly(date) },
      orderBy: { createdAt: 'desc' },
      include: { booking: { select: { code: true, room: { select: { number: true } } } } },
    });
    const slots = ['MORNING', 'AFTERNOON', 'EVENING'].map((slot) => {
      const used = passes.filter((p) => p.slot === slot && p.status !== 'CANCELLED').reduce((a, p) => a + p.adults + p.children, 0);
      return { slot, used, capacity: b.poolSlotCapacity };
    });
    return {
      date,
      rates: { adult: Number(b.poolAdultRate), child: Number(b.poolChildRate) },
      slots,
      passes: passes.map((p) => ({ ...p, sessionDate: date, amount: Number(p.amount) })),
    };
  }

  async createPass(branchId: string, userId: string, dto: z.infer<typeof poolPassSchema>) {
    if (dto.adults + dto.children < 1) throw new BadRequestException('Add at least one swimmer');
    const b = await this.hotel.branchContext(branchId);
    let bookingId: string | null = null;
    if (dto.guestType === 'HOTEL_GUEST') {
      if (!dto.bookingCode) throw new BadRequestException('Enter the guest booking ID');
      const bk = await this.prisma.booking.findFirst({ where: { branchId, code: dto.bookingCode.trim().toUpperCase(), status: 'CHECKED_IN' } });
      if (!bk) throw new BadRequestException('No checked-in guest with that booking ID');
      bookingId = bk.id;
    } else if (dto.paymentMethod === 'FOLIO' || dto.paymentMethod === 'INCLUDED') {
      throw new BadRequestException('Outside visitors must pay by cash, UPI or card');
    }
    const day = await this.listPasses(branchId, dto.sessionDate);
    const slot = day.slots.find((s) => s.slot === dto.slot)!;
    if (slot.used + dto.adults + dto.children > slot.capacity)
      throw new ConflictException(`${dto.slot.toLowerCase()} session is full (${slot.used}/${slot.capacity})`);
    const amount = dto.paymentMethod === 'INCLUDED' ? 0 : round2(dto.adults * Number(b.poolAdultRate) + dto.children * Number(b.poolChildRate));
    const pass = await this.prisma.poolPass.create({
      data: {
        branchId,
        code: `PL-${randomBytes(4).toString('hex').toUpperCase()}`,
        guestType: dto.guestType,
        bookingId,
        name: dto.name,
        phone: dto.phone,
        adults: dto.adults,
        children: dto.children,
        sessionDate: dateOnly(dto.sessionDate),
        slot: dto.slot,
        amount,
        paymentMethod: dto.paymentMethod,
      },
    });
    if (bookingId && dto.paymentMethod === 'FOLIO' && amount > 0) {
      await this.hotel.addCharge(branchId, bookingId, userId, {
        type: 'POOL',
        description: `Pool pass ${pass.code} – ${dto.adults}A/${dto.children}C ${dto.slot.toLowerCase()}`,
        amount,
        quantity: 1,
      });
    }
    return { ...pass, amount: Number(pass.amount) };
  }

  async setPassStatus(branchId: string, id: string, status: 'CHECKED_IN' | 'CANCELLED') {
    const r = await this.prisma.poolPass.updateMany({
      where: { id, branchId },
      data: { status, ...(status === 'CHECKED_IN' ? { checkedInAt: new Date() } : {}) },
    });
    if (!r.count) throw new NotFoundException('Pass not found');
    return { ok: true };
  }
}
