"use client";

import { BookMarked, Download, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingWizard } from "@/components/hotel/booking-wizard";
import { Btn, Empty, PageHeader, Panel, Segmented, Select, Tag, fmtDate, inr } from "@/components/hotel/ui";
import { useBranch } from "@/hooks/use-branch";
import { useBookings } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

const STATUS = ["ALL", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] as const;

export default function BookingsPage() {
  const { branchId } = useBranch();
  const [status, setStatus] = useState<(typeof STATUS)[number]>("ALL");
  const [source, setSource] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [wizard, setWizard] = useState(false);

  useEffect(() => {
    // Header's "New booking" links here with ?new=1.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("new") === "1") setWizard(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useBookings(branchId, { status, source, search: debounced || undefined });
  const rows = data ?? [];
  const outstanding = rows.filter((r) => r.status === "CHECKED_IN" || r.status === "CONFIRMED").reduce((a, r) => a + Math.max(0, r.balance), 0);

  const exportCsv = () => {
    const head = ["Booking", "Guest", "Phone", "Status", "Source", "Room type", "Room", "Check-in", "Check-out", "Nights", "Total", "Paid", "Balance"];
    const lines = rows.map((r) => [r.code, r.guestName, r.guestPhone ?? "", r.status, r.source, r.category.name, r.room?.number ?? "", r.checkIn, r.checkOut, r.nights, r.total, r.paid, r.balance]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Bookings"
        actions={
          <>
            <Btn variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download /> Export
            </Btn>
            <Btn onClick={() => setWizard(true)}>
              <Plus /> New booking
            </Btn>
          </>
        }
      />
      <Panel
        title={`${rows.length} bookings`}
        subtitle={outstanding > 0 ? `${inr(outstanding)} outstanding on active stays` : "All active stays settled"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID, guest, phone" className="h-8 w-48 rounded-lg border border-input bg-card pr-2 pl-8 text-xs outline-none focus:border-brand" />
            </div>
            <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-8 w-32 text-xs" options={["ALL", "RECEPTION", "WEBSITE", "OTA", "PHONE", "WALK_IN"].map((s) => ({ value: s, label: s === "ALL" ? "All sources" : s.replace("_", " ") }))} />
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="border-b border-border/70 px-5 py-3">
          <Segmented value={status} onChange={setStatus} options={STATUS.map((s) => ({ value: s, label: s === "ALL" ? "All" : s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) }))} />
        </div>
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <Empty icon={BookMarked} title="No bookings found" body="New reservations from reception, website and OTA show up here." action={<Btn onClick={() => setWizard(true)}><Plus /> New booking</Btn>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-[13px] font-medium text-muted-foreground">
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-3 py-3">Guest</th>
                  <th className="px-3 py-3">Stay</th>
                  <th className="px-3 py-3">Room</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.012, 0.2) }} className="border-t border-border/60 transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link href={`/bookings/${r.id}`} className="font-semibold text-brand hover:underline">
                        {r.code}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{r.source === "OTA" ? r.otaName ?? "OTA" : r.source.replace("_", " ").toLowerCase()}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{r.guestName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.guestPhone ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>
                        {fmtDate(r.checkIn, { day: "2-digit", month: "short" })} → {fmtDate(r.checkOut, { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.nights}N · {r.adults}A{r.children ? ` ${r.children}C` : ""} · {r.mealPlan?.code ?? "EP"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{r.room ? r.room.number : "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{r.category.name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Tag value={r.status} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{inr(r.total)}</td>
                    <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", r.balance > 0 && r.status !== "CANCELLED" ? "text-rose-700" : "text-emerald-700")}>{inr(r.balance)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <BookingWizard open={wizard} onClose={() => setWizard(false)} />
    </div>
  );
}
