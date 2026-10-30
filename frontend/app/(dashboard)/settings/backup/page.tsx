"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  Archive,
  CalendarClock,
  Cloud,
  HardDrive,
  History,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { RestoreBackupDialog } from "@/components/settings/restore-backup-dialog";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  backupDownloadUrl,
  LOCAL_BACKUP_URL,
  useBackups,
  useBackupStatus,
  useClearBackupConfig,
  useSetBackupConfig,
  useTriggerBackup,
  type BackupEntry,
  type BackupStatusValue,
} from "@/hooks/use-backups";
import { ApiError } from "@/lib/api";

const STATUS_VARIANT: Record<BackupStatusValue, "outline" | "secondary" | "destructive"> = {
  PENDING: "outline",
  VERIFIED: "secondary",
  FAILED: "destructive",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ConfigFormState {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  intervalDays: string;
  retainCount: string;
}

const EMPTY_CONFIG_FORM: ConfigFormState = {
  endpoint: "",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  region: "auto",
  intervalDays: "3",
  retainCount: "2",
};

export default function BackupPage() {
  const { data: status, isLoading: statusLoading } = useBackupStatus();
  const { data: backups, isLoading: backupsLoading } = useBackups();
  const setConfig = useSetBackupConfig();
  const clearConfig = useClearBackupConfig();
  const triggerBackup = useTriggerBackup();

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState<ConfigFormState>(EMPTY_CONFIG_FORM);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);

  const openConfigForm = () => {
    setConfigForm(
      status
        ? {
            endpoint: status.endpoint ?? "",
            bucket: status.bucket ?? "",
            accessKeyId: "",
            secretAccessKey: "",
            region: status.region ?? "auto",
            intervalDays: String(status.intervalDays),
            retainCount: String(status.retainCount),
          }
        : EMPTY_CONFIG_FORM,
    );
    setShowConfigForm(true);
  };

  const onSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig.mutate(
      {
        endpoint: configForm.endpoint.trim(),
        bucket: configForm.bucket.trim(),
        accessKeyId: configForm.accessKeyId.trim(),
        secretAccessKey: configForm.secretAccessKey.trim(),
        region: configForm.region.trim() || undefined,
        intervalDays: Number(configForm.intervalDays) || undefined,
        retainCount: Number(configForm.retainCount) || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Backup connection saved");
          setShowConfigForm(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Could not connect to that bucket",
          ),
      },
    );
  };

  const onDisconnect = () => {
    if (!confirm("Disconnect S3 backups? Scheduled backups will stop until reconnected.")) {
      return;
    }
    clearConfig.mutate(undefined, {
      onSuccess: () => toast.success("Backup connection removed"),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not disconnect"),
    });
  };

  const onTrigger = () => {
    triggerBackup.mutate(undefined, {
      onSuccess: () => toast.success("Backup started"),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not start backup"),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 sm:gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Workspace settings
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Backups &amp; restore
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Protect your restaurant data with a local copy or automated cloud backups.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Your data stays protected
        </div>
      </header>

      <SettingsTabs />

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="relative flex flex-col justify-between gap-6 overflow-hidden border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-white p-5 sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-teal-100/70 blur-2xl" />
          <div className="relative">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-teal-100">
              <HardDrive className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Quick export
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
              Keep a copy close
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Download a complete database and uploaded-file archive straight to this device.
              No cloud setup required.
            </p>
          </div>
          <div className="relative flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-white/80 p-3.5">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <p className="text-xs leading-5 text-muted-foreground">
                Includes customer and sales data. Store the downloaded archive somewhere private.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<a href={LOCAL_BACKUP_URL} download />}
              className="w-full sm:w-fit"
            >
              <ArrowDownToLine data-icon="inline-start" />
              Download backup
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Automated cloud backups</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Connect an S3-compatible bucket for scheduled backups.
                </p>
              </div>
            </div>
            {status ? (
              <Badge
                variant={status.configured ? "secondary" : "outline"}
                className="mt-0.5"
              >
                {status.configured ? "Connected" : "Not connected"}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">Server-wide setting.</span>{" "}
            This bucket covers every restaurant hosted on this server.
          </div>

          {statusLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : !status?.configured || showConfigForm ? (
            <form onSubmit={onSaveConfig} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Works with AWS S3, MinIO, RustFS, Cloudflare R2, and other compatible storage.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="b-endpoint">Endpoint URL</Label>
                  <Input
                    id="b-endpoint"
                    placeholder="https://s3.example.com"
                    value={configForm.endpoint}
                    onChange={(e) => setConfigForm((f) => ({ ...f, endpoint: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="b-bucket">Bucket</Label>
                  <Input
                    id="b-bucket"
                    value={configForm.bucket}
                    onChange={(e) => setConfigForm((f) => ({ ...f, bucket: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="b-key">Access key ID</Label>
                  <Input
                    id="b-key"
                    value={configForm.accessKeyId}
                    onChange={(e) => setConfigForm((f) => ({ ...f, accessKeyId: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="b-secret">Secret access key</Label>
                  <Input
                    id="b-secret"
                    type="password"
                    value={configForm.secretAccessKey}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, secretAccessKey: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="b-region">Region</Label>
                  <Input
                    id="b-region"
                    placeholder="auto"
                    value={configForm.region}
                    onChange={(e) => setConfigForm((f) => ({ ...f, region: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="b-interval">Every (days)</Label>
                    <Input
                      id="b-interval"
                      type="number"
                      min={1}
                      max={30}
                      value={configForm.intervalDays}
                      onChange={(e) =>
                        setConfigForm((f) => ({ ...f, intervalDays: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="b-retain">Keep copies</Label>
                    <Input
                      id="b-retain"
                      type="number"
                      min={1}
                      max={10}
                      value={configForm.retainCount}
                      onChange={(e) =>
                        setConfigForm((f) => ({ ...f, retainCount: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={setConfig.isPending}>
                  {setConfig.isPending ? "Testing connection…" : "Connect & save"}
                </Button>
                {status?.configured ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfigForm(false)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{status.bucket}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {status.endpoint} · Key {status.accessKeyIdMasked}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {status.source === "environment"
                      ? "Managed by environment variables"
                      : "Configured in settings"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openConfigForm}>
                    Change
                  </Button>
                  {status.source === "database" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={clearConfig.isPending}
                      onClick={onDisconnect}
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Frequency" value={`Every ${status.intervalDays} days`} />
                <Stat label="Retention" value={`${status.retainCount} copies`} />
                <Stat
                  label="Last backup"
                  value={
                    status.lastBackup
                      ? new Date(status.lastBackup.createdAt).toLocaleString()
                      : "Never"
                  }
                />
                <Stat
                  label="Next backup"
                  value={
                    status.nextScheduledAt
                      ? new Date(status.nextScheduledAt).toLocaleString()
                      : "—"
                  }
                />
              </div>
              <div className="border-t border-border pt-4">
                <Button onClick={onTrigger} disabled={triggerBackup.isPending}>
                  <CalendarClock data-icon="inline-start" />
                  {triggerBackup.isPending ? "Starting…" : "Back up now"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Backup history</h2>
            <p className="text-sm text-muted-foreground">Review, download, or restore a verified copy.</p>
          </div>
        </div>

        {backupsLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : backups && backups.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-foreground">
                    {new Date(b.createdAt).toLocaleString()}
                    <div className="text-xs font-normal text-muted-foreground">
                      {b.triggeredById ? "Manual" : "Scheduled"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                    {b.status === "FAILED" && b.failureReason ? (
                      <div className="mt-1 max-w-xs truncate text-xs text-destructive" title={b.failureReason}>
                        {b.failureReason}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatBytes(b.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {b.status === "VERIFIED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={<a href={backupDownloadUrl(b.id)} />}
                        >
                          Download
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={b.status !== "VERIFIED"}
                        onClick={() => setRestoreTarget(b)}
                      >
                        Restore
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No backups yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Connect cloud storage above and create your first backup to see it here.
              </p>
            </div>
          </div>
        )}
      </Card>

      {restoreTarget ? (
        <RestoreBackupDialog
          key={restoreTarget.id}
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
