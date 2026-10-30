"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductGrid({
  branchId,
  onSelect,
}: {
  branchId: string | null;
  onSelect: (item: MenuItem) => void;
}) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: items, isLoading, isError, error, refetch, isFetching } = useMenuItems(branchId, activeCategoryId);

  const filtered = items?.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative">
        <Input
          placeholder="Search food, beverages, desserts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-slate-900 shadow-2xs focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
        />
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
      </div>

      {categories && categories.length > 0 && (
        <ResponsiveTabs
          mobileOnly
          className="lg:hidden"
          label="Category"
          value={activeCategoryId ?? "all"}
          onChange={(id) => setActiveCategoryId(id === "all" ? undefined : id)}
          desktopListClassName="justify-start lg:h-auto lg:flex-wrap"
          items={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.name, hint: `${c._count.items} items` }))]}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-5">
        {categories && categories.length > 0 && (
          <nav
            aria-label="Category"
            className="hidden w-52 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-slate-200 pr-3 lg:flex xl:w-60"
          >
            {[{ id: undefined as string | undefined, name: "All Items", count: undefined as number | undefined }, ...categories.map((c) => ({ id: c.id as string | undefined, name: c.name, count: c._count.items as number | undefined }))].map((c) => {
              const active = c.id === activeCategoryId;
              return (
                <button
                  key={c.id ?? "all"}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setActiveCategoryId(c.id)}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-150",
                    active
                      ? "bg-teal-600 font-bold text-white shadow-sm shadow-teal-600/30"
                      : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span className="min-w-0 break-words leading-tight">{c.name}</span>
                  {c.count !== undefined && (
                    <span className={cn("shrink-0 text-xs tabular-nums rounded-md px-1.5 py-0.5", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isError && !items ? (
            <QueryError error={error} what="the menu" onRetry={() => void refetch()} retrying={isFetching} />
          ) : (
            <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-y-auto pb-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              {filtered?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group flex min-h-28 flex-col justify-between items-start gap-2 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-2xs transition-all duration-150 hover:-translate-y-1 hover:border-teal-400 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    {/* FSSAI style veg/non-veg indicator */}
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border p-0.5",
                        item.isVeg ? "border-emerald-600" : "border-rose-600",
                      )}
                      title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          item.isVeg ? "bg-emerald-600" : "bg-rose-600",
                        )}
                      />
                    </div>
                  </div>

                  <span className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-teal-600 transition-colors">
                    {item.name}
                  </span>

                  <div className="flex w-full items-baseline justify-between gap-1 border-t border-slate-100 pt-2">
                    <span className="text-sm font-bold tabular-nums text-teal-700">
                      {formatCurrency(item.price)}
                    </span>
                    {item.halfPrice != null && (
                      <span className="text-[11px] tabular-nums text-slate-500 font-medium">
                        Half {formatCurrency(item.halfPrice)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filtered?.length === 0 && !isLoading && (
                <p className="col-span-full py-12 text-center text-sm font-medium text-slate-400">
                  {search ? <>No items match &quot;{search}&quot;</> : "No items in this category yet"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
