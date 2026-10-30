import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 36,
  showText = false,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        style={{ width: size, height: size }}
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 text-white shadow-md shadow-teal-900/20 ring-1 ring-white/30 transition-all"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }}
        >
          <circle cx="12" cy="13" r="8" />
          <circle cx="12" cy="13" r="4.25" />
          <path d="M12 5c1.3-2.1 3.2-3 5.2-2.8-.2 2-1.6 3.8-4.2 4.5" />
        </svg>
      </div>
      {showText && (
        <span className="font-bold tracking-tight text-slate-900 text-lg">
          Restro<span className="text-teal-700">Core</span>
        </span>
      )}
    </div>
  );
}
