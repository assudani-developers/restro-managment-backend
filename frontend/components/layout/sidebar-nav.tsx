"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
}: {
  user?: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {(user?.isSuperAdmin || user?.roleName === "SUPERADMIN") && (
        <Link
          href="/superadmin"
          onClick={onNavigate}
          className={cn(
            "mb-2.5 flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all shadow-xs",
            pathname === "/superadmin"
              ? "bg-amber-600 text-white shadow-amber-600/25 ring-2 ring-amber-600/30"
              : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700",
          )}
        >
          <span className="flex items-center gap-2">
            👑 SuperAdmin Hub
          </span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
            SaaS
          </span>
        </Link>
      )}
      {NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission)).map(
        (item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
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
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                  strokeWidth={isActive ? 2.3 : 2}
                />
                <span className="truncate">{t(item.labelKey)}</span>
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
