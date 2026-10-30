import { CalendarPlus, ChefHat, LayoutGrid, ShoppingCart, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/pos", label: "New POS Order", icon: ShoppingCart, bg: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border-indigo-200/80" },
  { href: "/tables", label: "Floor & Tables", icon: LayoutGrid, bg: "bg-blue-50 text-blue-700 hover:bg-blue-100/80 border-blue-200/80" },
  { href: "/reservations", label: "Reservations", icon: CalendarPlus, bg: "bg-amber-50 text-amber-700 hover:bg-amber-100/80 border-amber-200/80" },
  { href: "/kds", label: "Kitchen Display (KDS)", icon: ChefHat, bg: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200/80" },
  { href: "/menu", label: "Menu Items", icon: UtensilsCrossed, bg: "bg-purple-50 text-purple-700 hover:bg-purple-100/80 border-purple-200/80" },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all hover:-translate-y-0.5 active:translate-y-0",
            action.bg,
          )}
        >
          <action.icon className="h-4 w-4 shrink-0" />
          <span>{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
