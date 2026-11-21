"use client";

import { BranchNotice } from "@/components/layout/branch-notice";
import { ArrowUpRight, ChefHat, ClipboardList, Flame, Globe, ReceiptText, Timer, TrendingUp, Trash2, Wallet } from "lucide-react";
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
  note,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  accent?: "success" | "warning";
  note: string;
}) {
  return (
    <Card className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent === "success" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20",
            accent === "warning" && "bg-amber-50 text-amber-600 ring-1 ring-amber-500/20",
            !accent && "bg-teal-50 text-teal-800 ring-1 ring-teal-700/15",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <span className="block text-3xl font-semibold tabular-nums tracking-tight text-slate-950">
          {value}
        </span>
        <span className="mt-1 block text-xs text-slate-500">{note}</span>
      </div>
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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 sm:gap-7">
      <section className="relative isolate overflow-hidden rounded-3xl border border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-amber-50 px-6 py-7 text-slate-900 shadow-sm shadow-teal-900/5 sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live service overview
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Your restaurant, at a glance.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Sales, floor activity and kitchen flow — all in one place, updated as your team works.
            </p>
          </div>
          <Link
            href="/orders"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-teal-900/15 transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md"
          >
            Open order desk
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <OrderDetailDialog
        branchId={branchId}
        orderId={viewingOrderId}
        open={!!viewingOrderId}
        onOpenChange={(open) => !open && setViewingOrderId(null)}
      />

      <BranchNotice />

      <PendingOrdersBanner branchId={branchId} />

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Shortcuts</h2>
            <p className="mt-0.5 text-xs text-slate-500">The tools you reach for most during service</p>
          </div>
        </div>
        <QuickActions />
      </div>

      <section aria-label="Today's key metrics" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Today at a glance</h2>
            <p className="mt-0.5 text-xs text-slate-500">A live pulse on the numbers that matter</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Updates automatically
          </span>
        </div>
        {isLoading || !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Today's Revenue"
              value={formatCurrency(data.todayRevenue)}
              icon={Wallet}
              accent="success"
              note="Paid orders today"
            />
            <Link href="/orders" className="block rounded-xl transition" title="Manage orders">
              <StatCard label="Today's Orders" value={String(data.todayOrders)} icon={ReceiptText} note="Orders placed today" />
            </Link>
            <StatCard
              label="Occupied Tables"
              value={String(data.tables.occupied)}
              icon={ClipboardList}
              note={`${data.tables.available} tables available`}
            />
            <StatCard
              label="Kitchen Queue"
              value={String(
                data.kitchenQueue.new + data.kitchenQueue.accepted + data.kitchenQueue.preparing,
              )}
              icon={Flame}
              accent="warning"
              note={`${data.kitchenQueue.ready} ready to serve`}
            />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <TrendChart
          title="Revenue Trends (Last 14 Days)"
          icon={TrendingUp}
          data={trends?.revenue ?? []}
          valueKey="amount"
          color="var(--primary)"
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
        <Card className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-900">Floor & Tables</h2>
          {data && (
            <div className="flex flex-col">
              <TableStatusRow label="Available" count={data.tables.available} dotClass="bg-emerald-500" />
              <TableStatusRow label="Occupied" count={data.tables.occupied} dotClass="bg-teal-700" />
              <TableStatusRow label="Reserved" count={data.tables.reserved} dotClass="bg-amber-500" />
              <TableStatusRow label="Cleaning" count={data.tables.cleaning} dotClass="bg-slate-400" />
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <ChefHat className="h-5 w-5 text-teal-700" />
            Kitchen Order Queue
          </h2>
          {data && (
            <div className="flex flex-col">
              <TableStatusRow label="New Tickets" count={data.kitchenQueue.new} dotClass="bg-teal-700" />
              <TableStatusRow label="Accepted" count={data.kitchenQueue.accepted} dotClass="bg-amber-500" />
              <TableStatusRow label="Preparing" count={data.kitchenQueue.preparing} dotClass="bg-amber-500" />
              <TableStatusRow label="Ready to Serve" count={data.kitchenQueue.ready} dotClass="bg-emerald-500" />
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Timer className="h-5 w-5 text-teal-700" />
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
                    <span className="font-semibold text-slate-900 hover:text-teal-800 transition-colors">#{order.orderNumber}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-0.5 w-fit text-[10px] font-medium",
                        isOnline && "bg-teal-50 text-teal-800",
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

        <Card className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Customer Portal</span>
              <Globe className="h-4 w-4 text-teal-700" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customers can scan table QR codes to view the live menu and place orders directly to the kitchen.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/tables"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-teal-50 py-2.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-700/15 transition-colors hover:bg-teal-100"
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
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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
        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-700"
      >
        View Orders
      </Link>
    </div>
  );
}
