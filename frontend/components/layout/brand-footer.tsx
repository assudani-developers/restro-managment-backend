export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold tracking-tight text-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          RestroCore POS
        </span>
        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground ring-1 ring-primary/15">
          v2.0 Light
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        High-Performance Restaurant OS
      </p>
    </div>
  );
}
