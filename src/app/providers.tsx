"use client";
import { LanguageProvider } from "@/i18n/language-provider";
import { TranslationLocaleContext } from "@/i18n/use-translation";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { mockEnabled } from "@/lib/config/mock";

const MockBoundary = process.env.NODE_ENV === "development"
  ? dynamic(() => import("@/mocks/mock-boundary"), { ssr: false }) : null;

export function AppProviders({ children, initialLocale = "ko" }: { children: ReactNode; initialLocale?: import("@/i18n/config").Locale }) {
  return <TranslationLocaleContext value={initialLocale}>{mockEnabled && MockBoundary
    ? <MockBoundary><ServicesProvider initialLocale={initialLocale}>{children}</ServicesProvider></MockBoundary>
    : <ServicesProvider initialLocale={initialLocale}>{children}</ServicesProvider>}</TranslationLocaleContext>;
}

function ServicesProvider({ children, initialLocale }: { children: ReactNode; initialLocale: import("@/i18n/config").Locale }) {
  // Per-tree construction also isolates SSR requests; no module-level user state.
  const [services] = useState(createAppServices);

  useEffect(() => {
    void services.auth.restore();
  }, [services]);

  return (
    <AppServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>
        <LanguageProvider initialLocale={initialLocale}>{children}</LanguageProvider>
      </QueryClientProvider>
    </AppServicesContext>
  );
}
