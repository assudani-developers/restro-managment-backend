import { CalendarPlus, ChefHat, LayoutGrid, ShoppingCart, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/pos", label: "New POS Order", icon: ShoppingCart, bg: "bg-white text-primary hover:bg-accent border-primary/20" },
  { href: "/tables", label: "Floor & Tables", icon: LayoutGrid, bg: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80" },
  { href: "/reservations", label: "Reservations", icon: CalendarPlus, bg: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80" },
  { href: "/kds", label: "Kitchen Display (KDS)", icon: ChefHat, bg: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80" },
  { href: "/menu", label: "Menu Items", icon: UtensilsCrossed, bg: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80" },
];

export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
            action.bg,
          )}
        >
          <action.icon className="h-4 w-4 shrink-0" />
          <span>{action.label}</span>
        </Link>
      ))}
    </section>
  );
}
