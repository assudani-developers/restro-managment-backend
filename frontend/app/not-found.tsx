"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
          <FileQuestion className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          The requested URL does not match any route or terminal module on this RestroCore instance.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center h-10 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs gap-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-2 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
