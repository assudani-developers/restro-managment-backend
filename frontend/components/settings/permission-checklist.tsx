"use client";

import { PERMISSIONS } from "@restrocore/types";
import { Checkbox } from "@/components/ui/checkbox";

/** Maps permission keys to the exact sidebar screens/pages they unlock. */
export const PERMISSION_SCREENS: Record<string, string[]> = {
  "dashboard.sales.view": ["Dashboard", "Restaurant Sales"],
  "hotel.frontdesk": ["Rooms (Front Desk)", "Bookings", "Guest Messages"],
  "hotel.housekeeping": ["Housekeeping"],
  "hotel.events": ["Events & Marriage Garden"],
  "hotel.pool": ["Swimming Pool"],
  "hotel.setup": ["Hotel Setup"],
  "hotel.payments": ["Folio Payments & Refunds"],
  "orders.create": ["POS", "Room Service", "Orders"],
  "tables.view": ["Tables"],
  "tables.manage": ["Tables"],
  "kds.manage": ["Kitchen Display (KDS)"],
  "menu.view": ["Menu", "QR Codes", "Online Menu"],
  "menu.manage": ["Menu", "QR Codes", "Online Menu"],
  "reservations.manage": ["Table Bookings"],
  "delivery.manage": ["Delivery"],
  "customers.manage": ["Guests / CRM"],
  "accounting.manage": ["Accounting"],
  "reports.access": ["Reports"],
  "inventory.manage": ["Inventory"],
  "staff.manage": ["Staff"],
  "attendance.manage": ["Attendance"],
  "marketing.manage": ["Marketing"],
  "operations.manage": ["Maintenance"],
  "settings.manage": ["Settings"],
  "users.manage": ["Staff Accounts"],
  "roles.manage": ["Roles & Permissions"],
};

const GROUPED_PERMISSIONS = (() => {
  const map = new Map<string, (typeof PERMISSIONS)[number][]>();
  for (const permission of PERMISSIONS) {
    const list = map.get(permission.category) ?? [];
    list.push(permission);
    map.set(permission.category, list);
  }
  return [...map.entries()];
})();

export function getVisibleScreensForPermissions(held: readonly string[]): string[] {
  const screens = new Set<string>();
  for (const key of held) {
    const list = PERMISSION_SCREENS[key];
    if (list) list.forEach((s) => screens.add(s));
  }
  return [...screens];
}

export function PermissionChecklist({
  selected,
  onToggle,
  onSetMany,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onSetMany?: (keys: string[], checked: boolean) => void;
}) {
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3.5">
      {GROUPED_PERMISSIONS.map(([category, permissions]) => {
        const keys = permissions.map((p) => p.key);
        const allSelected = keys.every((k) => selected.includes(k));
        return (
          <div key={category} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                {category}
              </p>
              {onSetMany && (
                <button
                  type="button"
                  onClick={() => onSetMany(keys, !allSelected)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-0.5">
              {permissions.map((permission) => {
                const screens = PERMISSION_SCREENS[permission.key];
                return (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.includes(permission.key)}
                      onCheckedChange={() => onToggle(permission.key)}
                    />
                    <div className="flex flex-col">
                      <span className="leading-snug">{permission.label}</span>
                      {screens && screens.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          Shows: {screens.join(", ")}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
