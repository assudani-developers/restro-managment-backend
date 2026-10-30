"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterDto } from "@restrocore/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChefHat,
  Lock,
  Mail,
  MapPin,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const prefersReducedMotion = useReducedMotion();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (dto: RegisterDto) => {
    register.mutate(dto, {
      onSuccess: () => router.push("/dashboard"),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong during registration");
      },
    });
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-background text-foreground lg:flex-row">
      {/* Left Feature Showcase */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden border-r border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-amber-50 p-10 text-slate-900 lg:flex lg:w-5/12 xl:p-14">
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <Logo size={42} />
          <div>
            <span className="text-xl font-semibold tracking-tight">RestroCore</span>
            <span className="ml-2 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200/80">
              Quick Setup
            </span>
          </div>
        </div>

        <div className="relative z-10 my-auto flex max-w-sm flex-col gap-6 py-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Quick restaurant setup
          </div>
          <h2 className="text-3xl font-semibold leading-snug tracking-tight">
            Equip your staff with the fastest POS on the market.
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Create your restaurant account to unlock visual table floor plans, kitchen displays, automated taxes & instant reporting.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Full multi-role permissions (Owner, Manager, Cashier, Waiter, Kitchen)</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Real-time Socket.io kitchen order ticket (KOT) sync</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Table QR menu ordering & self-service kiosk support</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-teal-200/70 pt-4 text-xs text-slate-500">
          RestroCore restaurant workspace
        </div>
      </div>

      {/* Right Registration Form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16 overflow-y-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md py-4"
        >
          <div className="mb-6 flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
            <div className="flex items-center gap-3 lg:hidden">
              <Logo size={40} />
              <span className="text-2xl font-bold tracking-tight text-slate-900">
              Restro<span className="text-teal-700">Core</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Setup Your Restaurant
            </h1>
            <p className="text-sm text-slate-600">
              Start serving customers right away with a free workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="restaurantName" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Restaurant Name
                </Label>
                <div className="relative">
                  <Input
                    id="restaurantName"
                    autoFocus
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                    placeholder="Enter restaurant name"
                    {...field("restaurantName")}
                  />
                  <Store className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
                {errors.restaurantName && (
                  <p className="text-xs font-medium text-rose-600">{errors.restaurantName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchName" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Initial Branch
                </Label>
                <div className="relative">
                  <Input
                    id="branchName"
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                    placeholder="Enter branch name"
                    {...field("branchName")}
                  />
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
                {errors.branchName && (
                  <p className="text-xs font-medium text-rose-600">{errors.branchName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerName" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Your Full Name
              </Label>
              <div className="relative">
                <Input
                  id="ownerName"
                  className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  placeholder="Enter your full name"
                  {...field("ownerName")}
                />
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              {errors.ownerName && (
                <p className="text-xs font-medium text-rose-600">{errors.ownerName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  placeholder="you@yourrestaurant.com"
                  {...field("email")}
                />
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </Label>
              <div className="relative">
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-slate-900 shadow-xs focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  placeholder="At least 8 characters"
                  {...field("password")}
                />
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-teal-700 to-teal-900 text-base font-semibold text-white shadow-md shadow-teal-900/20 transition-all hover:-translate-y-0.5 hover:from-teal-600 hover:to-teal-800 hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
              disabled={register.isPending}
            >
              {register.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating Restaurant...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Complete Setup & Launch
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Already have an active account?{" "}
            <Link href="/login" className="font-semibold text-teal-800 hover:text-teal-950 hover:underline">
              Sign in here
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
