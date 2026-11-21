export function BrandFooter() {
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold tracking-tight text-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          RestroCore POS
        </span>
        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground ring-1 ring-primary/15">
          v2.0
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        Designed &amp; Developed by{" "}
        <a
          href="https://piyushassudani.in"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-700 hover:underline"
        >
          Piyush Assudani
        </a>{" "}
        (Founder of Assudani Developers)
      </p>
      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <a
          href="https://piyushassudani.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 hover:underline font-medium"
        >
          piyushassudani.in
        </a>
        <span>•</span>
        <a href="tel:9413879444" className="hover:underline text-slate-600">
          9413879444
        </a>
      </div>
    </div>
  );
}
