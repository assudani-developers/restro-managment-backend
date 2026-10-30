"use client";

import { BranchNotice } from "@/components/layout/branch-notice";
import { ChefHat, ClipboardList, Flame, Globe, ReceiptText, Store, Timer, TrendingUp, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { RefundDialog } from "@/components/orders/refund-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useManagedOrders } from "@/hooks/use-orders";
import { openEntity } from "@/lib/entity-events";
import { useDashboardSummary, useDashboardTrends } from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const ONLINE_ORDER_TYPES = new Set(["QR_ORDER", "KIOSK"]);

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  accent?: "success" | "warning";
}) {
  return (
    <Card className="flex flex-col gap-3.5 p-6 border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent === "success" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20",
            accent === "warning" && "bg-amber-50 text-amber-600 ring-1 ring-amber-500/20",
            !accent && "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <span className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {value}
      </span>
    </Card>
  );
}

function TableStatusRow({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
        <span className="text-slate-600 font-medium">{label}</span>
      </div>
      <span className="font-semibold tabular-nums text-slate-900">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { branchId } = useBranch();
  const { data, isLoading } = useDashboardSummary(branchId);
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends(branchId);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Live Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time overview of sales, floor tables & kitchen operations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>

      <OrderDetailDialog
        branchId={branchId}
        orderId={viewingOrderId}
        open={!!viewingOrderId}
        onOpenChange={(open) => !open && setViewingOrderId(null)}
      />

      <BranchNotice />

      <PendingOrdersBanner branchId={branchId} />

      <QuickActions />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Revenue"
            value={formatCurrency(data.todayRevenue)}
            icon={Wallet}
            accent="success"
          />
          <Link href="/orders" className="block rounded-xl transition" title="Manage orders">
            <StatCard label="Today's Orders" value={String(data.todayOrders)} icon={ReceiptText} />
          </Link>
          <StatCard
            label="Occupied Tables"
            value={String(data.tables.occupied)}
            icon={ClipboardList}
          />
          <StatCard
            label="Kitchen Queue"
            value={String(
              data.kitchenQueue.new + data.kitchenQueue.accepted + data.kitchenQueue.preparing,
            )}
            icon={Flame}
            accent="warning"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="Revenue Trends (Last 14 Days)"
          icon={TrendingUp}
          data={trends?.revenue ?? []}
          valueKey="amount"
          color="var(--success)"
          valueFormatter={(v) => formatCurrency(v)}
          isLoading={trendsLoading}
          emptyMessage="No paid orders in the last 14 days yet."
        />
        <TrendChart
          title="Food Waste Tracker (Last 14 Days)"
          icon={Trash2}
          data={trends?.waste ?? []}
          valueKey="cost"
          color="var(--warning)"
          valueFormatter={(v) => formatCurrency(v)}
          isLoading={trendsLoading}
          emptyMessage="No waste logged in the last 14 days."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-6 border-slate-200/80 bg-white shadow-xs lg:col-span-1">
          <h2 className="mb-3 text-base font-bold text-slate-900">Floor & Tables Matrix</h2>
          {data && (
            <div className="flex flex-col">
              <TableStatusRow label="Available" count={data.tables.available} dotClass="bg-emerald-500" />
              <TableStatusRow label="Occupied" count={data.tables.occupied} dotClass="bg-indigo-600" />
              <TableStatusRow label="Reserved" count={data.tables.reserved} dotClass="bg-amber-500" />
              <TableStatusRow label="Cleaning" count={data.tables.cleaning} dotClass="bg-slate-400" />
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-1 p-6 border-slate-200/80 bg-white shadow-xs lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
            <ChefHat className="h-5 w-5 text-indigo-600" />
            Kitchen Order Queue
          </h2>
          {data && (
            <div className="flex flex-col">
              <TableStatusRow label="New Tickets" count={data.kitchenQueue.new} dotClass="bg-indigo-600" />
              <TableStatusRow label="Accepted" count={data.kitchenQueue.accepted} dotClass="bg-amber-500" />
              <TableStatusRow label="Preparing" count={data.kitchenQueue.preparing} dotClass="bg-amber-500" />
              <TableStatusRow label="Ready to Serve" count={data.kitchenQueue.ready} dotClass="bg-emerald-500" />
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-6 border-slate-200/80 bg-white shadow-xs lg:col-span-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Timer className="h-5 w-5 text-indigo-600" />
            Recent Transactions
          </h2>
          <div className="flex flex-col divide-y divide-slate-100">
            {data?.recentOrders.length === 0 && (
              <p className="py-4 text-sm text-slate-400 text-center">No sales yet today.</p>
            )}
            {data?.recentOrders.map((order) => {
              const isOnline = ONLINE_ORDER_TYPES.has(order.type);
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 text-left text-sm hover:bg-slate-50 rounded-lg px-1.5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setViewingOrderId(order.id)}
                    className="flex flex-col text-left flex-1"
                    title="View order details"
                  >
                    <span className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">#{order.orderNumber}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-0.5 w-fit text-[10px] font-medium",
                        isOnline && "bg-indigo-50 text-indigo-700",
                      )}
                    >
                      {order.type.replace("_", " ")}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <RefundDialog
                      branchId={branchId}
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      maxAmount={Number(order.totalAmount)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 border-slate-200/80 bg-white shadow-xs lg:col-span-1">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Customer Portal</span>
              <Globe className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customers can scan table QR codes to view the live menu and place orders directly to the kitchen.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/tables"
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20 hover:bg-indigo-100 transition-colors"
            >
              Manage Floor QR Codes
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PendingOrdersBanner({ branchId }: { branchId: string | null }) {
  const { data: pendingOrders } = useManagedOrders(branchId, "pending");
  const orders = pendingOrders ?? [];

  if (orders.length === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold">
            {orders.length} {orders.length === 1 ? "order awaits" : "orders await"} kitchen action
          </p>
          <p className="text-xs text-amber-700">Open orders are waiting to be prepared or billed</p>
        </div>
      </div>
      <Link
        href="/orders"
        className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
      >
        View Orders
      </Link>
    </div>
  );
}
