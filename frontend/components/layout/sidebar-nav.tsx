"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { SessionUser } from "@restrocore/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({
  user,
  onNavigate,
  collapsed = false,
}: {
  user?: SessionUser;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();

  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "px-2 items-center" : "px-3")}>
      {(user?.isSuperAdmin || user?.roleName === "SUPERADMIN") && (
        <Link
          href="/superadmin"
          onClick={onNavigate}
          title={collapsed ? "SuperAdmin Hub (SaaS Platform Control)" : undefined}
          className={cn(
            "mb-2.5 flex items-center transition-all shadow-xs border",
            collapsed
              ? "h-10 w-10 justify-center rounded-xl mx-auto"
              : "justify-between rounded-xl px-3 py-2.5 text-xs font-bold w-full",
            pathname === "/superadmin"
              ? "bg-amber-600 text-white border-amber-600 shadow-amber-600/25"
              : "bg-amber-50 text-amber-950 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300",
          )}
        >
          {collapsed ? (
            <ShieldCheck className={cn("h-5 w-5 shrink-0", pathname === "/superadmin" ? "text-white" : "text-amber-700")} />
          ) : (
            <>
              <span className="flex items-center gap-2">
                <ShieldCheck className={cn("h-4 w-4 shrink-0", pathname === "/superadmin" ? "text-white" : "text-amber-700")} />
                SuperAdmin Hub
              </span>
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                  pathname === "/superadmin" ? "bg-white/20 text-white" : "bg-amber-200/70 text-amber-900",
                )}
              >
                SaaS
              </span>
            </>
          )}
        </Link>
      )}
      {NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission)).map(
        (item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          const label = t(item.labelKey);

          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={label}
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150",
                  isActive
                    ? "bg-indigo-50 font-semibold text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                  strokeWidth={isActive ? 2.3 : 2}
                />
                {badges.nav[item.href] && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                )}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 font-semibold text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                  strokeWidth={isActive ? 2.3 : 2}
                />
                <span className="truncate">{label}</span>
              </div>

              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
              )}

              {badges.nav[item.href] && !isActive ? <NavDot /> : null}
            </Link>
          );
        },
      )}
    </nav>
  );
}
