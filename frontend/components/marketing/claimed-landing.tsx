import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { CreditFooter } from "@/components/layout/credit-footer";

// Shown at "/" once this self-hosted instance already has a restaurant set
// up (see useSetupStatus / MarketingHomePage) — the full marketing pitch
// only makes sense for an unclaimed install; a live instance's public root
// should get a returning staff member to Sign in fast, with a way to reach
// the docs, not a repeat of the product's own sales page.
export function ClaimedLanding() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-4 py-12 text-center sm:px-6">
      <div />
      <div className="flex flex-col items-center justify-center">
        <Logo size={52} />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground font-display">
          RestroCore ERP
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This instance is online and active. Sign in to your dashboard to manage hotel, restaurant, and billing operations.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            Sign in to Dashboard
          </Button>
          <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/docs" />}>
            View documentation
          </Button>
        </div>
      </div>
      <CreditFooter className="w-full max-w-md mt-8 border-t-0 pt-0" />
    </div>
  );
}
