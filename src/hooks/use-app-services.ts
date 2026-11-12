"use client";
import { translate } from "@/i18n/translate";


import { createContext, useContext, useSyncExternalStore } from "react";

import type { AppServices } from "@/lib/app-services";

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error(translate("common.useAppServices_use"));
  return services;
}

/** Refresh is transparent; only login/logout/account switch changes this scope. */
export function useSessionGeneration() {
  const { session } = useAppServices();
  return useSyncExternalStore(
    session.subscribe,
    () => session.getSnapshot().generation,
    () => 0,
  );
}
