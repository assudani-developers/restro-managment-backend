"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CartLine } from "@/components/pos/cart-line";
import type { RestaurantTable } from "@/hooks/use-tables";
import { formatCurrency } from "@/lib/format";
import { subtotalOf } from "@/lib/pricing-preview";

export type PosOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export interface DeliveryDetails {
  address: string;
  pincode: string;
  phone: string;
}

export function CartPanel({
  lines,
  orderType,
  onOrderTypeChange,
  tables,
  tableId,
  onTableChange,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
  isSubmitting,
  existingOrderNumber,
  onViewExistingOrder,
  openBills,
  selectedBillId,
  onSelectBill,
  checkingTable = false,
  delivery,
  onDeliveryChange,
  scheduledFor,
  onScheduledForChange,
}: {
  lines: CartLine[];
  orderType: PosOrderType;
  onOrderTypeChange: (type: PosOrderType) => void;
  tables: RestaurantTable[];
  tableId: string;
  onTableChange: (id: string) => void;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  existingOrderNumber?: string;
  onViewExistingOrder?: () => void;
  openBills?: { id: string; orderNumber: string }[];
  selectedBillId?: string | null;
  onSelectBill?: (id: string) => void;
  checkingTable?: boolean;
  delivery: DeliveryDetails;
  onDeliveryChange: (d: DeliveryDetails) => void;
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
}) {
  const subtotal = subtotalOf(lines.map((l) => l.unitPrice * l.quantity));
  const deliveryReady =
    orderType !== "DELIVERY" ||
    (delivery.address.trim().length >= 5 && delivery.pincode.trim().length >= 3 && delivery.phone.trim().length >= 6);
  const canSubmit =
    lines.length > 0 && (orderType !== "DINE_IN" || !!tableId) && deliveryReady && !isSubmitting && !checkingTable;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
      <Tabs value={orderType} onValueChange={(v) => onOrderTypeChange(v as PosOrderType)}>
        <TabsList className="w-full bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="DINE_IN" className="flex-1 rounded-lg font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-xs">
            Dine-in
          </TabsTrigger>
          <TabsTrigger value="TAKEAWAY" className="flex-1 rounded-lg font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-xs">
            Takeaway
          </TabsTrigger>
          <TabsTrigger value="DELIVERY" className="flex-1 rounded-lg font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-xs">
            Delivery
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {orderType === "DINE_IN" && (
        <Select value={tableId} onValueChange={(v) => onTableChange(v ?? "")}>
          <SelectTrigger className="w-full h-11 rounded-xl border-slate-300 bg-white text-slate-800">
            <SelectValue placeholder="Select Table">
              {(value: string | null) => {
                const t = tables.find((table) => table.id === value);
                if (!t) return "Select Table";
                return `${t.name ?? `Table ${t.number}`}${t.status === "OCCUPIED" ? " (Occupied)" : ""}`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
            {tables.map((t) => (
              <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                {t.name ?? `Table ${t.number}`} {t.status === "OCCUPIED" ? "(Occupied)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {orderType === "DELIVERY" && (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Delivery address"
            value={delivery.address}
            onChange={(e) => onDeliveryChange({ ...delivery, address: e.target.value })}
            className="rounded-xl border-slate-300 bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Pincode"
              inputMode="numeric"
              value={delivery.pincode}
              onChange={(e) => onDeliveryChange({ ...delivery, pincode: e.target.value })}
              className="rounded-xl border-slate-300 bg-white"
            />
            <Input
              placeholder="Phone number"
              inputMode="tel"
              value={delivery.phone}
              onChange={(e) => onDeliveryChange({ ...delivery, phone: e.target.value })}
              className="rounded-xl border-slate-300 bg-white"
            />
          </div>
        </div>
      )}

      {orderType !== "DINE_IN" && (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Schedule for later (optional)
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => onScheduledForChange(e.target.value)}
            className="rounded-xl border-slate-300 bg-white"
          />
        </label>
      )}

      {checkingTable && (
        <p role="status" className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Checking open bills for this table…
        </p>
      )}

      {openBills && openBills.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 rounded-xl bg-slate-50 p-2 border border-slate-200" role="group" aria-label="Open bills on this table">
          <span className="font-semibold text-slate-700">{openBills.length} open bills:</span>
          {openBills.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.id === selectedBillId ? "default" : "outline"}
              className="h-7 px-2.5 text-xs rounded-lg font-semibold"
              aria-pressed={b.id === selectedBillId}
              onClick={() => onSelectBill?.(b.id)}
            >
              #{b.orderNumber}
            </Button>
          ))}
        </div>
      )}

      {existingOrderNumber && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <span>
            Open round exists on this table:{" "}
            <span className="font-bold">#{existingOrderNumber}</span>
          </span>
          {onViewExistingOrder && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2.5 text-xs rounded-lg border-amber-300 bg-white font-semibold text-amber-800 hover:bg-amber-100"
              onClick={onViewExistingOrder}
            >
              View & Pay
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400 py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Cart is currently empty</p>
            <p className="text-xs text-slate-400">Tap items on the left to add them to this ticket</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{line.name}</p>
                  {line.modifierLabel && (
                    <p className="text-xs text-slate-500 mt-0.5">{line.modifierLabel}</p>
                  )}
                  <p className="mt-1 text-sm font-bold tabular-nums text-teal-700">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg border-slate-200 hover:bg-slate-100"
                    onClick={() => onDecrement(line.key)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-900">{line.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg border-slate-200 hover:bg-slate-100"
                    onClick={() => onIncrement(line.key)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => onRemove(line.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">Subtotal (incl. taxes)</span>
          <span className="text-lg font-extrabold tabular-nums text-slate-900">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <Button
          className="h-12 w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-sm font-bold text-white shadow-md shadow-teal-600/25 transition-all hover:from-teal-500 hover:to-teal-600 disabled:opacity-50"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isSubmitting
            ? "Sending to kitchen…"
            : existingOrderNumber
              ? "Add Items & Send to Kitchen"
              : "Send Ticket to Kitchen"}
        </Button>
      </div>
    </div>
  );
}
