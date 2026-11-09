"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAppServices, useSessionGeneration } from "@/hooks/use-app-services";

import { authKeys } from "../query-keys";

export function useAuth() {
  const { auth } = useAppServices();
  return useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getServerSnapshot);
}

export function useCurrentUser() {
  const { authApi } = useAppServices();
  const generation = useSessionGeneration();
  const { status } = useAuth();
  return useQuery({
    queryKey: authKeys.me(generation),
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled: status === "authenticated",
  });
}
