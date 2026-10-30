"use client";

import type { KotStatusDto } from "@restrocore/types";
import { useEffect } from "react";
import { ChefHat, Flame, Sparkles } from "lucide-react";
import { BranchNotice } from "@/components/layout/branch-notice";
import { PerformanceWidget } from "@/components/kds/performance-widget";
import { IncomingOrderCard } from "@/components/kds/incoming-order-card";
import { LiveStatus } from "@/components/kds/live-status";
import { TicketCard } from "@/components/kds/ticket-card";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useKdsSound } from "@/hooks/use-kds-sound";
import { useKdsIncoming, useKdsStations, useKdsTickets, type KotTicket } from "@/hooks/use-kds";
import { useKdsStationPreference } from "@/hooks/use-kds-station";
import { installAudioUnlock } from "@/lib/audio-unlock";
import { resolveStation } from "@/lib/kds-station";
import { cn } from "@/lib/utils";

const COLUMNS: {
  status: KotStatusDto;
  label: string;
  badgeClass: string;
  columnBorder: string;
}[] = [
  {
    status: "NEW",
    label: "New Tickets",
    badgeClass: "bg-teal-100 text-teal-800",
    columnBorder: "border-t-teal-600",
  },
  {
    status: "ACCEPTED",
    label: "Accepted",
    badgeClass: "bg-amber-100 text-amber-800",
    columnBorder: "border-t-amber-500",
  },
  {
    status: "PREPARING",
    label: "Preparing",
    badgeClass: "bg-blue-100 text-blue-800",
    columnBorder: "border-t-blue-500",
  },
  {
    status: "READY",
    label: "Ready to Serve",
    badgeClass: "bg-emerald-100 text-emerald-800",
    columnBorder: "border-t-emerald-600",
  },
];

export default function KdsPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canAnswer = hasPermission(me?.user, "orders.accept");
  const { data: stations, isError: stationsFailed } = useKdsStations(branchId);
  const pref = useKdsStationPreference(branchId);
  const { active: activeStation, stale, ready } = resolveStation(pref.saved, stations, stationsFailed);
  const canFetch = pref.ready && ready;
  const tickets = useKdsTickets(branchId, activeStation, canFetch);
  const incoming = useKdsIncoming(branchId, canAnswer);
  useKdsSound(branchId);
  useEffect(() => installAudioUnlock(), []);

  const byStatus = (status: KotStatusDto): KotTicket[] =>
    tickets.data?.filter((t) => t.status === status) ?? [];
  const pendingOrders = incoming.data ?? [];

  return (
    <div className="flex flex-col gap-4 min-h-full pb-4 pt-0">
      {/* Top Header & Kitchen Controls */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Kitchen Display (KDS)
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Real-time kitchen order tickets & station routing</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PerformanceWidget branchId={branchId} />
            <LiveStatus />
          </div>
        </div>

        {/* Station Selector Bar */}
        {stations && stations.length > 0 && (
          <div role="group" aria-label="Station" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Kitchen Station:</span>
            {[{ id: "", name: "All Stations" }, ...stations].map((s) => {
              const stationCount = s.id
                ? tickets.data?.filter((t) => t.station?.id === s.id).length ?? 0
                : tickets.data?.length ?? 0;
              return (
                <button
                  key={s.id || "all"}
                  type="button"
                  aria-pressed={s.id === activeStation}
                  onClick={() => pref.choose(s.id)}
                  className={cn(
                    "h-8.5 rounded-xl border px-3 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5",
                    s.id === activeStation
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-600/20"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span>{s.name}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums",
                      s.id === activeStation
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {stationCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {stale && (
        <p role="status" className="text-xs text-amber-600 font-medium">
          The station saved on this screen no longer exists, so all stations are shown. Pick a station to pin it.
        </p>
      )}

      <BranchNotice />

      {pendingOrders.length > 0 && (
        <section aria-label="Incoming orders" className="flex flex-col gap-2 shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Incoming Online Orders ({pendingOrders.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pendingOrders.map((order) => (
              <IncomingOrderCard key={order.id} order={order} branchId={branchId} />
            ))}
          </div>
        </section>
      )}

      {tickets.isError ? (
        <QueryError
          error={tickets.error}
          what="the kitchen tickets"
          onRetry={() => void tickets.refetch()}
          retrying={tickets.isFetching}
        />
      ) : (
        <div className="flex min-h-[580px] flex-1 snap-x snap-mandatory gap-3 overflow-x-auto sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-hidden xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = byStatus(col.status);
            return (
              <div
                key={col.status}
                className={cn(
                  "flex w-[85%] shrink-0 snap-center flex-col gap-2.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 sm:w-auto sm:shrink shadow-2xs border-t-4",
                  col.columnBorder,
                )}
              >
                <div className="flex items-center justify-between px-1 py-0.5 border-b border-slate-200/70 pb-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">{col.label}</h2>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", col.badgeClass)}>
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1 pb-2">
                  {(tickets.isLoading || !canFetch) &&
                    Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                  {list.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} branchId={branchId} />
                  ))}
                  {canFetch && !tickets.isLoading && list.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                      <ChefHat className="h-7 w-7 stroke-1 text-slate-300" />
                      <p className="text-xs font-medium text-slate-400">No tickets in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
