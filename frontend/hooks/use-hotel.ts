"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ---------------------------------------------------------------- types

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "INSPECTION" | "MAINTENANCE";
export type BoardStatus = RoomStatus | "BOOKED" | "CHECKOUT_SOON";
export type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
export type BookingSource = "RECEPTION" | "WEBSITE" | "OTA" | "PHONE" | "WALK_IN";
export type PayMethod = "UPI" | "CASH" | "CARD" | "BANK_TRANSFER" | "PAYMENT_LINK" | "OTA";

export interface HotelSettings {
  hotelName: string;
  businessType: "CAFE_QSR" | "RESTAURANT" | "CLOUD_KITCHEN" | "HOTEL" | "RESORT" | "CHAIN";
  enabledModules: string[];
  tagline: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string;
  accentColor: string;
  upiVpa: string | null;
  upiPayeeName: string | null;
  currency: string;
  timezone: string;
  branchName: string;
  address: string | null;
  phone: string | null;
  gstNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  geofenceEnabled: boolean;
  geofenceRadiusM: number;
  checkInTime: string;
  checkOutTime: string;
  checkoutSoonHours: number;
  roomMenuMode: "SYNCED" | "SEPARATE";
  roomServiceCharge: number;
  wifiName: string | null;
  wifiPassword: string | null;
  poolAdultRate: number;
  poolChildRate: number;
  poolSlotCapacity: number;
}

export interface RoomCategory {
  id: string;
  name: string;
  code: string;
  bedType: string;
  baseRate: string;
  extraGuestRate: string;
  maxAdults: number;
  maxChildren: number;
  taxRatePercent: string;
  amenities: string[];
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  _count?: { rooms: number };
}

export interface MealPlan {
  id: string;
  code: string;
  name: string;
  pricePerNight: string;
  includesBreakfast: boolean;
  includesLunch: boolean;
  includesDinner: boolean;
  isActive: boolean;
}

export interface BoardRoom {
  id: string;
  number: string;
  floorLabel: string | null;
  status: RoomStatus;
  display: BoardStatus;
  statusSince: string;
  notes: string | null;
  qrToken: string;
  category: { id: string; name: string; code: string; bedType: string; baseRate: number };
  current: null | {
    id: string; code: string; guestName: string; guestPhone: string | null; checkIn: string; checkOut: string;
    adults: number; children: number; source: BookingSource; balance: number; mealPlan: { code: string } | null;
  };
  next: null | { id: string; code: string; guestName: string; checkIn: string; checkOut: string };
}

export interface Board {
  today: string;
  checkOutTime: string;
  rooms: BoardRoom[];
  counts: Partial<Record<BoardStatus, number>>;
  arrivals: { id: string; code: string; guestName: string; category: string; room: string | null; checkIn: string; arrivalTime: string | null }[];
  departures: { id: string; code: string; guestName: string; room: string | null; checkOut: string }[];
}

export interface Totals {
  charges: number;
  discounts: number;
  total: number;
  paid: number;
  refunds: number;
  balance: number;
}

export interface BookingRow extends Totals {
  id: string;
  code: string;
  status: BookingStatus;
  source: BookingSource;
  otaName: string | null;
  guestName: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  category: { name: string };
  room: { number: string } | null;
  mealPlan: { code: string } | null;
  createdAt: string;
}

export interface FolioEntry {
  id: string;
  type: string;
  description: string;
  amount: string;
  quantity: string;
  method: string | null;
  reference: string | null;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  trigger: string;
  channel: string;
  recipient: string;
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
  bookingId: string | null;
}

