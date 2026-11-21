"use client";

import { BedDouble, Download, IndianRupee, Percent, TrendingUp, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Btn, Input, PageHeader, Panel, ROOM_STATUS, Segmented, Stat, addDays, inr, todayIso } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useBoard, useHotelAnalytics } from "@/hooks/use-hotel";

type Range = "today" | "yesterday" | "7d" | "30d" | "custom";
const METHOD_LABEL: Record<string, string> = { UPI: "UPI / QR", CASH: "Cash", CARD: "Card", BANK_TRANSFER: "Bank transfer", PAYMENT_LINK: "Payment link", OTA: "OTA settlement", WALLET: "Wallet", GIFT_CARD: "Gift card", STORE_CREDIT: "Store credit" };
const PIE = ["var(--primary)", "var(--brand-accent)", "#3F6E9E", "#4F7A63", "#9A6B4F", "#8B9098", "#C9362C"];

const axis = { fontSize: 11, fill: "#806E5A" };

export default function CommandCenter() {
  const { branchId } = useBranch();
  const [range, setRange] = useState<Range>("7d");
  const [custom, setCustom] = useState({ from: addDays(todayIso(), -13), to: todayIso() });
  const { from, to } = useMemo(() => {
    const t = todayIso();
    if (range === "today") return { from: t, to: t };
    if (range === "yesterday") return { from: addDays(t, -1), to: addDays(t, -1) };
    if (range === "7d") return { from: addDays(t, -6), to: t };
    if (range === "30d") return { from: addDays(t, -29), to: t };
    return custom;
  }, [range, custom]);
  const { data } = useHotelAnalytics(branchId, from, to);
  const { data: board } = useBoard(branchId);
  const k = data?.kpis;
  const totalRevenue = (data?.departments ?? []).reduce((a, d) => a + d.amount, 0);
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: from === to ? undefined : "short", day: "2-digit", month: "short" });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Section", "Key", "Value"],
      ...Object.entries(data.kpis).map(([a, b]) => ["KPI", a, String(b)]),
      ...data.paymentMix.map((p) => ["Payment method", p.method, `${p.amount} (${p.percent}%)`]),
      ...data.departments.map((d) => ["Department revenue", d.name, String(d.amount)]),
      ...data.occupancy.map((o) => ["Occupancy", o.date, `occupied ${o.occupied}, reserved ${o.reserved}, available ${o.available}`]),
      ...data.revenueTrend.map((r) => ["Revenue", r.date, String(r.amount)]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `hotel-analytics-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
                { value: "7d", label: "7 days" },
                { value: "30d", label: "30 days" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <Btn variant="outline" onClick={exportCsv} disabled={!data}>
              <Download /> Export
            </Btn>
          </>
        }
      />
      {range === "custom" && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Input type="date" className="w-40" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          <span className="text-muted-foreground">→</span>
          <Input type="date" className="w-40" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Occupancy" value={`${k?.occupancyPercent ?? 0}%`} hint={`${k?.roomNightsSold ?? 0} room-nights`} icon={BedDouble} />
        <Stat label="ADR" value={inr(k?.adr)} hint="Avg daily rate" icon={TrendingUp} tone="accent" />
        <Stat label="RevPAR" value={inr(k?.revpar)} hint="Revenue / available room" icon={Percent} tone="blue" />
        <Stat label="Collected" value={inr(k?.totalCollected)} hint="All payment methods" icon={Wallet} tone="green" />
        <Stat label="Outstanding" value={inr(k?.outstanding)} hint="In-house folios" icon={IndianRupee} tone="red" />
        <Stat label="Cancellations" value={`${k?.cancellationRate ?? 0}%`} hint={`OTA net ${inr(k?.otaNet)}`} icon={XCircle} tone="ink" />
      </div>

      {/* Live board strip */}
      {board && board.rooms.length > 0 && (
        <Link href="/front-desk" className="lux-card mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 transition hover:shadow-lg">
          <span className="font-display text-base font-semibold">Right now</span>
          {(Object.keys(ROOM_STATUS) as (keyof typeof ROOM_STATUS)[]).map((s) => (
            <span key={s} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROOM_STATUS[s].color }} />
              <span className="text-muted-foreground">{ROOM_STATUS[s].label}</span>
              <span className="font-display font-semibold">{board.counts[s] ?? 0}</span>
            </span>
          ))}
          <span className="ml-auto text-xs font-semibold text-brand">
            {board.arrivals.length} arrivals · {board.departures.length} departures →
          </span>
        </Link>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Revenue trend" subtitle={`${inr(totalRevenue)} total`} className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={data?.revenueTrend ?? []} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EFE6D8" />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={axis} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} tick={axis} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={(l) => fmtDay(String(l))} contentStyle={{ borderRadius: 12, border: "1px solid #E9DFD0" }} />
                <Area type="monotone" dataKey="amount" name="Revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Payment methods">
          {data?.paymentMix.length ? (
            <>
              <div className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.paymentMix} dataKey="amount" nameKey="method" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                      {data.paymentMix.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [inr(Number(v)), METHOD_LABEL[String(n)] ?? n]} contentStyle={{ borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {data.paymentMix.map((p, i) => (
                  <li key={p.method} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE[i % PIE.length] }} />
                    <span className="flex-1">{METHOD_LABEL[p.method] ?? p.method}</span>
                    <span className="font-semibold tabular-nums">{inr(p.amount)}</span>
                    <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{p.percent}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No payments in this period.</p>
          )}
        </Panel>

        <Panel title="Room occupancy & status" subtitle={`${data?.totalRooms ?? 0} rooms`} className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.occupancy ?? []} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#EFE6D8" />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={axis} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={28} />
                <Tooltip labelFormatter={(l) => fmtDay(String(l))} contentStyle={{ borderRadius: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill={ROOM_STATUS.OCCUPIED.color} />
                <Bar dataKey="reserved" name="Reserved" stackId="a" fill={ROOM_STATUS.BOOKED.color} />
                <Bar dataKey="available" name="Available" stackId="a" fill={ROOM_STATUS.AVAILABLE.color} />
                <Bar dataKey="maintenance" name="Out of service" stackId="a" fill={ROOM_STATUS.MAINTENANCE.color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Department revenue">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data?.departments ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={92} />
                <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="amount" name="Revenue" radius={[0, 8, 8, 0]}>
                  {(data?.departments ?? []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-2 text-[13px] font-medium text-muted-foreground">Booking source</p>
            <div className="flex flex-wrap gap-2">
              {(data?.sources ?? []).map((s) => (
                <span key={s.source} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                  {s.source.replace("_", " ").toLowerCase()} <b>{s.count}</b>
                </span>
              ))}
              {!data?.sources.length && <span className="text-xs text-muted-foreground">No bookings in range</span>}
            </div>
            {(k?.otaGross ?? 0) > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                OTA gross {inr(k?.otaGross)} · commission {inr(k?.otaCommission)} · net {inr(k?.otaNet)}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
