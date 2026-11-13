"use client";
import {MessageError} from '@/i18n/message-error';

import { createContext, useContext, useSyncExternalStore } from "react";

import type { AppServices } from "@/lib/app-services";

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new MessageError("common.useAppServices_use");
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
