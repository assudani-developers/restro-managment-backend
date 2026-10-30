"use client";

import type { SessionUser } from "@restrocore/types";
import { ChefHat, Clock, LayoutGrid, Menu, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EntityDialogHost } from "@/components/layout/entity-dialog-host";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { BrandFooter } from "./brand-footer";
import { BranchSwitcher } from "./branch-switcher";
import { Logo } from "./logo";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function RestaurantBrand() {
  const { branchId } = useBranch();
  const { data } = useSettings(branchId);
  const restaurant = data?.restaurant;

  if (restaurant?.logoUrl) {
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={restaurant.logoUrl}
          alt={restaurant.name}
          className="h-8 w-8 shrink-0 rounded-lg object-contain shadow-xs"
        />
        <span className="truncate text-sm font-bold tracking-tight text-slate-900">
          {restaurant.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo size={32} />
      <span className="truncate text-base font-bold tracking-tight text-slate-900">
        {restaurant?.name ?? "RestroCore"}
      </span>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <Clock className="h-3.5 w-3.5 text-indigo-600" />
      <span className="tabular-nums">{time}</span>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user?: SessionUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex h-full">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-100 shrink-0">
          <RestaurantBrand />
        </div>
        <div className="px-3 py-3 border-b border-slate-100/60 shrink-0">
          <BranchSwitcher />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav user={user} />
        </div>
        <div className="shrink-0">
          <BrandFooter />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-white p-0 flex flex-col h-full">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-100 shrink-0">
            <RestaurantBrand />
          </div>
          <div className="px-3 py-3 border-b border-slate-100/60 shrink-0">
            <BranchSwitcher />
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="shrink-0">
            <BrandFooter />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Terminal Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/pos"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                POS Terminal
              </Link>
              <Link
                href="/tables"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                Tables
              </Link>
              <Link
                href="/kds"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <ChefHat className="h-3.5 w-3.5 text-slate-500" />
                KDS Kitchen
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.isSuperAdmin && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-2.5 py-1 border border-amber-200 text-xs font-bold text-amber-900 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">👑 SuperAdmin Mode</span>
                <Link
                  href="/superadmin"
                  className="inline-flex items-center rounded-lg bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors ml-1"
                >
                  Portal ↗
                </Link>
              </div>
            )}
            <LiveClock />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
        <EntityDialogHost />
      </div>
      <MobileBottomNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
