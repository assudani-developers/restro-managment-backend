import { z } from 'zod';

const money = z.coerce.number().min(0).max(10_000_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm');
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB colour');

export const roomCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(12).toUpperCase(),
  bedType: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'KING', 'SUITE']).default('DOUBLE'),
  baseRate: money,
  extraGuestRate: money.default(0),
  maxAdults: z.coerce.number().int().min(1).max(12).default(2),
  maxChildren: z.coerce.number().int().min(0).max(12).default(1),
  taxRatePercent: z.coerce.number().min(0).max(40).default(12),
  amenities: z.array(z.string().trim().max(40)).max(30).default([]),
  description: z.string().max(600).optional().nullable(),
  imageUrl: z.string().max(600).optional().nullable(),
  isActive: z.boolean().default(true),
});
export const roomCategoryUpdateSchema = roomCategorySchema.partial();

export const mealPlanSchema = z.object({
  code: z.string().trim().min(1).max(8).toUpperCase(),
  name: z.string().trim().min(1).max(80),
  pricePerNight: money,
  includesBreakfast: z.boolean().default(false),
  includesLunch: z.boolean().default(false),
  includesDinner: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export const mealPlanUpdateSchema = mealPlanSchema.partial();

export const roomSchema = z.object({
  number: z.string().trim().min(1).max(12),
  categoryId: z.string().min(1),
  floorLabel: z.string().trim().max(40).optional().nullable(),
  notes: z.string().max(400).optional().nullable(),
});
export const roomBulkSchema = z.object({
  categoryId: z.string().min(1),
  floorLabel: z.string().trim().max(40).optional().nullable(),
  numbers: z.array(z.string().trim().min(1).max(12)).min(1).max(200),
});
export const roomUpdateSchema = roomSchema.partial().extend({ isActive: z.boolean().optional() });

export const roomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'DIRTY', 'INSPECTION', 'MAINTENANCE']),
  note: z.string().max(300).optional(),
});

export const quoteSchema = z.object({
  categoryId: z.string().min(1),
  mealPlanId: z.string().optional().nullable(),
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.coerce.number().int().min(1).max(12).default(2),
  children: z.coerce.number().int().min(0).max(12).default(0),
  discountAmount: money.default(0),
});

export const bookingSchema = quoteSchema.extend({
  source: z.enum(['RECEPTION', 'WEBSITE', 'OTA', 'PHONE', 'WALK_IN']).default('RECEPTION'),
  otaName: z.string().max(60).optional().nullable(),
  otaReference: z.string().max(80).optional().nullable(),
  otaCommissionPercent: z.coerce.number().min(0).max(50).default(0),
  roomId: z.string().optional().nullable(),
  guestName: z.string().trim().min(1).max(120),
  guestPhone: z.string().trim().max(20).optional().nullable(),
  guestEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal('')),
  guestAddress: z.string().max(300).optional().nullable(),
  arrivalTime: z.string().max(10).optional().nullable(),
  specialRequests: z.string().max(600).optional().nullable(),
  consentMessages: z.boolean().default(true),
  advance: z
    .object({
      amount: money,
      method: z.enum(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'PAYMENT_LINK', 'OTA']),
      reference: z.string().max(80).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const checkInSchema = z.object({
  roomId: z.string().min(1),
  guestIdType: z.string().max(30).optional().nullable(),
  guestIdNumber: z.string().max(40).optional().nullable(),
});

export const folioChargeSchema = z.object({
  type: z.enum(['EXTRA', 'ROOM_SERVICE', 'RESTAURANT', 'POOL', 'EVENT', 'DISCOUNT']),
  description: z.string().trim().min(1).max(160),
  amount: money.refine((v) => v > 0, 'Amount must be more than 0'),
  quantity: z.coerce.number().min(0.01).max(1000).default(1),
});

export const folioPaymentSchema = z.object({
  amount: money.refine((v) => v > 0, 'Amount must be more than 0'),
  method: z.enum(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'PAYMENT_LINK', 'OTA']),
  reference: z.string().max(80).optional().nullable(),
  refund: z.boolean().default(false),
  idempotencyKey: z.string().max(80).optional(),
});

export const cancelSchema = z.object({ reason: z.string().trim().min(1).max(300) });

export const hotelSettingsSchema = z.object({
  hotelName: z.string().trim().min(1).max(120).optional(),
  businessType: z.enum(['CAFE_QSR', 'RESTAURANT', 'CLOUD_KITCHEN', 'HOTEL', 'RESORT', 'CHAIN']).optional(),
  enabledModules: z.array(z.string().min(1)).optional(),
  tagline: z.string().max(140).optional().nullable(),
  logoUrl: z.string().max(600).optional().nullable(),
  coverImageUrl: z.string().max(600).optional().nullable(),
  brandColor: hex.optional(),
  accentColor: hex.optional(),
  upiVpa: z.string().max(80).optional().nullable(),
  upiPayeeName: z.string().max(80).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  geofenceEnabled: z.boolean().optional(),
  geofenceRadiusM: z.coerce.number().int().min(50).max(5000).optional(),
  checkInTime: hhmm.optional(),
  checkOutTime: hhmm.optional(),
  checkoutSoonHours: z.coerce.number().int().min(1).max(12).optional(),
  roomMenuMode: z.enum(['SYNCED', 'SEPARATE']).optional(),
  roomServiceCharge: money.optional(),
  wifiName: z.string().max(60).optional().nullable(),
  wifiPassword: z.string().max(60).optional().nullable(),
  poolAdultRate: money.optional(),
  poolChildRate: money.optional(),
  poolSlotCapacity: z.coerce.number().int().min(1).max(2000).optional(),
});

export const geofenceCheckSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(100_000).optional(),
});

