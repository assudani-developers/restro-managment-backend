"use client";

import type { SessionUser } from "@restrocore/types";
import { BedDouble, BookMarked, ConciergeBell, Menu, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EntityDialogHost } from "@/components/layout/entity-dialog-host";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { BrandTheme } from "@/components/hotel/brand-theme";
import { useBranch } from "@/hooks/use-branch";
import { hasPermission } from "@/hooks/use-auth";
import { useHotelSettings } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";
import { BranchSwitcher } from "./branch-switcher";
import { SuperAdminRestaurantSwitcher } from "./superadmin-restaurant-switcher";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { CreditFooter } from "./credit-footer";

/** Tenant brand mark: the hotel's logo, else a monogram in its brand colours. */
export function HotelMark({ size = 40, className }: { size?: number; className?: string }) {
  const { branchId } = useBranch();
  const { data } = useHotelSettings(branchId);
  const name = data?.hotelName ?? "Hotel";
  const initials = name
    .split(/\s+/)
    .filter((w) => !/^(the|and|of)$/i.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (data?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={data.logoUrl} alt={name} style={{ width: size, height: size }} className={cn("shrink-0 rounded-xl bg-white object-contain p-1", className)} />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-display font-semibold text-[#FFF8F0] shadow-lg ring-1 ring-white/15 [background-image:var(--gradient-primary)]",
        className,
      )}
    >
            {initials}
    </span>
  );
}

function HotelBrand({ compact }: { compact?: boolean }) {
  const { branchId } = useBranch();
  const { data } = useHotelSettings(branchId);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <HotelMark size={compact ? 36 : 42} />
      {!compact && (
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-semibold leading-tight text-[#FFF8F0]">{data?.hotelName ?? "Your Hotel"}</p>
          <p className="truncate text-[11px] text-[#E9DCC8]/55">{data?.tagline ?? ""}</p>
        </div>
      )}
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden flex-col items-end leading-tight xl:flex">
      <span className="font-display text-sm font-semibold tabular-nums">{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</span>
    </div>
  );
}

export function AppShell({ user, children }: { user?: SessionUser; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const canFrontDesk = user?.isSuperAdmin || hasPermission(user, "hotel.frontdesk");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("hotel_sidebar_collapsed") === "true") setCollapsed(true);
    } catch {
      // storage blocked
    }
  }, []);

  const toggleSidebar = () =>
    setCollapsed((prev) => {
      try {
        localStorage.setItem("hotel_sidebar_collapsed", String(!prev));
      } catch {
        // storage blocked
      }
      return !prev;
    });

  const sidebarBody = (onNavigate?: () => void, isCollapsed = false) => (
    <>
      {!isCollapsed && (
        <div className="shrink-0 space-y-2 px-3 pb-3">
          {user?.isSuperAdmin && <SuperAdminRestaurantSwitcher />}
          <div className="[&_button]:border-white/10 [&_button]:bg-white/[0.04] [&_button]:text-[#E9DCC8]">
            <BranchSwitcher />
          </div>
        </div>
      )}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-3">
        <SidebarNav user={user} collapsed={isCollapsed} onNavigate={onNavigate} />
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <BrandTheme />
      <aside
        className={cn(
          "relative hidden h-full shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)] lg:flex print-hidden",
          collapsed ? "w-[76px]" : "w-[272px]",
        )}
      >
        <div className={cn("relative flex h-20 shrink-0 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
          <HotelBrand compact={collapsed} />
          {!collapsed && (
            <button type="button" onClick={toggleSidebar} aria-label="Collapse sidebar" className="rounded-lg p-1.5 text-[#E9DCC8]/45 hover:bg-white/10 hover:text-[#FFF8F0]">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={toggleSidebar} aria-label="Expand sidebar" className="relative mx-auto mb-2 rounded-lg p-1.5 text-[#E9DCC8]/45 hover:bg-white/10 hover:text-[#FFF8F0]">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">{sidebarBody(undefined, collapsed)}</div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex h-full w-[86vw] max-w-[300px] flex-col border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-20 shrink-0 items-center px-4">
            <HotelBrand />
          </div>
          {sidebarBody(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-3 backdrop-blur-xl sm:px-6 print-hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <HotelMark size={32} />
            </div>
            {canFrontDesk && (
              <div className="hidden items-center gap-1.5 md:flex">
                <Link href="/bookings?new=1" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-primary-foreground shadow-[0_8px_18px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] [background-image:var(--gradient-primary)] hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" /> New booking
                </Link>
                <Link href="/front-desk" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted">
                  <BedDouble className="h-3.5 w-3.5 text-brand" /> Room board
                </Link>
                <Link href="/room-service" className="hidden h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted lg:inline-flex">
                  <ConciergeBell className="h-3.5 w-3.5 text-brand" /> Room service
                </Link>
                <Link href="/bookings" className="hidden h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted xl:inline-flex">
                  <BookMarked className="h-3.5 w-3.5 text-brand" /> Folios
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden 2xl:block">{user?.isSuperAdmin && <SuperAdminRestaurantSwitcher />}</div>
            <LiveClock />
            <span className="hidden h-6 w-px bg-border sm:block" />
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] min-[360px]:p-4 sm:p-6 lg:p-8 lg:pb-10">
          {children}
          <CreditFooter />
        </main>
        <EntityDialogHost />
      </div>
      <MobileBottomNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
