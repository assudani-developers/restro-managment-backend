"use client";

import { LocateFixed, MapPinOff, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBranch } from "@/hooks/use-branch";
import { useHotelSettings } from "@/hooks/use-hotel";
import { api } from "@/lib/api";
import { Btn } from "./ui";

type GateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "blocked"; distanceM: number | null; radiusM: number; reason?: string }
  | { kind: "denied" }
  | { kind: "unsupported" };

const RECHECK_MS = 5 * 60_000;

/**
 * Spec §14: staff/admin operational access works only within the hotel's
 * geo-fence (default 200 m). The distance is computed server-side from the
 * saved hotel coordinates and re-verified every 5 minutes during a session.
 * Browser GPS can be spoofed, so this is one layer — pair it with hotel Wi-Fi
 * / managed devices for real assurance. Super admins bypass for remote support;
 * guest QR menus and the booking portal are never gated.
 */
export function GeofenceGate({ bypass, children }: { bypass?: boolean; children: React.ReactNode }) {
  const { branchId } = useBranch();
  const { data: settings } = useHotelSettings(branchId);
  const [state, setState] = useState<GateState>({ kind: "idle" });
  const qc = useQueryClient();
  const wasOk = useRef(false);
  const enforced = !bypass && !!settings?.geofenceEnabled && settings.latitude != null;

  const verify = useCallback(() => {
    if (!branchId) return;
    if (!("geolocation" in navigator)) {
      setState({ kind: "unsupported" });
      return;
    }
    setState((s) => (s.kind === "ok" ? s : { kind: "checking" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await api.post<{ allowed: boolean; distanceM: number | null; radiusM: number; reason?: string }>(
            `/hotel/geofence/check?branchId=${branchId}`,
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
          );
          setState(r.allowed ? { kind: "ok" } : { kind: "blocked", distanceM: r.distanceM, radiusM: r.radiusM, reason: r.reason });
          // A fresh pass makes earlier refused calls worth retrying.
          if (r.allowed && !wasOk.current) void qc.invalidateQueries();
          wasOk.current = r.allowed;
        } catch {
          setState({ kind: "blocked", distanceM: null, radiusM: settings?.geofenceRadiusM ?? 200, reason: "Could not verify location with the server" });
        }
      },
      () => setState({ kind: "denied" }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, [branchId, settings?.geofenceRadiusM, qc]);

  useEffect(() => {
    if (!enforced) return;
    // Reads the device's GPS (an external system); state updates arrive async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verify();
    const t = setInterval(verify, RECHECK_MS);
    // The server refused a call because the location pass expired (tab slept, etc.).
    const onRequired = () => {
      wasOk.current = false;
      setState({ kind: "checking" });
      verify();
    };
    window.addEventListener("geofence-required", onRequired);
    return () => {
      clearInterval(t);
      window.removeEventListener("geofence-required", onRequired);
    };
  }, [enforced, verify]);

  if (!enforced || state.kind === "ok") return <>{children}</>;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-6 text-[#F3E9DA]">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/30 text-brand-accent">
          {state.kind === "checking" || state.kind === "idle" ? (
            <LocateFixed className="h-8 w-8 animate-pulse" />
          ) : state.kind === "blocked" ? (
            <ShieldAlert className="h-8 w-8" />
          ) : (
            <MapPinOff className="h-8 w-8" />
          )}
        </span>
        <h1 className="font-display text-2xl font-semibold">
          {state.kind === "checking" || state.kind === "idle"
            ? "Verifying your location…"
            : state.kind === "blocked"
              ? "Outside the hotel premises"
              : state.kind === "denied"
                ? "Location permission needed"
                : "Location not available"}
        </h1>
        <p className="mt-3 text-sm text-[#F3E9DA]/70">
          {state.kind === "blocked"
            ? `${settings?.hotelName ?? "This hotel"} allows staff access only within ${state.radiusM} m of the property.${state.distanceM != null ? ` You are about ${state.distanceM.toLocaleString("en-IN")} m away.` : ""} ${state.reason ?? ""}`
            : state.kind === "denied"
              ? "The hotel ERP works only on the property. Allow location access for this site in your browser settings, then retry."
              : state.kind === "unsupported"
                ? "This device or browser cannot share its location, so access cannot be verified."
                : `Staff access is limited to ${settings?.geofenceRadiusM ?? 200} m around the hotel.`}
        </p>
        {state.kind !== "checking" && state.kind !== "idle" && (
          <div className="mt-6 flex justify-center gap-2">
            <Btn onClick={verify}>
              <LocateFixed /> Retry
            </Btn>
            <Btn variant="outline" className="border-white/15 bg-transparent text-[#F3E9DA] hover:bg-white/10" onClick={() => (window.location.href = "/login")}>
              Sign out
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
