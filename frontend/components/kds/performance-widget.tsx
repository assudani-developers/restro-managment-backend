"use client";

import { Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useKitchenPerformance } from "@/hooks/use-kds";

export function PerformanceWidget({ branchId }: { branchId: string | null }) {
  const { data } = useKitchenPerformance(branchId);

  if (!data || data.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-3 overflow-x-auto rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs shadow-2xs">
      <div className="flex shrink-0 items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
        <Gauge className="h-3.5 w-3.5 text-teal-600" />
        <span>Avg Cook Time</span>
      </div>
      <div className="h-3 w-px bg-slate-200" />
      <div className="flex items-center gap-3">
        {data.map((row) => (
          <div key={row.stationId} className="flex shrink-0 items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-medium">{row.stationName}:</span>
            <span className="font-extrabold tabular-nums text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
              {row.avgMinutesToReady}m
            </span>
            <span className="text-[11px] text-slate-400">({row.ticketsReady} served)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
