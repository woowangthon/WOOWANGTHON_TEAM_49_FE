"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys as keys } from "@/lib/query/business-keys";
import { useRemovalState } from "@/lib/query/use-removal-state";
import { useSessionGeneration } from "@/hooks/use-app-services";

import { revokeDocumentScope } from "@/features/documents/cache";

import { workplaceApi } from "./api";
import type { WorkplaceWrite } from "./schemas";

export function useWorkplaces(page = 1, size = 20) {
  const scope = useSessionScope();
  return useQuery({ queryKey: keys.workplaceList(scope.generation, page, size), queryFn: ({ signal }) => workplaceApi(scope.api).list({ page, size }, signal), enabled: scope.enabled });
}
export function useWorkplace(id: number, fresh = false) {
  const scope = useSessionScope();
  const removal = useWorkplaceRemoval(id);
  return useQuery({ queryKey: keys.workplace(scope.generation, id), queryFn: ({ signal }) => workplaceApi(scope.api).detail(id, signal), enabled: scope.enabled && Number.isSafeInteger(id) && id > 0 && !removal.pending && !removal.removed, staleTime: fresh ? 0 : 30_000 });
}
export function useWorkplaceRemoval(id: number) {
  const generation = useSessionGeneration();
  return useRemovalState([...keys.workplace(generation, id), "remove"]);
}
export function useCreateWorkplace() {
  const scope = useSessionScope();
  return useMutation({
    mutationFn: (body: WorkplaceWrite) => workplaceApi(scope.api).create(body),
    onSuccess: () => { if (scope.session.getSnapshot().generation === scope.generation) return scope.queryClient.invalidateQueries({ queryKey: keys.workplaceLists(scope.generation) }); },
  });
}
export function useUpdateWorkplace(id: number) {
  const scope = useSessionScope();
  return useMutation({
    mutationFn: (body: Partial<WorkplaceWrite>) => workplaceApi(scope.api).update(id, body),
    onSuccess: async () => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      await Promise.all([
        scope.queryClient.invalidateQueries({ queryKey: keys.workplaces(scope.generation) }),
        scope.queryClient.invalidateQueries({ queryKey: keys.cases(scope.generation) }),
      ]);
    },
  });
}
export function useDeleteWorkplace(id: number) {
  const scope = useSessionScope();
  return useMutation({
    mutationKey: [...keys.workplace(scope.generation, id), "remove"],
    mutationFn: () => workplaceApi(scope.api).remove(id),
    onSuccess: async () => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      await scope.queryClient.cancelQueries({ queryKey: keys.workplace(scope.generation, id) });
      scope.queryClient.removeQueries({ queryKey: keys.workplace(scope.generation, id) });
      await revokeDocumentScope(scope.queryClient, scope.generation, { kind: "workplace", id });
      await scope.queryClient.cancelQueries({ queryKey: keys.cases(scope.generation) });
      scope.queryClient.removeQueries({ queryKey: keys.cases(scope.generation) });
      await scope.queryClient.invalidateQueries({ queryKey: keys.workplaceLists(scope.generation) });
    },
  });
}
