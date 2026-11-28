"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Camera, FileText, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

interface MenuHealthData {
  score: number;
  totalCategories: number;
  totalItems: number;
  missingPhoto: number;
  missingDescription: number;
  zeroPrice: number;
  soldOutCount: number;
  emptyCategories: number;
}

export function MenuHealthCard({ branchId }: { branchId: string | null }) {
  const { data } = useQuery({
    queryKey: ["menu", "health", branchId],
    queryFn: () => api.get<MenuHealthData>(`/menu/health?branchId=${branchId}`),
    enabled: !!branchId,
  });

  if (!data) return null;

  const badgeColor =
    data.score >= 80
      ? "bg-emerald-500/15 text-emerald-700"
      : data.score >= 50
        ? "bg-amber-500/15 text-amber-800"
        : "bg-rose-500/15 text-rose-700";

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${badgeColor}`}>
          {data.score}%
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Menu health &amp; readiness
          </p>
          <p className="text-xs text-muted-foreground">
            {data.totalItems} dishes across {data.totalCategories} categories
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1">
          <Camera className="h-3.5 w-3.5" />
          {data.missingPhoto} missing photos
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1">
          <FileText className="h-3.5 w-3.5" />
          {data.missingDescription} missing descriptions
        </span>
        {data.zeroPrice > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-rose-700">
            <Tag className="h-3.5 w-3.5" />
            {data.zeroPrice} zero-price
          </span>
        )}
        {data.soldOutCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-800">
            <AlertCircle className="h-3.5 w-3.5" />
            {data.soldOutCount} sold out
          </span>
        )}
      </div>
    </Card>
  );
}
