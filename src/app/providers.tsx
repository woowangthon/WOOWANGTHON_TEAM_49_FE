"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { mockEnabled } from "@/lib/config/mock";

const MockBoundary = process.env.NODE_ENV === "development"
  ? dynamic(() => import("@/mocks/mock-boundary"), { ssr: false }) : null;

export function AppProviders({ children }: { children: ReactNode }) {
  return mockEnabled && MockBoundary
    ? <MockBoundary><ServicesProvider>{children}</ServicesProvider></MockBoundary>
    : <ServicesProvider>{children}</ServicesProvider>;
}

function ServicesProvider({ children }: { children: ReactNode }) {
  // Per-tree construction also isolates SSR requests; no module-level user state.
  const [services] = useState(createAppServices);

  useEffect(() => {
    void services.auth.restore();
  }, [services]);

  return (
    <AppServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>
        {children}
      </QueryClientProvider>
    </AppServicesContext>
  );
}
