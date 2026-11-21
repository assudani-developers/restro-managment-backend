"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  CheckCircle2,
  DollarSign,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AddIngredientDialog } from "@/components/inventory/add-ingredient-dialog";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { useIngredients, useTrackingStatus } from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/format";

type StockFilter = "all" | "low" | "out" | "normal";

export default function InventoryPage() {
  const { branchId } = useBranch();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const { data: ingredients, isLoading } = useIngredients(branchId);
  const { data: trackingStatus } = useTrackingStatus(branchId);

  // Compute Inventory Analytics
  const metrics = useMemo(() => {
    if (!ingredients || ingredients.length === 0) {
      return { totalItems: 0, totalValuation: 0, lowStockCount: 0, outOfStockCount: 0 };
    }
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of ingredients) {
      const stock = Number(item.currentStock || 0);
      const reorder = Number(item.reorderLevel || 0);
      const cost = Number(item.costPerUnit || 0);

      totalValuation += stock * cost;
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= reorder) {
        lowStockCount++;
      }
    }

    return {
      totalItems: ingredients.length,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [ingredients]);

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter((i) => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const stock = Number(i.currentStock || 0);
      const reorder = Number(i.reorderLevel || 0);

      if (filter === "low") return stock > 0 && stock <= reorder;
      if (filter === "out") return stock <= 0;
      if (filter === "normal") return stock > reorder;
      return true;
    });
  }, [ingredients, search, filter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground font-display">
            Inventory &amp; Stock Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Raw materials, automated recipe costing, purchase orders, and batch tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/purchase-orders">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Purchase Orders
            </Button>
          </Link>
          <AddIngredientDialog branchId={branchId} />
        </div>
      </div>

      <InventoryTabs />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Stock Value</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(metrics.totalValuation)}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Ingredients</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.totalItems}</p>
          </div>
        </Card>

        <Card
          onClick={() => setFilter("low")}
          className={`flex items-center gap-3.5 p-4 cursor-pointer transition-all ${
            filter === "low" ? "ring-2 ring-amber-500" : ""
          } bg-card/60 backdrop-blur-xs`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600">{metrics.lowStockCount}</p>
          </div>
        </Card>

        <Card
          onClick={() => setFilter("out")}
          className={`flex items-center gap-3.5 p-4 cursor-pointer transition-all ${
            filter === "out" ? "ring-2 ring-rose-500" : ""
          } bg-card/60 backdrop-blur-xs`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
            <p className="text-2xl font-bold tracking-tight text-rose-600">{metrics.outOfStockCount}</p>
          </div>
        </Card>
      </div>

      {trackingStatus && trackingStatus.problems.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              {trackingStatus.problems.length} stock-tracked menu item{trackingStatus.problems.length === 1 ? "" : "s"} will deduct nothing when sold
            </p>
            <p className="text-muted-foreground">
              Add a recipe or pick the stock item (Menu → Edit item → Stock when sold):{" "}
              {trackingStatus.problems.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients, spices, dairy, produce…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Items ({metrics.totalItems})
          </button>
          <button
            type="button"
            onClick={() => setFilter("low")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "low" ? "bg-background text-amber-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="h-3 w-3" /> Low Stock ({metrics.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("out")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "out" ? "bg-background text-rose-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertCircle className="h-3 w-3" /> Out of Stock ({metrics.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("normal")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "normal" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" /> In Stock
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient / Item</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Cost / Unit</TableHead>
                <TableHead className="text-right">Stock Valuation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const stock = Number(i.currentStock || 0);
                const reorder = Number(i.reorderLevel || 0);
                const isOut = stock <= 0;
                const isLow = !isOut && stock <= reorder;

                return (
                  <TableRow key={i.id} className="group hover:bg-secondary/40">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{i.name}</span>
                        {isOut && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <AlertCircle className="h-3 w-3" />
                            Out of stock
                          </Badge>
                        )}
                        {isLow && (
                          <Badge variant="outline" className="gap-1 border-amber-400 bg-amber-50 text-amber-800 text-[10px]">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Low stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{i.unit}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-foreground"}`}>
                      {i.currentStock} {i.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {i.reorderLevel} {i.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {formatCurrency(i.costPerUnit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(Number(i.currentStock) * Number(i.costPerUnit))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <AdjustStockDialog branchId={branchId} ingredient={i} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">No ingredients match your criteria</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {search ? "No raw materials found. Clear the search or filter to see more." : "Add raw materials and recipes to automate stock deductions during kitchen orders."}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
