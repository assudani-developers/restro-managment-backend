"use client";

import type { SessionUser } from "@restrocore/types";
import { ChefHat, Clock, LayoutGrid, Menu, PanelLeft, PanelLeftClose, PanelLeftOpen, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EntityDialogHost } from "@/components/layout/entity-dialog-host";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { BrandFooter } from "./brand-footer";
import { BranchSwitcher } from "./branch-switcher";
import { SuperAdminRestaurantSwitcher } from "./superadmin-restaurant-switcher";
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
        <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
          {restaurant.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo size={32} />
      <span className="truncate text-base font-semibold tracking-tight text-slate-900">
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
      <Clock className="h-3.5 w-3.5 text-primary" />
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("restrocore_sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {
      // Local storage inaccessible
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("restrocore_sidebar_collapsed", String(next));
      } catch {
        // Local storage inaccessible
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-background text-foreground">
      {/* Desktop collapsible sidebar */}
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-slate-200/80 bg-sidebar lg:flex transition-[width] duration-200 ease-in-out",
          collapsed ? "w-18" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border/80 px-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && <RestaurantBrand />}
          {collapsed && <Logo size={32} />}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        {!collapsed && (
          <div className="shrink-0 space-y-2 border-b border-sidebar-border/70 px-3 py-4">
            {user?.isSuperAdmin && <SuperAdminRestaurantSwitcher />}
            <BranchSwitcher />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <SidebarNav user={user} collapsed={collapsed} />
        </div>
        {!collapsed && (
          <div className="shrink-0">
            <BrandFooter />
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex h-full w-72 flex-col bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/80 px-5">
            <RestaurantBrand />
          </div>
          <div className="shrink-0 space-y-2 border-b border-sidebar-border/70 px-3 py-4">
            {user?.isSuperAdmin && <SuperAdminRestaurantSwitcher />}
            <BranchSwitcher />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-4">
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="shrink-0">
            <BrandFooter />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 shadow-[0_1px_3px_rgb(17_24_39/0.03)] backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-primary lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>

            {/* Quick Terminal Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/pos"
                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-teal-900/15 transition-all hover:-translate-y-px hover:bg-teal-800 hover:shadow-md"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                POS Terminal
              </Link>
              <Link
                href="/tables"
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                Tables
              </Link>
              <Link
                href="/kds"
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <ChefHat className="h-3.5 w-3.5 text-slate-500" />
                KDS Kitchen
              </Link>
            </div>
          </div>

          <div className="min-w-0 flex-1 px-1.5 lg:hidden sm:px-3">
            <RestaurantBrand />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden xl:block">
              <SuperAdminRestaurantSwitcher />
            </div>
            <LiveClock />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-background/80 p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] min-[360px]:p-4 min-[360px]:pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-7 lg:pb-8">
          {children}
        </main>
        <EntityDialogHost />
      </div>
      <MobileBottomNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
