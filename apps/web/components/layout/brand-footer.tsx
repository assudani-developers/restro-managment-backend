export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3">
      <div className="flex items-center justify-between text-xs font-medium text-sidebar-foreground/80">
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          KhaoBhar POS
        </span>
        <span className="text-[10px] text-muted-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
          v1.0
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">
        Smart Restaurant & Billing System
      </p>
    </div>
  );
}
