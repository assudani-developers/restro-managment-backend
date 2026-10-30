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
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20 transition-all"
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
          {/* Modern Restro Core emblem */}
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      </div>
      {showText && (
        <span className="font-bold tracking-tight text-slate-900 text-lg">
          Restro<span className="text-indigo-600">Core</span>
        </span>
      )}
    </div>
  );
}
