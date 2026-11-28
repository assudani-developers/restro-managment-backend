"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to login
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="mb-4 flex items-center justify-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-bold text-slate-900">RestroCore</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Public Registration Disabled
        </h1>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          Naye hotel aur restaurant panels sirf <strong>SuperAdmin Master Panel</strong> se banaye ja sakte hain.
          Public sign up band kar diya gaya hai.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
          >
            <span>Sign In Screen Par Jayein</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