export interface BookingDetail {
  id: string;
  code: string;
  status: BookingStatus;
  source: BookingSource;
  otaName: string | null;
  otaReference: string | null;
  otaCommissionPercent: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  guestAddress: string | null;
  guestIdType: string | null;
  guestIdNumber: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  arrivalTime: string | null;
  specialRequests: string | null;
  roomRate: string;
  mealRate: string;
  stayPin: string;
  guestLink: string;
  category: RoomCategory;
  room: { id: string; number: string } | null;
  mealPlan: MealPlan | null;
  folio: FolioEntry[];
  totals: Totals;
  notifications: NotificationLog[];
  orders: { id: string; orderNumber: string; status: string; totalAmount: string; folioPostedAt: string | null; createdAt: string; items: { nameSnapshot: string; quantity: number }[] }[];
  entitlement: { plan: string; breakfast: number; lunch: number; dinner: number };
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface Quote {
  nights: number;
  category: { id: string; name: string };
  mealPlan: { id: string; code: string; name: string } | null;
  roomRate: number;
  mealRate: number;
  roomTotal: number;
  mealTotal: number;
  discount: number;
  taxRatePercent: number;
  tax: number;
  grandTotal: number;
}

export interface Availability {
  categoryId: string;
  name: string;
  code: string;
  bedType: string;
  baseRate: number;
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  imageUrl: string | null;
  totalRooms: number;
  available: number;
}

export interface Venue {
  id: string;
  name: string;
  kind: string;
  capacity: number;
  baseRate: string;
  perPlateRate: string;
  description: string | null;
  isActive: boolean;
}

export interface EventBooking {
  id: string;
  code: string;
  venueId: string;
  venue: { id: string; name: string; kind: string };
  eventType: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  packageName: string | null;
  services: { name: string; amount: number }[];
  venueCharge: string;
  cateringPerPlate: string;
  taxRatePercent: string;
  payments: { amount: number; method: string; reference?: string | null; at: string }[];
  roomBlockCount: number;
  notes: string | null;
  totals: { catering: number; serviceTotal: number; subtotal: number; tax: number; total: number; paid: number; balance: number };
}

export interface PoolDay {
  date: string;
  rates: { adult: number; child: number };
  slots: { slot: string; used: number; capacity: number }[];
  passes: {
    id: string; code: string; guestType: string; name: string; phone: string | null; adults: number; children: number;
    slot: string; amount: number; paymentMethod: string | null; status: string; checkedInAt: string | null;
    booking: { code: string; room: { number: string } | null } | null;
  }[];
}

export interface Analytics {
  from: string;
  to: string;
  totalRooms: number;
  paymentMix: { method: string; amount: number; percent: number }[];
  occupancy: { date: string; occupied: number; reserved: number; available: number; maintenance: number }[];
  departments: { name: string; amount: number }[];
  revenueTrend: { date: string; amount: number }[];
  sources: { source: string; count: number }[];
  kpis: {
    occupancyPercent: number; adr: number; revpar: number; roomNightsSold: number; cancellationRate: number;
    otaGross: number; otaCommission: number; otaNet: number; outstanding: number; totalCollected: number;
  };
}

export interface RoomServiceData {
  orders: {
    id: string; orderNumber: string; room: string; roomId: string; bookingId: string | null; status: string;
    guestName: string | null; totalAmount: number; folioPostedAt: string | null; createdAt: string; notes: string | null;
    kitchen: "NEW" | "PREPARING" | "READY" | "SERVED";
    items: { id: string; nameSnapshot: string; quantity: number; status: string }[];
  }[];
  rooms: { room: string; orders: number; delivered: number; pending: number; unbilled: number }[];
}

export interface RoomMenuItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  roomServiceEnabled: boolean;
  roomServicePrice: string | null;
  isSoldOut: boolean;
  category: { id: string; name: string };
}

export interface NotificationTemplate {
  id: string;
  trigger: string;
  channel: string;
  body: string;
  isActive: boolean;
}

// ---------------------------------------------------------------- helpers

const q = (branchId: string | null, extra: Record<string, string | undefined> = {}) => {
  const p = new URLSearchParams({ branchId: branchId ?? "" });
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
};

function useHotelMutation<TVars, TOut = unknown>(
  fn: (vars: TVars) => Promise<TOut>,
  success?: string | ((out: TOut) => string),
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (out) => {
      void qc.invalidateQueries({ queryKey: ["hotel"] });
      if (success) toast.success(typeof success === "function" ? success(out) : success);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------- settings

export function useHotelSettings(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "settings", branchId],
    queryFn: () => api.get<HotelSettings>(`/hotel/settings?${q(branchId)}`),
    enabled: !!branchId,
    staleTime: 60_000,
  });
}

export function useUpdateHotelSettings(branchId: string | null) {
  return useHotelMutation(
    (dto: Partial<HotelSettings> & { hotelName?: string }) => api.patch<HotelSettings>(`/hotel/settings?${q(branchId)}`, dto),
    "Saved",
  );
}

// ---------------------------------------------------------------- setup

export function useRoomCategories(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "categories", branchId],
    queryFn: () => api.get<RoomCategory[]>(`/hotel/categories?${q(branchId)}`),
    enabled: !!branchId,
  });
}
export function useSaveCategory(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: Record<string, unknown> & { id?: string }) =>
      id ? api.patch(`/hotel/categories/${id}?${q(branchId)}`, dto) : api.post(`/hotel/categories?${q(branchId)}`, dto),
    "Room type saved",
  );
}
export function useDeleteCategory(branchId: string | null) {
  return useHotelMutation((id: string) => api.delete(`/hotel/categories/${id}?${q(branchId)}`), "Room type removed");
}

