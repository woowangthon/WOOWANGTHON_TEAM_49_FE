"use client";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useConditions, useManuals } from "@/features/case-inputs/queries";
import { documentApi } from "@/features/documents/api";
import { documentKeys } from "@/features/documents/query-keys";
import { useCaseRemoval } from "./queries";
import type { CaseListDto } from "./schemas";
import { caseProgress } from "./progress";

export function useCaseProgress(dto?: CaseListDto) {
  const id = dto?.caseId ?? 0;
  const s = useSessionScope();
  const removal = useCaseRemoval(id);
  const conditions = useConditions(id);
  const manuals = useManuals(id, 1);
  const documents = useQuery({
    queryKey: [...documentKeys.lists(s.generation), "progress", id],
    enabled: s.enabled && id > 0 && !removal.pending && !removal.removed,
    queryFn: async ({signal}) => {
      const api = documentApi(s.api);
      const context = {kind: "case", id} as const;
      const first = await api.list(context, {page: 1, size: 100}, signal);
      const items = [...first.items];
      for (let page = 2; (page - 1) * first.size < first.total; page++) {
        items.push(...(await api.list(context, {page, size: 100}, signal)).items);
      }
      return {...first, items};
    },
  });
  return dto ? caseProgress(dto, conditions.isError ? undefined : conditions.data, documents.isError ? undefined : documents.data, manuals.isError ? undefined : manuals.data?.total) : undefined;
}
