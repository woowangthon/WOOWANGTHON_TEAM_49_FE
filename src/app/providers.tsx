"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";

export function AppProviders({ children }: { children: ReactNode }) {
  // Per-tree construction also isolates SSR requests; no module-level user state.
  const [services] = useState(createAppServices);

  return (
    <AppServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>
        {children}
      </QueryClientProvider>
    </AppServicesContext>
  );
}