export function useMealPlans(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "meal-plans", branchId],
    queryFn: () => api.get<MealPlan[]>(`/hotel/meal-plans?${q(branchId)}`),
    enabled: !!branchId,
  });
}
export function useSaveMealPlan(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: Record<string, unknown> & { id?: string }) =>
      id ? api.patch(`/hotel/meal-plans/${id}?${q(branchId)}`, dto) : api.post(`/hotel/meal-plans?${q(branchId)}`, dto),
    "Meal plan saved",
  );
}
export function useDeleteMealPlan(branchId: string | null) {
  return useHotelMutation((id: string) => api.delete(`/hotel/meal-plans/${id}?${q(branchId)}`), "Meal plan removed");
}

export function useCreateRooms(branchId: string | null) {
  return useHotelMutation(
    (dto: { categoryId: string; floorLabel?: string; numbers: string[] }) => api.post<{ created: number }>(`/hotel/rooms/bulk?${q(branchId)}`, dto),
    (o) => `${o.created} room(s) added`,
  );
}
export function useUpdateRoom(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: { id: string; number?: string; categoryId?: string; floorLabel?: string | null; notes?: string | null }) =>
      api.patch(`/hotel/rooms/${id}?${q(branchId)}`, dto),
    "Room updated",
  );
}
export function useDeleteRoom(branchId: string | null) {
  return useHotelMutation((id: string) => api.delete(`/hotel/rooms/${id}?${q(branchId)}`), "Room removed");
}
export function useRotateRoomQr(branchId: string | null) {
  return useHotelMutation((id: string) => api.post(`/hotel/rooms/${id}/rotate-qr?${q(branchId)}`), "New QR issued — reprint this room's card");
}

// ---------------------------------------------------------------- board

export function useBoard(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "board", branchId],
    queryFn: () => api.get<Board>(`/hotel/board?${q(branchId)}`),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
}

export function useRoomStatus(branchId: string | null) {
  return useHotelMutation(
    ({ id, status, note }: { id: string; status: RoomStatus; note?: string }) =>
      api.patch(`/hotel/rooms/${id}/status?${q(branchId)}`, { status, note }),
    "Room status updated",
  );
}

// ---------------------------------------------------------------- bookings

export function useAvailability(branchId: string | null, checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: ["hotel", "availability", branchId, checkIn, checkOut],
    queryFn: () => api.get<Availability[]>(`/hotel/availability?${q(branchId, { checkIn, checkOut })}`),
    enabled: !!branchId && !!checkIn && !!checkOut && checkOut > checkIn,
  });
}

export function useFreeRooms(branchId: string | null, categoryId: string | null, checkIn: string, checkOut: string, exclude?: string) {
  return useQuery({
    queryKey: ["hotel", "free-rooms", branchId, categoryId, checkIn, checkOut, exclude],
    queryFn: () =>
      api.get<{ id: string; number: string; status: RoomStatus; category: { name: string } }[]>(
        `/hotel/free-rooms?${q(branchId, { categoryId: categoryId ?? undefined, checkIn, checkOut, exclude })}`,
      ),
    enabled: !!branchId && !!checkIn && !!checkOut,
  });
}

export function useQuote(branchId: string | null, dto: Record<string, unknown> | null) {
  return useQuery({
    queryKey: ["hotel", "quote", branchId, dto],
    queryFn: () => api.post<Quote>(`/hotel/quote?${q(branchId)}`, dto),
    enabled: !!branchId && !!dto,
    retry: false,
  });
}

export function useBookings(branchId: string | null, filters: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["hotel", "bookings", branchId, filters],
    queryFn: () => api.get<BookingRow[]>(`/hotel/bookings?${q(branchId, filters)}`),
    enabled: !!branchId,
  });
}

export function useBooking(branchId: string | null, id: string | null) {
  return useQuery({
    queryKey: ["hotel", "booking", branchId, id],
    queryFn: () => api.get<BookingDetail>(`/hotel/bookings/${id}?${q(branchId)}`),
    enabled: !!branchId && !!id,
  });
}

export function useCreateBooking(branchId: string | null) {
  return useHotelMutation(
    (dto: Record<string, unknown>) => api.post<BookingDetail>(`/hotel/bookings?${q(branchId)}`, dto),
    (b) => `Booking ${b.code} confirmed`,
  );
}

export function useBookingAction(branchId: string | null, id: string | null) {
  return useHotelMutation(
    ({ action, body }: { action: string; body?: unknown }) =>
      api.post<BookingDetail>(`/hotel/bookings/${id}/${action}?${q(branchId)}`, body ?? {}),
  );
}

