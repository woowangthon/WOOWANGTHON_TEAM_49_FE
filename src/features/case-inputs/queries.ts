"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import type { CaseDetailDto } from "@/features/cases/schemas";
import { businessKeys } from "@/lib/query/business-keys";
import { documentKeys } from "@/features/documents/query-keys";
import { caseInputsApi } from "./api";
import type { ConditionsPut, ManualInput, ManualSaved } from "./schemas";
import type { UpdateMeta } from "@/features/documents/review/schemas";

export const inputKeys = {
  manuals: (g: number, c: number) => [...businessKeys.case(g, c), "manual-records"] as const,
  conditions: (g: number, c: number) => [...businessKeys.case(g, c), "conditions"] as const,
  readiness: (g: number, c: number) => [...businessKeys.case(g, c), "readiness"] as const,
};
function useInputScope(c: number) {
  const s = useSessionScope(); const removal = useCaseRemoval(c);
  return { ...s, enabled: s.enabled && Number.isSafeInteger(c) && c > 0 && !removal.pending && !removal.removed };
}
export function useManuals(c: number, page: number) {
  const s = useInputScope(c);
  return useQuery({ queryKey: [...inputKeys.manuals(s.generation, c), "list", page], queryFn: ({ signal }) => caseInputsApi(s.api).list(c, page, signal), enabled: s.enabled });
}
export function useManual(c: number, r: number) {
  const s = useInputScope(c);
  return useQuery({ queryKey: [...inputKeys.manuals(s.generation, c), "detail", r], queryFn: ({ signal }) => caseInputsApi(s.api).record(c, r, signal), enabled: s.enabled });
}
export function useConditions(c: number) {
  const s = useInputScope(c);
  return useQuery({ queryKey: inputKeys.conditions(s.generation, c), queryFn: ({ signal }) => caseInputsApi(s.api).conditions(c, signal), enabled: s.enabled });
}
export function useReadiness(c: number) {
  const s = useInputScope(c);
  return useQuery({ queryKey: inputKeys.readiness(s.generation, c), queryFn: ({ signal }) => caseInputsApi(s.api).readiness(c, signal), enabled: s.enabled });
}
type Action = { type: "create"; body: ManualInput } | { type: "update"; recordId: number; body: ManualInput } | { type: "remove"; recordId: number } | { type: "conditions"; body: ConditionsPut };
export function useInputAction(c: number) {
  const s = useInputScope(c);
  return useMutation<ManualSaved | UpdateMeta | void, unknown, Action>({ gcTime: 0,
    mutationFn: (a: Action) => {
      const api = caseInputsApi(s.api);
      switch (a.type) {
        case "create": return api.create(c, a.body);
        case "update": return api.update(c, a.recordId, a.body);
        case "remove": return api.remove(c, a.recordId);
        case "conditions": return api.saveConditions(c, a.body);
      }
    },
    onSuccess: data => {
      if (s.session.getSnapshot().generation !== s.generation) return;
      if (data?.inputVersion) s.queryClient.setQueryData<CaseDetailDto>(businessKeys.case(s.generation, c), old => old ? { ...old, inputVersion: data.inputVersion! } : old);
      if (data?.recompute?.scheduled && data.recompute.jobId) s.queryClient.setQueryData(documentKeys.recomputeHint(s.generation, c), { jobId: data.recompute.jobId, receivedAt: Date.now() });
    },
    onSettled: async (_data, error, action) => {
      if (s.session.getSnapshot().generation !== s.generation) return;
      if (!error && action.type === "remove") {
        const key = [...inputKeys.manuals(s.generation, c), "detail", action.recordId];
        await s.queryClient.cancelQueries({ queryKey: key }); s.queryClient.removeQueries({ queryKey: key });
      }
      await Promise.all([
        s.queryClient.invalidateQueries({ queryKey: businessKeys.case(s.generation, c) }),
        s.queryClient.invalidateQueries({ queryKey: businessKeys.caseLists(s.generation) }),
        ...(action.type === "create" && action.body.recordType === "DEPOSIT" ? [s.queryClient.invalidateQueries({queryKey:businessKeys.workplaces(s.generation)})] : []),
        s.queryClient.invalidateQueries({ queryKey: documentKeys.recompute(s.generation, c) }),
      ]);
    },
  });
}
