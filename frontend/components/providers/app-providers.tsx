"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import { SessionRevokedModal } from "@/components/auth/session-revoked-modal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: 1 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <SessionRevokedModal />
          {children}
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
