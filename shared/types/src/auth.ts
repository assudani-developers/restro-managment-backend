import { z } from "zod";

export const loginSchema = z.object({
  // Email, or a plain username for accounts created without one.
  email: z.string().trim().min(3, "Enter your email or username").max(160),
  password: z.string().min(8),
  // Authenticator code or recovery code, once two-factor auth is on.
  totp: z.string().trim().min(6).max(20).optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  restaurantName: z.string().min(1),
  branchName: z.string().min(1).default("Main Branch"),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  businessType: z.enum(["CAFE_QSR", "RESTAURANT", "CLOUD_KITCHEN", "HOTEL", "RESORT", "CHAIN"]).default("RESTAURANT"),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const BUSINESS_TYPES = [
  "CAFE_QSR",
  "RESTAURANT",
  "CLOUD_KITCHEN",
  "HOTEL",
  "RESORT",
  "CHAIN",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_MODULES = [
  "pos",
  "tokenDisplay",
  "qrMenu",
  "kiosk",
  "tables",
  "kds",
  "reservations",
  "delivery",
  "rooms",
  "bookings",
  "housekeeping",
  "roomService",
  "events",
  "pool",
  "spa",
  "activities",
  "transport",
  "inventory",
  "accounting",
  "chainDashboard",
  "centralMenuRates",
] as const;
export type BusinessModule = (typeof BUSINESS_MODULES)[number];

export const DEFAULT_MODULES_BY_BUSINESS: Record<BusinessType, readonly BusinessModule[]> = {
  CAFE_QSR: ["pos", "tokenDisplay", "qrMenu", "kiosk", "inventory"],
  RESTAURANT: ["pos", "tables", "kds", "reservations", "delivery", "qrMenu", "inventory", "accounting"],
  CLOUD_KITCHEN: ["pos", "kds", "delivery", "qrMenu", "inventory", "accounting"],
  HOTEL: ["pos", "rooms", "bookings", "housekeeping", "roomService", "kds", "inventory", "accounting"],
  RESORT: ["pos", "rooms", "bookings", "housekeeping", "roomService", "kds", "events", "pool", "spa", "activities", "transport", "inventory", "accounting"],
  CHAIN: ["chainDashboard", "centralMenuRates", "pos", "rooms", "bookings", "housekeeping", "roomService", "inventory", "accounting"],
};

export const pinLoginSchema = z.object({
  userId: z.string(),
  pin: z.string().min(4).max(8),
});
export type PinLoginDto = z.infer<typeof pinLoginSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  permissions: z.array(z.string()),
  isSuperAdmin: z.boolean().optional(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const twoFactorCodeSchema = z.object({ code: z.string().trim().min(6).max(20) });
export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(20),
});
