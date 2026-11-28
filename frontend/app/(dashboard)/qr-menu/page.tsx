"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import {
  Check,
  Copy,
  ArrowUpRight,
  ExternalLink,
  Printer,
  QrCode,
  Share2,
  Sparkles,
  Store,
  Download,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useFloors } from "@/hooks/use-tables";
import { useCurrentUser } from "@/hooks/use-auth";
import { MenuDesignStudio } from "@/components/menu/menu-design-studio";
import { MenuOcrDialog } from "@/components/menu/menu-ocr-dialog";

export default function QrMenuDashboardPage() {
  const { branchId, branches, state: branchState, error: branchError, retry: retryBranches, retrying: retryingBranches } = useBranch();
  const { data: currentUser } = useCurrentUser();
  const {
    data: floors,
    isLoading: floorsLoading,
    isError: floorsError,
    error: floorsQueryError,
    refetch: refetchFloors,
    isFetching: floorsFetching,
  } = useFloors(branchId);
  const [copied, setCopied] = useState(false);

  const tables = floors?.flatMap((f) => f.tables) ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const universalUrl = branchId ? `${origin}/menu-order/${branchId}` : "";
  const activeBranch = branches.find((branch) => branch.id === branchId);

  const handleGenerateQr = () => {
    if (!universalUrl) {
      toast.error("Select or create a branch before generating its menu QR code.");
      return;
    }

    const qr = document.getElementById("universal-menu-qr");
    if (!(qr instanceof SVGElement)) {
      toast.error("Could not prepare the QR code. Please refresh and try again.");
      return;
    }

    const svg = qr.cloneNode(true) as SVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const file = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    const branchSlug = (activeBranch?.name ?? "restaurant")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.href = downloadUrl;
    link.download = `${branchSlug || "restaurant"}-menu-qr.svg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    toast.success("QR code downloaded as an SVG.");
  };

  const handleCopy = () => {
    if (!universalUrl) return;
    void navigator.clipboard.writeText(universalUrl).then(
      () => {
        setCopied(true);
        toast.success("Menu URL copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Could not copy the menu link. Please copy it from the address bar."),
    );
  };

  const handlePrintUniversal = () => {
    if (!universalUrl) return;
    window.print();
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 sm:gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Guest experience
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            QR menu &amp; ordering
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            One scan takes guests to your live menu for table service or home delivery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MenuOcrDialog branchId={branchId} triggerLabel="Scan menu (OCR)" />
          <Button onClick={handleGenerateQr} disabled={branchState === "loading" || branchState === "error"}>
            <Download data-icon="inline-start" />
            Create QR code
          </Button>
          {branchState === "ready" && (
            <>
              <Button
                onClick={() => window.open(universalUrl, "_blank", "noopener,noreferrer")}
                variant="outline"
              >
                <ExternalLink data-icon="inline-start" />
                Preview menu
              </Button>
              <Button onClick={handleCopy} variant="secondary">
                {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </>
          )}
          {branchState === "empty" && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              <Store className="h-4 w-4" />
              Branch setup required
            </span>
          )}
          </div>
      </header>

      {branchState === "ready" ? (
        <>
          <Card className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-center lg:gap-10 lg:p-8">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
              <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                <QRCodeSVG id="universal-menu-qr" value={universalUrl} size={188} level="H" includeMargin />
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                <QrCode className="h-4 w-4 text-primary" />
                Ready to print or share
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  One link, two ways to order
                </span>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  A smoother way to order
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Guests scan once, browse your live menu, then choose dine-in or delivery. Orders go straight to your team.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Dine at your table</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Guests select a table; the order reaches your kitchen.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Order for delivery</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Delivery details are added to your order queue.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button onClick={handlePrintUniversal} variant="outline">
                  <Printer data-icon="inline-start" />
                  Print QR standee
                </Button>
                <Button onClick={handleCopy} variant="secondary">
                  <Share2 data-icon="inline-start" />
                  {copied ? "Link copied" : "Share menu link"}
                </Button>
              </div>
            </div>
          </Card>

          <section className="space-y-4" aria-labelledby="table-qr-heading">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Table service
                </p>
                <h2 id="table-qr-heading" className="text-lg font-semibold tracking-tight text-foreground">
                  Table QR codes
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Each code opens the menu with its table already selected.
                </p>
              </div>
              <span className="w-fit rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {tables.length} {tables.length === 1 ? "table" : "tables"}
              </span>
            </div>

            {floorsError ? (
              <QueryError
                error={floorsQueryError}
                what="your tables"
                onRetry={() => void refetchFloors()}
                retrying={floorsFetching}
              />
            ) : floorsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center sm:py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No tables set up yet</h3>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  Your universal QR menu is ready to share. Add tables to create individual dine-in QR codes.
                </p>
                <Button nativeButton={false} render={<Link href="/tables" />} className="mt-4">
                  Set up tables
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {tables.map((table) => {
                  const tableUrl = `${origin}/menu-order/${branchId}?tableId=${table.id}`;
                  return (
                    <Card key={table.id} className="flex flex-row items-center gap-4 p-4">
                      <div className="rounded-xl border border-border bg-white p-2">
                        <QRCodeSVG value={tableUrl} size={88} level="M" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-semibold text-foreground">{table.name ?? `Table ${table.number}`}</span>
                        <span className="text-xs text-muted-foreground">Seats {table.capacity} guests</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(tableUrl).then(
                              () => toast.success(`Copied link for ${table.name ?? `Table ${table.number}`}!`),
                              () => toast.error("Could not copy the table link. Please try again."),
                            );
                          }}
                          className="mt-2 w-fit"
                        >
                          <Copy data-icon="inline-start" />
                          Copy table link
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <MenuDesignStudio previewUrl={universalUrl} />
        </>
      ) : branchState === "loading" ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : branchState === "error" ? (
        <QueryError error={branchError} what="your branches" onRetry={retryBranches} retrying={retryingBranches} />
      ) : (
        <Card className="gap-5 p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Store className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                QR setup · Step 1 of 3
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Connect a branch to start taking QR orders
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Select a restaurant with an active branch from the workspace switcher, or ask an administrator to assign one to this account.
              </p>
            </div>
            <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              Action needed
            </span>
          </div>

          <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/20 bg-accent/50 p-4">
              <p className="text-xs font-semibold text-primary">01 · FIRST</p>
              <p className="mt-2 text-sm font-semibold text-foreground">Assign a branch</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Required to create a menu link for the right restaurant.</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground">02 · NEXT</p>
              <p className="mt-2 text-sm font-semibold text-foreground">Add your tables</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Create individual table QR codes for dine-in guests.</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground">03 · THEN</p>
              <p className="mt-2 text-sm font-semibold text-foreground">Share your menu</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Print your QR standee or share the public link.</p>
            </div>
          </div>
          {currentUser?.user.isSuperAdmin || currentUser?.user.roleName === "SUPERADMIN" ? (
            <Button nativeButton={false} render={<Link href="/superadmin" />} variant="outline" className="w-fit">
              Open restaurant &amp; branch setup
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          ) : (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              Ask your administrator to assign a branch, then use <span className="font-semibold text-foreground">Create QR code</span> above to download your menu QR.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
