"use client";
import {useTranslation} from "@/i18n/use-translation";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAppServices, useSessionGeneration } from "@/hooks/use-app-services";

import { authKeys } from "../query-keys";

export function useAuth() {
  const {translate} = useTranslation();
  const { auth } = useAppServices();
  const snapshot = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getServerSnapshot);
  return {...snapshot, notice: snapshot.notice ? translate(snapshot.notice) : null};
}

export function useCurrentUser() {
  const { authApi } = useAppServices();
  const generation = useSessionGeneration();
  const { status } = useAuth();
  return useQuery({
    queryKey: authKeys.me(generation),
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled: status === "authenticated",
    staleTime: Infinity,
  });
}
