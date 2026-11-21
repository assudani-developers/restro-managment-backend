"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble } from "lucide-react";
import { use } from "react";
import { GuestMenu, Splash, type GuestBrand, type GuestCategory, type TrackedOrder } from "@/components/guest/guest-menu";
import { api, ApiError } from "@/lib/api";

interface RoomMenuResponse {
  brand: GuestBrand;
  room: { number: string; category: string };
  menuMode: "SYNCED" | "SEPARATE";
  serviceCharge: number;
  facilities: { wifiName: string | null; wifiPassword: string | null; checkOutTime: string; phone: string | null };
  stay: { guestFirstName: string; checkOut: string; canChargeToRoom: boolean } | null;
  categories: GuestCategory[];
}

export default function RoomServicePage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = use(params);
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["guest-room", qrToken],
    queryFn: () => api.get<RoomMenuResponse>(`/public/hotel/room/${qrToken}`),
    retry: false,
    refetchInterval: 60_000,
  });
  const { data: orders } = useQuery({
    queryKey: ["guest-room-orders", qrToken],
    queryFn: () =>
      api.get<(TrackedOrder & { folioPostedAt: string | null })[]>(`/public/hotel/room/${qrToken}/orders`),
    enabled: !!data,
    refetchInterval: 8_000,
  });

  if (isLoading) return <Splash />;
  if (error || !data)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FBF7F1] px-8 text-center">
        <BedDouble className="h-10 w-10 text-[#A8957D]" />
        <p className="font-display text-xl font-semibold">This room code isn&apos;t active</p>
        <p className="text-sm text-[#7A6A59]">{error instanceof ApiError ? error.message : "Please call reception for help."}</p>
      </div>
    );

  const request = (kind: string) => api.post(`/public/hotel/room/${qrToken}/request`, { kind });

  return (
    <GuestMenu
      brand={data.brand}
      mode="room"
      kicker="In-room dining"
      place={`Room ${data.room.number}`}
      greeting={data.stay ? `Welcome, ${data.stay.guestFirstName}` : data.brand.hotelName}
      categories={data.categories}
      canChargeToRoom={!!data.stay?.canChargeToRoom}
      wifi={data.facilities.wifiName ? { name: data.facilities.wifiName, password: data.facilities.wifiPassword } : null}
      serviceCharge={data.serviceCharge}
      orders={(orders ?? []).map((o) => ({ ...o, onFolio: !!o.folioPostedAt }))}
      requests={[
        { key: "HOUSEKEEPING", label: "Housekeeping", onRequest: () => request("HOUSEKEEPING") },
        { key: "TOWELS", label: "Fresh towels", onRequest: () => request("TOWELS") },
        { key: "WATER", label: "Drinking water", onRequest: () => request("WATER") },
        { key: "LATE_CHECKOUT", label: "Late checkout", onRequest: () => request("LATE_CHECKOUT") },
        { key: "RECEPTION", label: "Call reception", onRequest: () => request("RECEPTION") },
      ]}
      onPlace={async (a) => {
        const r = await api.post<{ orderNumber: string; chargedToRoom: boolean }>(`/public/hotel/room/${qrToken}/order`, {
          items: a.items,
          guestName: a.guestName || undefined,
          chargeToRoom: a.chargeToRoom,
          stayPin: a.stayPin,
          notes: a.notes,
        });
        void qc.invalidateQueries({ queryKey: ["guest-room-orders", qrToken] });
        return r;
      }}
    />
  );
}

