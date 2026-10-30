"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error securely to local console
    console.error("Application runtime error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Application Notice
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          An unexpected interface state occurred. Your orders, table assignments, and financial records are completely safe in the database.
        </p>

        {error.message && (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Diagnostic reference
            </p>
            <p className="mt-1 font-mono text-xs text-slate-700 break-words line-clamp-3">
              {error.message}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button
            type="button"
            onClick={() => reset()}
            className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center h-10 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs gap-2 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
