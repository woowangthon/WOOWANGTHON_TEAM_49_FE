"use client";
import { useAuth } from "@/features/auth/hooks/use-auth";

import { useAppServices, useSessionGeneration } from "./use-app-services";

export function useSessionScope() {
  const services = useAppServices();
  const generation = useSessionGeneration();
  const { status } = useAuth();
  return { ...services, generation, enabled: status === "authenticated" };
}
