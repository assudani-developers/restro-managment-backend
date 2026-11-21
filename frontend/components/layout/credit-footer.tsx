import { cn } from "@/lib/utils";

interface CreditFooterProps {
  className?: string;
  variant?: "dashboard" | "minimal" | "dark" | "card";
}

export function CreditFooter({ className, variant = "dashboard" }: CreditFooterProps) {
  if (variant === "dark") {
    return (
      <footer className={cn("py-4 text-center text-xs text-[#E9DCC8]/60 print-hidden", className)}>
        <p className="leading-relaxed">
          Designed &amp; Developed by{" "}
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#FFF8F0] hover:underline"
          >
            Piyush Assudani
          </a>{" "}
          — Founder of Assudani Developers
        </p>
        <p className="mt-1 flex items-center justify-center gap-3 text-[11px] text-[#E9DCC8]/70">
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 hover:underline font-medium"
          >
            piyushassudani.in
          </a>
          <span>•</span>
          <a href="tel:9413879444" className="hover:text-white">
            9413879444
          </a>
        </p>
      </footer>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card/60 p-4 text-center text-xs text-muted-foreground shadow-xs print-hidden", className)}>
        <p className="text-foreground/90 font-medium">
          Designed &amp; Developed by{" "}
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary hover:underline"
          >
            Piyush Assudani
          </a>{" "}
          <span className="text-muted-foreground text-[11px]">(Founder of Assudani Developers)</span>
        </p>
        <p className="mt-1 flex items-center justify-center gap-3 text-[11px]">
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            piyushassudani.in
          </a>
          <span>•</span>
          <a href="tel:9413879444" className="hover:text-foreground">
            9413879444
          </a>
        </p>
      </div>
    );
  }

  return (
    <footer className={cn("mt-12 border-t border-border/60 pt-6 pb-6 text-center text-xs text-muted-foreground print-hidden", className)}>
      <div className="mx-auto flex flex-col items-center justify-center gap-1.5">
        <p className="text-xs text-foreground/80">
          Designed &amp; Developed by{" "}
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline transition-colors"
          >
            Piyush Assudani
          </a>{" "}
          <span className="text-muted-foreground">(Founder of Assudani Developers)</span>
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <a
            href="https://piyushassudani.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            piyushassudani.in
          </a>
          <span>•</span>
          <a
            href="tel:9413879444"
            className="hover:text-foreground transition-colors"
          >
            9413879444
          </a>
        </div>
      </div>
    </footer>
  );
}
