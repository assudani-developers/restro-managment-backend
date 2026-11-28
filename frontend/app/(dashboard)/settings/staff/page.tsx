"use client";

import { Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AddStaffDialog } from "@/components/settings/add-staff-dialog";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDeleteStaff, useStaff, useStaffRoles, useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import { api, ApiError } from "@/lib/api";

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const { data: roles } = useStaffRoles();
  const { data: currentUser } = useCurrentUser();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const onResetTwoFactor = (member: StaffMember) => {
    if (!confirm(`Turn off two-factor authentication for ${member.name}? They will sign in with just their password until they set it up again.`)) return;
    api.post(`/auth/2fa/reset/${member.id}`).then(
      () => toast.success(`Two-factor authentication reset for ${member.name}`),
      (err) => toast.error(err instanceof ApiError ? err.message : "Could not reset"),
    );
  };

  const onDelete = (member: StaffMember) => {
    if (!confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    deleteStaff.mutate(member.id, {
      onSuccess: () => toast.success(`${member.name} deleted`),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not delete staff account"),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Restaurant, branch, and staff configuration</p>
      </div>

      <SettingsTabs />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-medium text-foreground">Staff accounts</h2>
            <p className="text-xs text-muted-foreground">
              Assign a role to each staff member — they will only see the screens allowed by their role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/roles">
              <Button variant="outline" size="sm">Manage Roles &amp; Screens</Button>
            </Link>
            <AddStaffDialog />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : staff && staff.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email || member.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {member.role.name === "OWNER" ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="font-normal">
                          {member.role.label}
                        </Badge>
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          <Lock className="h-3 w-3 text-amber-600" /> SaaS Provisioned
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={member.role.id}
                        onValueChange={(nextRoleId) => {
                          if (!nextRoleId || nextRoleId === member.role.id) return;
                          updateStaff.mutate(
                            { id: member.id, dto: { roleId: nextRoleId } },
                            {
                              onSuccess: () => toast.success(`Updated role for ${member.name}`),
                              onError: (err) =>
                                toast.error(err instanceof ApiError ? err.message : "Could not update role"),
                            },
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles?.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.branches.map((b) => b.branch.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={member.isActive}
                      disabled={member.role.name === "OWNER"}
                      onCheckedChange={(checked) =>
                        updateStaff.mutate(
                          { id: member.id, dto: { isActive: checked } },
                          {
                            onSuccess: () =>
                              toast.success(`${member.name} ${checked ? "enabled" : "disabled"}`),
                            onError: (err) =>
                              toast.error(err instanceof ApiError ? err.message : "Could not update"),
                          },
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {member.id !== currentUser?.user.id && member.role.name !== "OWNER" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground"
                          title="Reset two-factor authentication (lost device)"
                          onClick={() => onResetTwoFactor(member)}
                        >
                          Reset 2FA
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete staff account"
                          onClick={() => onDelete(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No staff accounts yet</p>
            <p className="text-sm text-muted-foreground">Add your first staff account above.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
