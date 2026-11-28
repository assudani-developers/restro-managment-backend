"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PermissionChecklist, getVisibleScreensForPermissions } from "@/components/settings/permission-checklist";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRole } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";

const ROLE_PRESETS: { label: string; name: string; keys: string[] }[] = [
  {
    label: "Reception / Front Desk",
    name: "RECEPTIONIST",
    keys: ["hotel.frontdesk", "hotel.housekeeping", "hotel.payments", "hotel.pool", "customers.manage", "orders.create", "menu.view", "tables.view"],
  },
  {
    label: "Housekeeping",
    name: "HOUSEKEEPING_STAFF",
    keys: ["hotel.housekeeping"],
  },
  {
    label: "POS / Cashier",
    name: "POS_CASHIER",
    keys: ["orders.create", "orders.edit", "orders.accept", "bills.print", "discounts.apply", "tables.view", "menu.view", "customers.manage"],
  },
  {
    label: "Kitchen / KDS",
    name: "KITCHEN_DISPLAY",
    keys: ["kds.manage", "orders.accept"],
  },
  {
    label: "Events & Pool",
    name: "EVENTS_POOL",
    keys: ["hotel.events", "hotel.pool", "customers.manage"],
  },
];

export function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const createRole = useCreateRole();

  const togglePermission = (key: string) =>
    setPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const setMany = (keys: string[], checked: boolean) =>
    setPermissionKeys((prev) =>
      checked ? [...new Set([...prev, ...keys])] : prev.filter((k) => !keys.includes(k)),
    );

  const applyPreset = (preset: (typeof ROLE_PRESETS)[number]) => {
    setName(preset.name);
    setLabel(preset.label);
    setPermissionKeys(preset.keys);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRole.mutate(
      { name: name.trim(), label: label.trim(), permissionKeys },
      {
        onSuccess: () => {
          toast.success(`${label.trim()} role created`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not create role"),
      },
    );
  };

  const visibleScreens = getVisibleScreensForPermissions(permissionKeys);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create custom role &amp; screen access</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Quick presets (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-name">Role Code</Label>
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="RECEPTIONIST"
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-label">Display Name</Label>
              <Input
                id="r-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Receptionist"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Permissions &amp; Visible Screens</Label>
              <span className="text-xs text-muted-foreground">
                {visibleScreens.length} screen{visibleScreens.length === 1 ? "" : "s"} visible
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Staff with this role will only see and open the screens checked below.
            </p>
            <PermissionChecklist selected={permissionKeys} onToggle={togglePermission} onSetMany={setMany} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
