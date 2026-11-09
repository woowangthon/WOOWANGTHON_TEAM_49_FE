"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys as keys } from "@/lib/query/business-keys";
import { useRemovalState } from "@/lib/query/use-removal-state";
import { useSessionGeneration } from "@/hooks/use-app-services";

import { revokeDocumentScope } from "@/features/documents/cache";

import { caseApi } from "./api";
import type { CaseCreate, CasePatch } from "./schemas";

export function useCases(page = 1, size = 20, workplaceId?: number) {
  const scope = useSessionScope();
  const ownerRemoval = useRemovalState([...keys.workplace(scope.generation, workplaceId ?? 0), "remove"]);
  return useQuery({ queryKey: keys.caseList(scope.generation, page, size, workplaceId), queryFn: ({ signal }) => caseApi(scope.api).list({ page, size }, workplaceId, signal), enabled: scope.enabled && !ownerRemoval.pending && !ownerRemoval.removed });
}
export function useCase(id: number) {
  const scope = useSessionScope();
  const removal = useCaseRemoval(id);
  return useQuery({ queryKey: keys.case(scope.generation, id), queryFn: ({ signal }) => caseApi(scope.api).detail(id, signal), enabled: scope.enabled && Number.isSafeInteger(id) && id > 0 && !removal.pending && !removal.removed });
}
export function useCaseRemoval(id: number) {
  const generation = useSessionGeneration();
  return useRemovalState([...keys.case(generation, id), "remove"]);
}
export function useCaseImpact(id: number) {
  const scope = useSessionScope();
  const removal = useCaseRemoval(id);
  return useQuery({ queryKey: keys.impact(scope.generation, id), queryFn: ({ signal }) => caseApi(scope.api).impact(id, signal), enabled: scope.enabled && !removal.pending && !removal.removed, staleTime: 0 });
}
export function useCreateCase() {
  const scope = useSessionScope();
  return useMutation({
    mutationFn: (body: CaseCreate) => caseApi(scope.api).create(body),
    onSuccess: async () => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      await Promise.all([
        scope.queryClient.invalidateQueries({ queryKey: keys.caseLists(scope.generation) }),
        scope.queryClient.invalidateQueries({ queryKey: keys.workplaces(scope.generation) }),
      ]);
    },
  });
}
export function useUpdateCase(id: number) {
  const scope = useSessionScope();
  return useMutation({
    mutationFn: (body: CasePatch) => caseApi(scope.api).update(id, body),
    onSuccess: async () => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      await Promise.all([
        scope.queryClient.invalidateQueries({ queryKey: keys.case(scope.generation, id) }),
        scope.queryClient.invalidateQueries({ queryKey: keys.caseLists(scope.generation) }),
      ]);
    },
  });
}
export function useDeleteCase(id: number) {
  const scope = useSessionScope();
  return useMutation({
    mutationKey: [...keys.case(scope.generation, id), "remove"],
    mutationFn: () => caseApi(scope.api).remove(id),
    onSuccess: async () => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      await scope.queryClient.cancelQueries({ queryKey: keys.case(scope.generation, id) });
      scope.queryClient.removeQueries({ queryKey: keys.case(scope.generation, id) });
      await revokeDocumentScope(scope.queryClient, scope.generation, { kind: "case", id });
      await Promise.all([
        scope.queryClient.invalidateQueries({ queryKey: keys.caseLists(scope.generation) }),
        scope.queryClient.invalidateQueries({ queryKey: keys.workplaces(scope.generation) }),
      ]);
    },
  });
}
