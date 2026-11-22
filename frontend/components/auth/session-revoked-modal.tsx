"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { api } from "@/lib/api";

export function SessionRevokedModal() {
  const queryClient = useQueryClient();
  const { isError, error } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [revocationMessage, setRevocationMessage] = useState<string>("");
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check error message from useCurrentUser
  useEffect(() => {
    if (isError && error?.message) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("master_admin_revoked") ||
        msg.includes("user_deactivated") ||
        msg.includes("revoked")
      ) {
        setRevocationMessage(error.message);
        setIsOpen(true);
      }
    }
  }, [isError, error]);

  // Listen to custom window events from api.ts or realtime socket
  useEffect(() => {
    const handleRevoked = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || "MASTER_ADMIN_REVOKED";
      setRevocationMessage(msg);
      setIsOpen(true);
    };

    window.addEventListener("auth:revoked", handleRevoked);
    return () => {
      window.removeEventListener("auth:revoked", handleRevoked);
    };
  }, []);

  // Handle countdown and auto-redirect
  useEffect(() => {
    if (!isOpen) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleRedirect = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } catch {
      // ignore
    }
    queryClient.clear();
    window.location.href = "/login";
  };

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="revoked-title"
      aria-describedby="revoked-desc"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-rose-950/50">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rose-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Animated Alert Badge */}
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/20 opacity-75" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-950/60 text-rose-400 shadow-inner">
              <ShieldAlert className="h-8 w-8 text-rose-500" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            Security Alert • Master Admin Revoked
          </div>

          <h2
            id="revoked-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-white"
          >
            Master Admin Session Band Kar Diya Gaya Hai
          </h2>
          <p className="mt-1 text-sm font-medium text-rose-300/90">
            (Master Admin Access Permanently Terminated)
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-xs leading-relaxed text-slate-300">
            <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-rose-400" />
              Suraksha Suchna / Security Notice:
            </p>
            <p className="text-slate-300">
              Puraana Master Admin login{" "}
              <strong className="text-rose-300 font-semibold underline decoration-rose-400/50">
                piyushassudani / 9413879444
              </strong>{" "}
              live server se hamesha ke liye deactivate aur band kar diya gaya hai.
              Agar kahi bhi yeh session khula tha, use turant disconnect kar diya gaya hai.
            </p>
            <p className="mt-2 text-slate-400">
              The previous master admin credentials have been revoked. Please sign in using the new Master Admin credentials.
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={handleRedirect}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition-all hover:from-rose-500 hover:to-rose-600 hover:shadow-xl active:scale-[0.99]"
            >
              <span>Login Screen Par Jayein (Go to Login)</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-xs text-slate-400">
              Auto redirecting in <span className="font-bold text-rose-400">{countdown}s</span>...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
