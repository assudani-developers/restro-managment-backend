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
  CheckCircle2,
  ChefHat,
  CreditCard,
  Layers,
  Lock,
  Mail,
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
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
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

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-background text-foreground lg:flex-row">
      {/* Left Feature Showcase (Desktop) */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden border-r border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-amber-50 p-10 text-slate-900 lg:flex lg:w-1/2 xl:p-14">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo size={42} />
          <div>
            <span className="text-xl font-semibold tracking-tight">RestroCore</span>
            <span className="ml-2 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200/80">
              Restaurant operations
            </span>
          </div>
        </div>

        {/* Center feature showcase */}
        <div className="relative z-10 my-auto flex max-w-lg flex-col gap-8 py-10">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Next-Gen Restaurant & Kitchen OS
            </div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Speed, simplicity, and full control over your restaurant.
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              Designed for high-volume dining, quick service, cloud kitchens, and multi-branch operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Lightning-fast Billing & POS</p>
                <p className="text-xs text-slate-500">Split bills, customized item modifiers & instant receipt print</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Live Kitchen Display (KDS)</p>
                <p className="text-xs text-slate-500">Zero-lag ticket routing with real-time station timers</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tables & Floor Matrix</p>
                <p className="text-xs text-slate-500">Live occupancy tracking, reservations & QR table ordering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer status */}
        <div className="relative z-10 flex items-center justify-between border-t border-teal-200/70 pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Secure access for your restaurant team
          </span>
          <span>RestroCore</span>
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
                  Restro<span className="text-teal-700">Core</span>
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email or username
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  placeholder="Email or username"
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
                  className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
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
              <div className="flex flex-col gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
              <Label htmlFor="totp" className="text-xs font-semibold uppercase tracking-wider text-teal-950">
                  2-Factor Authentication Code
                </Label>
                <Input
                  id="totp"
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  className="h-11 rounded-xl border-teal-300 bg-white text-slate-900 focus:border-teal-800 focus:ring-teal-800/15"
                  placeholder="6-digit authenticator code"
                  {...register("totp")}
                />
                <p className="text-xs text-teal-800">
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
                  {error.includes("MASTER_ADMIN_REVOKED") ? (
                    <div>
                      <span className="font-bold text-rose-950 block text-[13px]">
                        Master Admin Login Band Kar Diya Gaya Hai
                      </span>
                      <p className="mt-1 text-rose-800">
                        Puraane credentials (<strong>piyushassudani / 9413879444</strong>) permanently revoke kar diye gaye hain.
                        Kripya naye Master Admin credentials ke saath login karein.
                      </p>
                    </div>
                  ) : (
                    <span className="font-semibold text-rose-900 block">{error}</span>
                  )}
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-teal-700 to-teal-900 text-base font-semibold text-white shadow-md shadow-teal-900/20 transition-all hover:-translate-y-0.5 hover:from-teal-600 hover:to-teal-800 hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
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
              <Link href="/signup" className="font-semibold text-teal-800 hover:text-teal-950 hover:underline">
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

            <div className="mt-2 border-t border-slate-200/60 pt-4 text-center text-xs text-slate-500">
              <p>
                Designed &amp; Developed by{" "}
                <a
                  href="https://piyushassudani.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal-900 hover:underline"
                >
                  Piyush Assudani
                </a>{" "}
                (Founder of Assudani Developers)
              </p>
              <p className="mt-1 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <a
                  href="https://piyushassudani.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline font-medium"
                >
                  piyushassudani.in
                </a>
                <span>•</span>
                <a href="tel:9413879444" className="hover:underline">
                  9413879444
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
