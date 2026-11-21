import { Prisma } from '@prisma/client';
import { distanceMetres, issueGeofencePass, verifyGeofencePass } from '../../common/geofence-pass';
import { HotelService, folioTotals } from './hotel.service';

const D = (n: number) => new Prisma.Decimal(n);

describe('folioTotals', () => {
  it('nets charges, discounts, payments and refunds', () => {
    const t = folioTotals([
      { type: 'ROOM', amount: D(6400) },
      { type: 'MEAL_PLAN', amount: D(700) },
      { type: 'TAX', amount: D(768) },
      { type: 'DISCOUNT', amount: D(500) },
      { type: 'PAYMENT', amount: D(2000) },
      { type: 'REFUND', amount: D(250) },
    ]);
    expect(t).toEqual({ charges: 7868, discounts: 500, total: 7368, paid: 1750, refunds: 250, balance: 5618 });
  });

  it('shows a negative balance when the guest overpaid', () => {
    expect(folioTotals([{ type: 'ROOM', amount: D(1000) }, { type: 'PAYMENT', amount: D(1200) }]).balance).toBe(-200);
  });

  it('counts room service and pool as charges', () => {
    const t = folioTotals([{ type: 'ROOM_SERVICE', amount: D(370) }, { type: 'POOL', amount: D(300) }]);
    expect(t.total).toBe(670);
  });

  it('avoids float drift on paise', () => {
    const t = folioTotals([{ type: 'EXTRA', amount: D(0.1) }, { type: 'EXTRA', amount: D(0.2) }]);
    expect(t.total).toBe(0.3);
  });
});

describe('HotelService.quote', () => {
  const category = { id: 'c1', branchId: 'b1', name: 'Double Bed Room', baseRate: D(3200), extraGuestRate: D(800), maxAdults: 2, taxRatePercent: D(12) };
  const plan = { id: 'p1', branchId: 'b1', code: 'CP', name: 'Room + Breakfast', pricePerNight: D(350) };
  const prisma = {
    roomCategory: { findFirst: jest.fn().mockResolvedValue(category) },
    mealPlan: { findFirst: jest.fn().mockResolvedValue(plan) },
  };
  const svc = new HotelService(prisma as never, {} as never, {} as never);

  it("matches the spec's worked example (Double + CP, 2 nights)", async () => {
    const q = await svc.quote('b1', { categoryId: 'c1', mealPlanId: 'p1', checkIn: '2026-12-03', checkOut: '2026-12-05', adults: 1, children: 0, discountAmount: 0 });
    expect(q.roomTotal).toBe(6400);
    expect(q.mealTotal).toBe(700);
    expect(q.roomTotal + q.mealTotal).toBe(7100);
    expect(q.tax).toBe(768);
    expect(q.grandTotal).toBe(7868);
  });

  it('charges meals per guest and an extra-adult supplement', async () => {
    const q = await svc.quote('b1', { categoryId: 'c1', mealPlanId: 'p1', checkIn: '2026-12-03', checkOut: '2026-12-04', adults: 3, children: 1, discountAmount: 0 });
    expect(q.roomRate).toBe(4000);
    expect(q.mealTotal).toBe(1400);
  });

  it('applies GST on the discounted room amount', async () => {
    const q = await svc.quote('b1', { categoryId: 'c1', checkIn: '2026-12-03', checkOut: '2026-12-04', adults: 2, children: 0, discountAmount: 200 });
    expect(q.tax).toBe(360);
    expect(q.grandTotal).toBe(3360);
  });

  it('rejects zero-night and over-capacity stays', async () => {
    await expect(svc.quote('b1', { categoryId: 'c1', checkIn: '2026-12-03', checkOut: '2026-12-03', adults: 1, children: 0, discountAmount: 0 })).rejects.toThrow('after check-in');
    await expect(svc.quote('b1', { categoryId: 'c1', checkIn: '2026-12-03', checkOut: '2026-12-04', adults: 4, children: 0, discountAmount: 0 })).rejects.toThrow('allows up to');
  });
});

describe('geo-fence pass', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-geofence-pass-0123456789';
  });

  it('accepts a fresh pass for the same user and branch only', () => {
    const now = Date.now();
    const pass = issueGeofencePass('u1', 'b1', now);
    expect(verifyGeofencePass(pass, 'u1', 'b1', now + 60_000)).toBe(true);
    expect(verifyGeofencePass(pass, 'u2', 'b1', now)).toBe(false);
    expect(verifyGeofencePass(pass, 'u1', 'b2', now)).toBe(false);
  });

  it('expires after 15 minutes', () => {
    const now = Date.now();
    const pass = issueGeofencePass('u1', 'b1', now);
    expect(verifyGeofencePass(pass, 'u1', 'b1', now + 16 * 60_000)).toBe(false);
  });

  it('rejects tampered or missing passes', () => {
    const pass = issueGeofencePass('u1', 'b1');
    const [, mac] = pass.split('.');
    const forged = `${Buffer.from(`u1.b1.${Date.now() + 9e9}`).toString('base64url')}.${mac}`;
    expect(verifyGeofencePass(forged, 'u1', 'b1')).toBe(false);
    expect(verifyGeofencePass(undefined, 'u1', 'b1')).toBe(false);
    expect(verifyGeofencePass('garbage', 'u1', 'b1')).toBe(false);
  });

  it('measures distance in metres', () => {
    expect(distanceMetres(26.9157, 70.9083, 26.916, 70.9085)).toBeLessThan(50);
    const d = distanceMetres(26.9157, 70.9083, 26.95, 70.95);
    expect(d).toBeGreaterThan(5000);
    expect(d).toBeLessThan(6000);
  });
});
