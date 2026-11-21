"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { BoardStatus } from "@/hooks/use-hotel";

// ---------------------------------------------------------------- room status palette (spec §1)

export const ROOM_STATUS: Record<BoardStatus, { label: string; color: string; soft: string; text: string; hint: string }> = {
  AVAILABLE: { label: "Available", color: "#2E9E5F", soft: "#E6F5EC", text: "#145C36", hint: "Clean & ready to sell" },
  OCCUPIED: { label: "Occupied", color: "#E2B13B", soft: "#FCF3DC", text: "#7A5A0C", hint: "Guest in house" },
  DIRTY: { label: "Dirty", color: "#E0742A", soft: "#FCEBDD", text: "#8A3F0C", hint: "Needs cleaning" },
  INSPECTION: { label: "Inspection", color: "#D99A5B", soft: "#F9EEE2", text: "#7C4E1D", hint: "Cleaned, awaiting supervisor" },
  BOOKED: { label: "Booked", color: "#C9362C", soft: "#F9E3E1", text: "#7E1B14", hint: "Arrival due today" },
  CHECKOUT_SOON: { label: "Checkout Soon", color: "#2C6BD8", soft: "#E2ECFB", text: "#163E85", hint: "Departure within hours" },
  MAINTENANCE: { label: "Out of Service", color: "#8B9098", soft: "#EEEFF1", text: "#41454C", hint: "Maintenance block" },
};

export function StatusDot({ status, className }: { status: BoardStatus; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", className)} style={{ background: ROOM_STATUS[status].color }} />;
}

export function StatusPill({ status, className }: { status: BoardStatus; className?: string }) {
  const s = ROOM_STATUS[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}
      style={{ background: s.soft, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

const BOOKING_TONE: Record<string, string> = {
  CONFIRMED: "bg-sky-50 text-sky-800 ring-sky-200",
  CHECKED_IN: "bg-amber-50 text-amber-800 ring-amber-200",
  CHECKED_OUT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  NO_SHOW: "bg-stone-100 text-stone-600 ring-stone-200",
  ENQUIRY: "bg-stone-100 text-stone-700 ring-stone-200",
  QUOTED: "bg-violet-50 text-violet-800 ring-violet-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  QUEUED: "bg-amber-50 text-amber-800 ring-amber-200",
  SENT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  ISSUED: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function Tag({ value, label, className }: { value: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", BOOKING_TONE[value] ?? "bg-stone-100 text-stone-700 ring-stone-200", className)}>
      {label ?? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

// ---------------------------------------------------------------- layout

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-sm text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-[1.85rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.25rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("lux-card overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "accent" | "ink" | "green" | "blue" | "red";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand/10 text-brand",
    accent: "bg-brand-accent/15 text-[color-mix(in_oklab,var(--brand-accent)_70%,black)]",
    ink: "bg-ink/8 text-ink",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="lux-card relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-[1.7rem] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- controls

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "ink" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Btn({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  const v: Record<string, string> = {
    primary: "text-primary-foreground shadow-[0_8px_18px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] [background-image:var(--gradient-primary)] hover:brightness-[1.07]",
    ink: "bg-ink text-[#FFF8F0] hover:bg-ink/90",
    soft: "bg-brand/10 text-brand hover:bg-brand/15",
    outline: "border border-border bg-card text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const s: Record<string, string> = {
    sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
    md: "h-10 gap-2 rounded-xl px-4 text-sm",
    lg: "h-12 gap-2 rounded-2xl px-6 text-[15px]",
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4",
        v[variant],
        s[size],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-foreground/80">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "h-auto min-h-24 py-2.5", props.className)} />;
}

export function Select({ options, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={cn(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23806E5A%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-border bg-muted/60 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-brand" : "bg-stone-300")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 35 }} className={cn("h-5 w-5 rounded-full bg-white shadow", checked ? "ml-[22px]" : "ml-0.5")} />
    </button>
  );
}

// ---------------------------------------------------------------- modal / drawer

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  side,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  side?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/45 backdrop-blur-[3px] print-hidden" onClick={onClose} />
          <motion.div
            initial={side ? { x: "100%" } : { opacity: 0, y: 40, scale: 0.98 }}
            animate={side ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={side ? { x: "100%" } : { opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card shadow-2xl",
              side ? "ml-auto h-dvh max-h-dvh max-w-lg sm:rounded-l-3xl" : cn("rounded-t-3xl sm:rounded-3xl", widths[size]),
              side && "self-stretch",
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-6 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- formatting

export const inr = (v: number | string | null | undefined) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) =>
  new Date(typeof d === "string" && d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", opts);

export const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
