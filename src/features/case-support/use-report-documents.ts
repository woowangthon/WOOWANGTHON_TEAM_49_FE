"use client";

import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { documentApi } from "@/features/documents/api";
import { documentKeys } from "@/features/documents/query-keys";

/** Load all server pages so local selection and validation share the same scope. */
export function useReportDocuments(caseId: number) {
  const s = useSessionScope();
  const removal = useCaseRemoval(caseId);
  const context = { kind: "case", id: caseId } as const;
  return useQuery({
    queryKey: [...documentKeys.lists(s.generation), "report-selection", caseId],
    enabled: s.enabled && !removal.pending && !removal.removed,
    queryFn: async ({ signal }) => {
      const api = documentApi(s.api);
      const first = await api.list(context, { page: 1, size: 100 }, signal);
      const items = [...first.items];
      for (let page = 2; (page - 1) * first.size < first.total; page++) {
        const next = await api.list(context, { page, size: 100 }, signal);
        items.push(...next.items);
      }
      return { ...first, items };
    },
  });
}
