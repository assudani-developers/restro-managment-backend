"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  LogIn,
  LogOut,
  Play,
  ShieldAlert,
  Sparkles,
  Square,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useAttendance, useClock, useMyShift } from "@/hooks/use-attendance";
import { useBranch } from "@/hooks/use-branch";
import { useHrActions, useLeave, useMyLeave } from "@/hooks/use-hr";
import { ApiError } from "@/lib/api";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function duration(from: string, to: string | null) {
  const mins = Math.max(
    0,
    Math.round(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / 60000)
  );
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function LeaveRequestCard({ branchId }: { branchId: string | null }) {
  const { data: mine } = useMyLeave();
  const { requestLeave } = useHrActions(branchId);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ type: "ANNUAL", startDate: today, endDate: today, reason: "" });

  return (
    <Card className="flex flex-col gap-4 p-5 bg-card/60 backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Request Leave / Time Off</p>
        </div>
        <span className="text-xs text-muted-foreground">Self-service HR portal</span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <select
          aria-label="Leave type"
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
        >
          <option value="ANNUAL">Annual / Planned</option>
          <option value="SICK">Sick Leave</option>
          <option value="CASUAL">Casual / Personal</option>
          <option value="UNPAID">Unpaid Leave</option>
          <option value="OTHER">Emergency</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From:</span>
          <input
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">To:</span>
          <input
            type="date"
            value={f.endDate}
            onChange={(e) => setF({ ...f, endDate: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="Reason for leave (optional)"
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
          className="min-w-48 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <Button
          size="default"
          className="rounded-xl"
          disabled={!branchId || requestLeave.isPending}
          onClick={() =>
            requestLeave.mutate(
              { ...f, reason: f.reason || undefined },
              {
                onSuccess: () => {
                  toast.success("Leave request submitted to manager");
                  setF({ type: "ANNUAL", startDate: today, endDate: today, reason: "" });
                },
                onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not request leave"),
              }
            )
          }
        >
          Submit Request
        </Button>
      </div>

      {mine && mine.length > 0 && (
        <div className="mt-2 border-t border-border/50 pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">My Recent Leave Requests:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {mine.slice(0, 4).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-medium text-foreground">{l.type}</span>
                  <span className="text-muted-foreground ml-2">
                    {l.startDate.slice(0, 10)} → {l.endDate.slice(0, 10)}
                  </span>
                </div>
                <Badge
                  variant={
                    l.status === "APPROVED" ? "outline" : l.status === "REJECTED" ? "destructive" : "secondary"
                  }
                  className="text-[10px]"
                >
                  {l.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AttendancePage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canManage = hasPermission(me?.user, "attendance.manage");
  const { data: shift, isLoading: shiftLoading } = useMyShift();
  const { clockIn, clockOut } = useClock(branchId);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: records, isLoading } = useAttendance(branchId, date, canManage);
  const [clockNote, setClockNote] = useState("");

  // Live timer for active shift
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!shift?.clockInAt) return;
    const update = () => setElapsed(duration(shift.clockInAt, null));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [shift?.clockInAt]);

  // Attendance metrics
  const stats = useMemo(() => {
    if (!records) return { totalPresent: 0, currentlyOnDuty: 0, completedShifts: 0 };
    const totalPresent = records.length;
    const currentlyOnDuty = records.filter((r) => !r.clockOutAt).length;
    const completedShifts = records.filter((r) => Boolean(r.clockOutAt)).length;
    return { totalPresent, currentlyOnDuty, completedShifts };
  }, [records]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground font-display">
            Staff Attendance &amp; Shifts
          </h1>
          <p className="text-sm text-muted-foreground">
            Biometric &amp; digital shift clock-in, duty timers, and daily roster tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Filter date"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-xs"
          />
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currently On Duty</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600">
              {stats.currentlyOnDuty}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Logged Today</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalPresent}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shifts Completed</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stats.completedShifts}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">My Shift Status</p>
            <p className="text-sm font-bold text-foreground truncate">
              {shift ? "Active on duty" : "Off duty"}
            </p>
          </div>
        </Card>
      </div>

      {/* Clock In / Out Personal Terminal */}
      <Card className="flex flex-col gap-4 p-5 border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {shiftLoading ? (
          <Skeleton className="h-12 w-64" />
        ) : shift ? (
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 ring-2 ring-emerald-500/30">
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">You are ON DUTY</span>
                <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]">
                  Active Shift
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clocked in at <span className="font-semibold text-foreground">{time(shift.clockInAt)}</span> · Elapsed time: <span className="font-semibold text-emerald-600 font-mono">{elapsed || duration(shift.clockInAt, null)}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">You are currently OFF DUTY</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Press Clock In to log your punch and begin shift recording.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {shift ? (
            <Button
              variant="destructive"
              className="rounded-xl gap-2 font-semibold shadow-xs"
              disabled={clockOut.isPending}
              onClick={() => {
                clockOut.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Clocked out successfully");
                    setClockNote("");
                  },
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : "Clock out failed"),
                });
              }}
            >
              <LogOut className="h-4 w-4" />
              Clock Out &amp; End Shift
            </Button>
          ) : (
            <Button
              className="rounded-xl gap-2 font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!branchId || clockIn.isPending}
              onClick={() => {
                clockIn.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Clocked in successfully. Have a great shift!");
                    setClockNote("");
                  },
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : "Clock in failed"),
                });
              }}
            >
              <LogIn className="h-4 w-4" />
              Clock In Now
            </Button>
          )}
        </div>
      </Card>

      <LeaveRequestCard branchId={branchId} />

      {/* Daily Attendance Records Table */}
      {canManage && (
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Daily Attendance Roster ({date})</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {records?.length ?? 0} record{records?.length === 1 ? "" : "s"} found
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : records && records.length > 0 ? (
              records.map((r) => {
                const isOnDuty = !r.clockOutAt;
                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 p-4 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-xs text-muted-foreground">
                        {isOnDuty && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                        )}
                        {r.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{r.user.name}</span>
                          {isOnDuty ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]">
                              On Shift
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          In: {time(r.clockInAt)} · Out: {r.clockOutAt ? time(r.clockOutAt) : "Active"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <div className="text-right">
                        <span className="font-mono font-semibold text-foreground">
                          {duration(r.clockInAt, r.clockOutAt)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">Duration</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Clock className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium">No attendance records for {date}</p>
                <p className="text-xs">Staff punches for this day will appear here automatically.</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