export const roomMenuItemSchema = z.object({
  roomServiceEnabled: z.boolean().optional(),
  roomServicePrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  isSoldOut: z.boolean().optional(),
});

export const venueSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['MARRIAGE_GARDEN', 'LAWN', 'BANQUET', 'MEETING_HALL']),
  capacity: z.coerce.number().int().min(1).max(20000),
  baseRate: money.default(0),
  perPlateRate: money.default(0),
  description: z.string().max(400).optional().nullable(),
  isActive: z.boolean().default(true),
});
export const venueUpdateSchema = venueSchema.partial();

const serviceLine = z.object({ name: z.string().trim().min(1).max(80), amount: money });

export const eventSchema = z.object({
  venueId: z.string().min(1),
  eventType: z.enum(['WEDDING', 'RECEPTION', 'BIRTHDAY', 'CORPORATE', 'CONFERENCE', 'OTHER']),
  status: z.enum(['ENQUIRY', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).default('ENQUIRY'),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().max(20).optional().nullable(),
  customerEmail: z.string().max(160).optional().nullable(),
  eventDate: isoDate,
  startTime: hhmm.default('18:00'),
  endTime: hhmm.default('23:00'),
  guestCount: z.coerce.number().int().min(1).max(20000),
  packageName: z.string().max(80).optional().nullable(),
  services: z.array(serviceLine).max(40).default([]),
  venueCharge: money.default(0),
  cateringPerPlate: money.default(0),
  taxRatePercent: z.coerce.number().min(0).max(40).default(18),
  roomBlockCount: z.coerce.number().int().min(0).max(500).default(0),
  notes: z.string().max(1000).optional().nullable(),
});
export const eventUpdateSchema = eventSchema.partial();
export const eventPaymentSchema = z.object({
  amount: money.refine((v) => v > 0, 'Amount must be more than 0'),
  method: z.enum(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'PAYMENT_LINK']),
  reference: z.string().max(80).optional().nullable(),
});

export const poolPassSchema = z.object({
  guestType: z.enum(['HOTEL_GUEST', 'VISITOR']),
  bookingCode: z.string().max(40).optional().nullable(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(20).optional().nullable(),
  adults: z.coerce.number().int().min(0).max(50),
  children: z.coerce.number().int().min(0).max(50),
  sessionDate: isoDate,
  slot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'FOLIO', 'INCLUDED']),
});

export const templateSchema = z.object({
  trigger: z.string().min(1).max(40),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']),
  body: z.string().trim().min(1).max(1500),
  isActive: z.boolean().default(true),
});

export const publicRoomOrderSchema = z.object({
  guestName: z.string().trim().max(80).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(50),
        modifierIds: z.array(z.string()).max(20).default([]),
        notes: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(60),
  chargeToRoom: z.boolean().default(false),
  stayPin: z.string().max(8).optional(),
  notes: z.string().max(300).optional(),
});
