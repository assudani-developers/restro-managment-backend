"use client";

import { useQuery } from "@tanstack/react-query";
import { BedDouble, CalendarDays, Coffee, Copy, MapPin, Phone, Receipt, UtensilsCrossed, Wifi } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useEffect, useRef } from "react";
import { Splash, type GuestBrand } from "@/components/guest/guest-menu";
import { applyBrand } from "@/components/hotel/brand-theme";
import { api, ApiError } from "@/lib/api";
import { buildUpiUri } from "@/lib/upi";
import { cn } from "@/lib/utils";

interface StayResponse {
  brand: GuestBrand;
  upi: { vpa: string; payee: string } | null;
  hotel: { address: string | null; phone: string | null; gstNumber: string | null; checkInTime: string; checkOutTime: string; latitude: number | null; longitude: number | null; wifiName: string | null; wifiPassword: string | null };
  booking: {
    code: string; status: string; guestName: string; checkIn: string; checkOut: string; nights: number; adults: number; children: number;
    roomType: string; amenities: string[]; room: string | null; roomQrToken: string | null;
    mealPlan: { code: string; name: string; breakfast: boolean; lunch: boolean; dinner: boolean } | null;
  };
  folio: { id: string; type: string; description: string; amount: number; method: string | null; createdAt: string }[];
  totals: { total: number; paid: number; balance: number };
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const d = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const STATUS: Record<string, string> = { CONFIRMED: "Confirmed", CHECKED_IN: "In house", CHECKED_OUT: "Checked out", CANCELLED: "Cancelled", NO_SHOW: "No-show" };

export default function StayPortal({ params }: { params: Promise<{ guestToken: string }> }) {
  const { guestToken } = use(params);
  const ref = useRef<HTMLDivElement>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ["stay", guestToken],
    queryFn: () => api.get<StayResponse>(`/public/hotel/stay/${guestToken}`),
    retry: false,
    refetchInterval: 30_000,
  });
  useEffect(() => {
    if (ref.current && data) applyBrand(ref.current, data.brand.brandColor, data.brand.accentColor);
  }, [data]);

  if (isLoading) return <Splash />;
  if (error || !data)
    return <div className="flex min-h-dvh items-center justify-center bg-[#FBF7F1] p-8 text-center text-sm text-[#7A6A59]">{error instanceof ApiError ? error.message : "This link is not valid."}</div>;

  const { brand, booking: b, totals: t } = data;
  const balance = Math.max(0, t.balance);
  const upi = data.upi && balance > 0 && b.status !== "CANCELLED" ? buildUpiUri({ vpa: data.upi.vpa, name: data.upi.payee, amount: balance, note: `Booking ${b.code}` }) : null;
  const maps = data.hotel.latitude != null ? `https://www.google.com/maps/search/?api=1&query=${data.hotel.latitude},${data.hotel.longitude}` : data.hotel.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.hotel.address)}` : null;
  const card = "rounded-[1.6rem] bg-white p-5 shadow-[0_6px_24px_-14px_rgb(60_35_20/0.35)]";
  const rise = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <div ref={ref} className="min-h-dvh bg-[#FBF7F1] pb-16 text-[#1E1712]">
      <div className="relative overflow-hidden px-5 pt-10 pb-24 text-[#FFF8F0]" style={{ background: brand.coverImageUrl ? undefined : `linear-gradient(155deg, ${brand.brandColor}, #17110D 80%)` }}>
        {brand.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#17110D]/85" />
                <motion.div {...rise(0)} className="relative mx-auto max-w-xl">
          <p className="text-sm font-medium" style={{ color: brand.accentColor }}>{brand.hotelName}</p>
          <h1 className="mt-2 font-display text-[2.2rem] leading-tight font-semibold">Hello, {b.guestName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-white/75">{brand.tagline ?? ""}</p>
        </motion.div>
      </div>

      <div className="relative mx-auto -mt-16 max-w-xl space-y-4 px-4">
        <motion.div {...rise(1)} className={card}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs tracking-wider text-[#7A6A59]">{b.code}</p>
              <p className="mt-1 font-display text-xl font-semibold">{b.roomType}{b.room ? ` · Room ${b.room}` : ""}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", b.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{STATUS[b.status] ?? b.status}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#FBF7F1] p-3 text-sm">
            <div>
              <p className="text-[10px] text-[#7A6A59]">Check-in</p>
              <p className="font-semibold">{d(b.checkIn)}</p>
              <p className="text-[11px] text-[#7A6A59]">from {data.hotel.checkInTime}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#7A6A59]">Check-out</p>
              <p className="font-semibold">{d(b.checkOut)}</p>
              <p className="text-[11px] text-[#7A6A59]">by {data.hotel.checkOutTime}</p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#5C4C3E]">
            <CalendarDays className="h-4 w-4 text-brand" /> {b.nights} night{b.nights > 1 ? "s" : ""} · {b.adults} adult{b.adults > 1 ? "s" : ""}{b.children ? ` · ${b.children} child` : ""}
          </p>
          {b.mealPlan && (
            <p className="mt-1.5 flex items-center gap-2 text-sm text-[#5C4C3E]">
              <Coffee className="h-4 w-4 text-brand" /> {b.mealPlan.code} · {[b.mealPlan.breakfast && "breakfast", b.mealPlan.lunch && "lunch", b.mealPlan.dinner && "dinner"].filter(Boolean).join(", ") || "room only"} included
            </p>
          )}
          {b.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{b.amenities.map((a) => <span key={a} className="rounded-full bg-[#FBF7F1] px-2.5 py-1 text-[11px]">{a}</span>)}</div>
          )}
        </motion.div>

        {b.roomQrToken && (
          <motion.div {...rise(2)}>
            <Link href={`/room/${b.roomQrToken}`} className="flex items-center gap-4 rounded-[1.6rem] p-5 text-[#FFF8F0] shadow-lg [background-image:var(--gradient-primary)]">
              <UtensilsCrossed className="h-6 w-6" />
              <span className="flex-1">
                <span className="block font-display text-lg font-semibold">Order in-room dining</span>
                <span className="block text-xs text-white/75">Menu, services & requests for Room {b.room}</span>
              </span>
              →
            </Link>
          </motion.div>
        )}

        {data.hotel.wifiName && (
          <motion.button {...rise(3)} type="button" onClick={() => navigator.clipboard?.writeText(data.hotel.wifiPassword ?? "")} className={cn(card, "flex w-full items-center gap-3 text-left")}>
            <Wifi className="h-5 w-5 text-brand" />
            <span className="flex-1">
              <span className="block font-semibold">{data.hotel.wifiName}</span>
              <span className="block text-xs text-[#7A6A59]">{data.hotel.wifiPassword ?? "Open network"}</span>
            </span>
            <Copy className="h-4 w-4 text-[#A8957D]" />
          </motion.button>
        )}

        <motion.div {...rise(4)} className={card}>
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><Receipt className="h-4 w-4 text-brand" /> Your bill</p>
            
          </div>
          <ul className="space-y-2 text-sm">
            {data.folio.map((f) => {
              const credit = f.type === "PAYMENT" || f.type === "DISCOUNT";
              return (
                <li key={f.id} className="flex justify-between gap-3">
                  <span className="text-[#5C4C3E]">{f.description}</span>
                  <span className={cn("shrink-0 tabular-nums", credit && "text-emerald-700")}>{credit ? "−" : ""}{inr(f.amount)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 space-y-1 border-t border-black/5 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-[#7A6A59]">Total</span><span>{inr(t.total)}</span></div>
            <div className="flex justify-between"><span className="text-[#7A6A59]">Paid</span><span className="text-emerald-700">{inr(t.paid)}</span></div>
            <div className="flex justify-between font-display text-xl font-semibold"><span>Balance</span><span>{inr(balance)}</span></div>
          </div>
          {upi && (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-[#FBF7F1] p-4 text-center">
              <div className="rounded-2xl bg-white p-3"><QRCodeSVG value={upi} size={170} /></div>
              <a href={upi} className="flex h-12 w-full items-center justify-center rounded-2xl font-semibold text-[#FFF8F0] [background-image:var(--gradient-primary)]">Pay {inr(balance)} with UPI</a>
              <p className="text-[11px] text-[#7A6A59]">Reception confirms the payment and your bill updates here.</p>
            </div>
          )}
        </motion.div>

        <motion.div {...rise(5)} className={cn(card, "space-y-3")}>
          {data.hotel.address && (
            <a href={maps ?? undefined} target="_blank" rel="noreferrer" className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{data.hotel.address}<span className="block text-xs font-semibold text-brand">Get directions</span></span>
            </a>
          )}
          {data.hotel.phone && (
            <a href={`tel:${data.hotel.phone}`} className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-brand" /> {data.hotel.phone}</a>
          )}
          <p className="flex items-center gap-3 text-xs text-[#7A6A59]"><BedDouble className="h-4 w-4" /> Check-in {data.hotel.checkInTime} · Check-out {data.hotel.checkOutTime}{data.hotel.gstNumber ? ` · GSTIN ${data.hotel.gstNumber}` : ""}</p>
        </motion.div>
      </div>
    </div>
  );
}
