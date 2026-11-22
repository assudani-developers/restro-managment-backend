"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GeofenceGate } from "@/components/hotel/geofence-gate";
import { useCurrentUser } from "@/hooks/use-auth";
import { BranchProvider, useBranch } from "@/hooks/use-branch";
import { useRealtime } from "@/hooks/use-realtime";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { canOpen, firstAllowedHref } from "@/lib/route-access";

// Subscribes every route in this layout group to realtime push (order/KOT/
// table updates) instead of only the one page (KDS) that happened to call
// useRealtime itself — the Dashboard summary page had NO push subscription
// at all and relied solely on its own 15s/60s polling (see use-dashboard.ts),
// so a payment completed at one terminal took up to 15s to show up on a
// manager's dashboard tab elsewhere, or never did if that tab predates the
// poll window. Rendered as a child of BranchProvider (not the layout
// component itself) since useBranch() needs to run below the provider.
function RealtimeBridge() {
  const { branchId } = useBranch();
  useRealtime(branchId);
  return null;
}

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError, error } = useCurrentUser();
  const permissions = data?.user.permissions;
  const isSuper = Boolean(data?.user.isSuperAdmin || data?.user.roleName === "SUPERADMIN");
  const allowed = isSuper || !permissions || canOpen(pathname ?? "", permissions, NAV_ITEMS);
  const fallback = permissions ? firstAllowedHref(permissions, NAV_ITEMS) : undefined;

  const isSuspended =
    Boolean(error?.message && (error.message.includes("ACCOUNT_SUSPENDED") || error.message.includes("suspended")));

  const isRevoked =
    Boolean(
      error?.message &&
        (error.message.includes("MASTER_ADMIN_REVOKED") ||
          error.message.includes("USER_DEACTIVATED") ||
          error.message.includes("revoked")),
    );

  useEffect(() => {
    if (!isLoading && isError && !isSuspended && !isRevoked) {
      router.replace("/login");
    }
  }, [isLoading, isError, isSuspended, isRevoked, router]);

  // Direct URL to a page the role may not use (e.g. a waiter opening /dashboard
  // after login): send them to their first permitted screen.
  useEffect(() => {
    if (!allowed && fallback && fallback !== pathname) router.replace(fallback);
  }, [allowed, fallback, pathname, router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  if (isSuspended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Hotel Account Suspended</h2>
          <p className="mt-2 text-sm text-slate-600">
            This hotel account has been suspended in real time by the SaaS platform administrator. All billing, table ordering, and kitchen operations are currently paused.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/login";
              }}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
        {fallback ? "Redirecting…" : "Your role has no access to this page. Ask an administrator."}
      </div>
    );
  }

  return (
    <BranchProvider>
      <RealtimeBridge />
      <GeofenceGate bypass={isSuper}>
        <AppShell user={data.user}>{children}</AppShell>
      </GeofenceGate>
    </BranchProvider>
  );
}
