"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@restrocore/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChefHat,
  CreditCard,
  Key,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "superadmin@restrocore.com",
      password: "SuperAdmin@2026!",
    },
  });

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    login.mutate(dto, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.message === "TWO_FACTOR_REQUIRED") {
          setNeedsCode(true);
          return;
        }
        if (err instanceof ApiError && err.status >= 500) {
          setError("Server is processing. Please verify database connection and retry.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Can't reach the server. Please check your backend connection.");
        }
      },
    });
  };

  const fillCredentials = (email: string, pass = "Password123!") => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
    setError(null);
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Left Feature Showcase (Desktop) */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 text-white">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo size={42} />
          <div>
            <span className="text-xl font-bold tracking-tight">RestroCore</span>
            <span className="ml-2 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/30">
              Cloud POS v2.0
            </span>
          </div>
        </div>

        {/* Center feature showcase */}
        <div className="relative z-10 my-auto flex max-w-lg flex-col gap-8 py-10">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur w-fit border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Next-Gen Restaurant & Kitchen OS
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
              Speed, simplicity, and full control over your restaurant.
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Designed for high-volume dining, quick service, cloud kitchens, and multi-branch operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur border border-white/10 transition-colors hover:bg-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Lightning-fast Billing & POS</p>
                <p className="text-xs text-slate-400">Split bills, customized item modifiers & instant receipt print</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur border border-white/10 transition-colors hover:bg-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Live Kitchen Display (KDS)</p>
                <p className="text-xs text-slate-400">Zero-lag ticket routing with real-time station timers</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur border border-white/10 transition-colors hover:bg-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tables & Floor Matrix</p>
                <p className="text-xs text-slate-400">Live occupancy tracking, reservations & QR table ordering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer status */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            System Status: 100% Operational
          </span>
          <span>Light Edition • RestroCore POS</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile brand header */}
          <div className="mb-8 flex flex-col items-center gap-2.5 text-center lg:items-start lg:text-left">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  Restro<span className="text-indigo-600">Core</span>
                </span>
                <span className="text-xs font-medium text-slate-500">Restaurant Management Platform</span>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-600">
              Enter your credentials to access the POS terminal & dashboard.
            </p>
          </div>

          {/* Quick Demo Pre-Fill Chips for User Convenience */}
          <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Select Demo Credentials
              </span>
              <span className="text-[11px] text-slate-500 font-mono">1-Click Auto Fill</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("superadmin@restrocore.com", "SuperAdmin@2026!")}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-2xs transition-all hover:bg-amber-600 hover:text-white hover:border-amber-600"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Platform SuperAdmin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@khaobhar.com", "Password123!")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                Hotel Owner (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@restrocore.com", "Password123!")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900"
              >
                <Key className="h-3.5 w-3.5 text-indigo-600" />
                Restaurant Manager
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-slate-900 shadow-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="admin@restrocore.com"
                  {...register("email")}
                />
                <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </Label>
              </div>
              <div className="relative">
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-slate-900 shadow-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <Lock className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-600">{errors.password.message}</p>
              )}
            </div>

            {needsCode && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <Label htmlFor="totp" className="text-xs font-semibold uppercase tracking-wider text-indigo-950">
                  2-Factor Authentication Code
                </Label>
                <Input
                  id="totp"
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  className="h-11 rounded-xl border-indigo-300 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20"
                  placeholder="6-digit authenticator code"
                  {...register("totp")}
                />
                <p className="text-xs text-indigo-800">
                  Open your authenticator app or enter a backup code.
                </p>
                {errors.totp && <p className="text-xs font-medium text-rose-600">{errors.totp.message}</p>}
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 shadow-xs"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="flex-1 text-xs leading-relaxed">
                  <span className="font-semibold text-rose-900 block">{error}</span>
                  <span>Tip: Click on one of the demo chips above to instantly auto-fill working credentials.</span>
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-base font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-600/35 active:scale-[0.99] disabled:opacity-60"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying Credentials…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <p className="text-xs text-slate-600">
              Need to register a new restaurant branch?{" "}
              <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                Create an account
              </Link>
            </p>

            <div className="flex items-center gap-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 100% Light Theme
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> GST Ready
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Touchscreen Optimized
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
