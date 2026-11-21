"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { DEFAULT_MODULES_BY_BUSINESS, type BusinessType, type SessionUser } from "@restrocore/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useBranch } from "@/hooks/use-branch";
import { useHotelSettings } from "@/hooks/use-hotel";
import { NAV_GROUPS, NAV_ITEMS } from "./nav-items";

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
  const isSuper = user?.isSuperAdmin || user?.roleName === "SUPERADMIN";
  const { branchId } = useBranch();
  const { data: hotel } = useHotelSettings(branchId);
  const modules: readonly string[] = hotel?.enabledModules?.length
    ? hotel.enabledModules
    : DEFAULT_MODULES_BY_BUSINESS[(hotel?.businessType as BusinessType | undefined) ?? "RESTAURANT"];
  const allowed = NAV_ITEMS.filter((item) =>
    (!item.permission || isSuper || hasPermission(user, item.permission))
    && (!item.module || modules.includes(item.module))
  );

  const activeHref = allowed
    .filter((i) => pathname === i.href || pathname?.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Main navigation" className={cn("flex flex-col", collapsed ? "items-center gap-1 px-2" : "gap-5 px-3")}>
      {isSuper && (
        <Link
          href="/superadmin"
          onClick={onNavigate}
          title="SaaS Platform Control"
          className={cn(
            "flex items-center gap-2.5 rounded-xl border text-xs font-semibold transition-colors",
            collapsed ? "h-10 w-10 justify-center" : "px-3 py-2.5",
            pathname === "/superadmin"
              ? "border-brand-accent/60 bg-brand-accent/20 text-[#FBE9C9]"
              : "border-white/10 bg-white/[0.04] text-[#E9DCC8] hover:bg-white/[0.08]",
          )}
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-accent" />
          {!collapsed && (
            <>
              <span className="flex-1">Platform admin</span>
              <span className="rounded bg-brand-accent/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FBE9C9]">SaaS</span>
            </>
          )}
        </Link>
      )}

      {NAV_GROUPS.map((group) => {
        const items = allowed.filter((i) => i.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className={cn("flex flex-col", collapsed ? "items-center gap-1" : "gap-0.5")}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[11px] font-medium text-[#E9DCC8]/40">{group}</p>
            )}
            {collapsed && <span className="my-1 h-px w-6 bg-white/10" />}
            {items.map((item) => {
              const isActive = item.href === activeHref;
              const Icon = item.icon;
              const label = item.label ?? t(item.labelKey);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center text-[13px] font-medium transition-colors",
                    collapsed ? "h-10 w-10 justify-center rounded-xl" : "min-h-9 gap-3 rounded-xl px-3 py-2",
                    isActive ? "text-[#FFF8F0]" : "text-[#E9DCC8]/65 hover:bg-white/[0.05] hover:text-[#FFF8F0]",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 520, damping: 40 }}
                      className="absolute inset-0 rounded-xl bg-[linear-gradient(100deg,color-mix(in_oklab,var(--primary)_75%,transparent),color-mix(in_oklab,var(--primary)_35%,transparent))] ring-1 ring-white/10"
                    />
                  )}
                  {isActive && !collapsed && (
                    <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-accent" />
                  )}
                  <Icon className={cn("relative h-4 w-4 shrink-0", isActive ? "text-[#FBE9C9]" : "text-[#E9DCC8]/45 group-hover:text-[#E9DCC8]")} />
                  {!collapsed && <span className="relative truncate">{label}</span>}
                  {badges.nav[item.href] && !isActive && (
                    <span className={cn("absolute h-2 w-2 rounded-full bg-brand-accent shadow-[0_0_10px_2px_color-mix(in_oklab,var(--brand-accent)_60%,transparent)]", collapsed ? "top-2 right-2" : "right-3")} />
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