export function usePostOrderToFolio(branchId: string | null) {
  return useHotelMutation(
    ({ orderId, bookingId }: { orderId: string; bookingId?: string }) =>
      api.post(`/hotel/orders/${orderId}/post-to-folio?${q(branchId)}`, { bookingId }),
    "Charged to the guest folio",
  );
}

// ---------------------------------------------------------------- room service

export function useRoomService(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "room-service", branchId],
    queryFn: () => api.get<RoomServiceData>(`/hotel/room-service?${q(branchId)}`),
    enabled: !!branchId,
    refetchInterval: 20_000,
  });
}

export function useRoomMenu(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "room-menu", branchId],
    queryFn: () => api.get<RoomMenuItem[]>(`/hotel/room-menu?${q(branchId)}`),
    enabled: !!branchId,
  });
}

export function useUpdateRoomMenuItem(branchId: string | null) {
  return useHotelMutation(({ id, ...dto }: { id: string; roomServiceEnabled?: boolean; roomServicePrice?: number | null; isSoldOut?: boolean }) =>
    api.patch(`/hotel/room-menu/${id}?${q(branchId)}`, dto),
  );
}

// ---------------------------------------------------------------- notifications

export function useTemplates(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "templates", branchId],
    queryFn: () => api.get<NotificationTemplate[]>(`/hotel/notification-templates?${q(branchId)}`),
    enabled: !!branchId,
  });
}
export function useSaveTemplate(branchId: string | null) {
  return useHotelMutation(
    (dto: { trigger: string; channel: string; body: string; isActive: boolean }) => api.put(`/hotel/notification-templates?${q(branchId)}`, dto),
    "Template saved",
  );
}
export function useNotificationLogs(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "logs", branchId],
    queryFn: () => api.get<NotificationLog[]>(`/hotel/notification-logs?${q(branchId)}`),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
}
export function useMarkLog(branchId: string | null) {
  return useHotelMutation(({ id, status }: { id: string; status: "SENT" | "FAILED" }) =>
    api.patch(`/hotel/notification-logs/${id}?${q(branchId)}`, { status }),
  );
}

// ---------------------------------------------------------------- analytics

export function useHotelAnalytics(branchId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ["hotel", "analytics", branchId, from, to],
    queryFn: () => api.get<Analytics>(`/hotel/analytics?${q(branchId, { from, to })}`),
    enabled: !!branchId,
    refetchInterval: 60_000,
  });
}

// ---------------------------------------------------------------- events & pool

export function useVenues(branchId: string | null) {
  return useQuery({
    queryKey: ["hotel", "venues", branchId],
    queryFn: () => api.get<Venue[]>(`/hotel/venues?${q(branchId)}`),
    enabled: !!branchId,
  });
}
export function useSaveVenue(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: Record<string, unknown> & { id?: string }) =>
      id ? api.patch(`/hotel/venues/${id}?${q(branchId)}`, dto) : api.post(`/hotel/venues?${q(branchId)}`, dto),
    "Venue saved",
  );
}
export function useEvents(branchId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ["hotel", "events", branchId, from, to],
    queryFn: () => api.get<EventBooking[]>(`/hotel/events?${q(branchId, { from, to })}`),
    enabled: !!branchId,
  });
}
export function useSaveEvent(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: Record<string, unknown> & { id?: string }) =>
      id ? api.patch<EventBooking>(`/hotel/events/${id}?${q(branchId)}`, dto) : api.post<EventBooking>(`/hotel/events?${q(branchId)}`, dto),
    (e) => `Event ${e.code} saved`,
  );
}
export function useEventPayment(branchId: string | null) {
  return useHotelMutation(
    ({ id, ...dto }: { id: string; amount: number; method: string; reference?: string }) => api.post(`/hotel/events/${id}/payments?${q(branchId)}`, dto),
    "Payment recorded",
  );
}
export function usePool(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ["hotel", "pool", branchId, date],
    queryFn: () => api.get<PoolDay>(`/hotel/pool?${q(branchId, { date })}`),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
}
export function useCreatePass(branchId: string | null) {
  return useHotelMutation(
    (dto: Record<string, unknown>) => api.post<{ code: string }>(`/hotel/pool?${q(branchId)}`, dto),
    (p) => `Pass ${p.code} issued`,
  );
}
export function usePassStatus(branchId: string | null) {
  return useHotelMutation(({ id, status }: { id: string; status: "CHECKED_IN" | "CANCELLED" }) =>
    api.patch(`/hotel/pool/${id}?${q(branchId)}`, { status }),
  );
}
