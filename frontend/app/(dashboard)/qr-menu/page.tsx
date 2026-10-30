"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Printer,
  QrCode,
  Share2,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useFloors } from "@/hooks/use-tables";
import { useSettings } from "@/hooks/use-settings";

export default function QrMenuDashboardPage() {
  const { branchId, isLoading: branchLoading } = useBranch();
  const { data: floors, isLoading: floorsLoading } = useFloors(branchId);
  const { data: settings } = useSettings(branchId);
  const [copied, setCopied] = useState(false);

  const tables = floors?.flatMap((f) => f.tables) ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const universalUrl = branchId ? `${origin}/menu-order/${branchId}` : "";

  const handleCopy = () => {
    if (!universalUrl) return;
    navigator.clipboard.writeText(universalUrl);
    setCopied(true);
    toast.success("Menu URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintUniversal = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">QR Code Menu & Self-Order</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Customers can scan these QR codes to view live items, order on table, or request home delivery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.open(universalUrl, "_blank")}
            variant="outline"
            className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open Customer Menu
          </Button>
          <Button
            onClick={handleCopy}
            className="rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied!" : "Copy Public Link"}
          </Button>
        </div>
      </div>

      {/* Main Universal QR Feature Card */}
      <Card className="flex flex-col lg:flex-row items-center gap-8 p-8 border-slate-200/90 bg-white shadow-xs rounded-3xl">
        {/* QR Display */}
        <div className="flex flex-col items-center gap-3 shrink-0 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-2xs">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            {universalUrl ? (
              <QRCodeSVG
                value={universalUrl}
                size={200}
                level="H"
                includeMargin
                imageSettings={{
                  src: "/logo.png",
                  x: undefined,
                  y: undefined,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            ) : (
              <Skeleton className="h-[200px] w-[200px] rounded-xl" />
            )}
          </div>
          <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Scan to Open Live Menu
          </span>
        </div>

        {/* Info & Details */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-500/20">
              Universal Smart QR
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              One QR for Dine-In & Home Delivery
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              When customers scan this QR code, they can choose between ordering directly to their table or ordering home delivery with live real-time kitchen tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">On-Table Dining</p>
                <p className="text-[11px] text-slate-500">Customer picks table & waiter/kitchen receives ticket instant</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Home Delivery</p>
                <p className="text-[11px] text-slate-500">Address & phone logged automatically in delivery queue</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handlePrintUniversal}
              variant="outline"
              className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-4 w-4 mr-1.5 text-slate-500" />
              Print Menu Standee / Tent Card
            </Button>
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <Share2 className="h-4 w-4 mr-1.5 text-slate-500" />
              Share Link with Customers
            </Button>
          </div>
        </div>
      </Card>

      {/* Table-by-Table Standee QR Codes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Table Standee QR Cards</h2>
            <p className="text-xs text-slate-500">Individual QR cards mapped specifically to each physical table</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {tables.length} {tables.length === 1 ? "Table configured" : "Tables configured"}
          </span>
        </div>

        {floorsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.map((table) => {
              const tableUrl = `${origin}/menu-order/${branchId}?tableId=${table.id}`;
              return (
                <Card
                  key={table.id}
                  className="flex flex-col items-center justify-between p-4 border-slate-200/80 bg-white shadow-2xs hover:shadow-md transition-all rounded-2xl text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{table.name ?? `Table ${table.number}`}</span>
                    <div className="rounded-xl bg-white p-2 border border-slate-200 shadow-2xs">
                      <QRCodeSVG value={tableUrl} size={110} level="M" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Capacity: {table.capacity} Guests</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(tableUrl);
                      toast.success(`Copied link for ${table.name ?? `Table ${table.number}`}!`);
                    }}
                    className="mt-3 w-full h-8 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Copy Link
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
