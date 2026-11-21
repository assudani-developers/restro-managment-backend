"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { use } from "react";
import { GuestMenu, Splash, type GuestBrand, type GuestCategory, type TrackedOrder } from "@/components/guest/guest-menu";
import { api, ApiError } from "@/lib/api";

interface PublicMenuResponse {
  branchName: string;
  tableName: string;
  brand: GuestBrand;
  categories: GuestCategory[];
}

interface PublicStatus {
  order: {
    orderNumber: string;
    status: string;
    totalAmount: string;
    items: { id: string; nameSnapshot: string; quantity: number; status: string }[];
  } | null;
  openRequests: ("WAITER" | "BILL")[];
}

function stageOf(items: { status: string }[], status: string): TrackedOrder["stage"] {
  if (status === "CANCELLED") return "CANCELLED";
  const live = items.filter((i) => i.status !== "CANCELLED");
  if (live.length && live.every((i) => i.status === "SERVED")) return "DELIVERED";
  if (live.some((i) => i.status === "READY")) return "ON_THE_WAY";
  if (live.some((i) => i.status === "PREPARING")) return "PREPARING";
  return "RECEIVED";
}

export default function TableQrPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = use(params);
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["public-menu", qrToken],
    queryFn: () => api.get<PublicMenuResponse>(`/public/menu/${qrToken}`),
    retry: false,
  });
  const { data: status } = useQuery({
    queryKey: ["public-status", qrToken],
    queryFn: () => api.get<PublicStatus>(`/public/menu/${qrToken}/status`),
    refetchInterval: 8000,
    enabled: !!data,
  });

  if (isLoading) return <Splash />;
  if (error || !data)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FBF7F1] px-8 text-center">
        <UtensilsCrossed className="h-10 w-10 text-[#A8957D]" />
        <p className="font-display text-xl font-semibold">This QR code isn&apos;t recognised</p>
        <p className="text-sm text-[#7A6A59]">{error instanceof ApiError ? error.message : "Please ask a member of staff."}</p>
      </div>
    );

  const o = status?.order;
  const orders: TrackedOrder[] = o
    ? [{ id: o.orderNumber, orderNumber: o.orderNumber, stage: stageOf(o.items, o.status), totalAmount: Number(o.totalAmount), items: o.items }]
    : [];
  const request = async (type: "WAITER" | "BILL") => {
    await api.post(`/public/menu/${qrToken}/request`, { type });
    void qc.invalidateQueries({ queryKey: ["public-status", qrToken] });
  };

  return (
    <GuestMenu
      brand={data.brand}
      mode="table"
      kicker="Dine-in"
      place={data.tableName}
      categories={data.categories}
      orders={orders}
      requests={[
        { key: "WAITER", label: "Call waiter", done: status?.openRequests.includes("WAITER"), onRequest: () => request("WAITER") },
        { key: "BILL", label: "Ask for bill", done: status?.openRequests.includes("BILL"), onRequest: () => request("BILL") },
      ]}
      onPlace={async (a) => {
        const r = await api.post<{ orderNumber: string }>(`/public/menu/${qrToken}/order`, { guestName: a.guestName, items: a.items });
        void qc.invalidateQueries({ queryKey: ["public-status", qrToken] });
        return r;
      }}
    />
  );
}
