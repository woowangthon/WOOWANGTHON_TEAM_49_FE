"use client";

import { useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { documentApi } from "@/features/documents/api";
import { documentKeys } from "@/features/documents/query-keys";
import { businessKeys } from "@/lib/query/business-keys";
import { supportApi } from "./api";
import type { Report } from "./schemas";
import { MessageError } from "@/i18n/message-error";

export type CenterFilters = { region: string; category: string; page: number };

const reportKeys = {
  root: (generation: number, caseId: number) => [...businessKeys.case(generation, caseId), "reports"],
  list: (generation: number, caseId: number, page: number) => [...reportKeys.root(generation, caseId), "list", page],
  detail: (generation: number, caseId: number, reportId: number) => [...reportKeys.root(generation, caseId), reportId],
};

function useSupportScope(caseId: number) {
  const scope = useSessionScope();
  const removal = useCaseRemoval(caseId);
  return { ...scope, enabled: scope.enabled && !removal.pending && !removal.removed };
}

export function useQuestions(caseId: number) {
  const scope = useSupportScope(caseId);
  return useQuery({
    queryKey: [...businessKeys.case(scope.generation, caseId), "questions"],
    enabled: scope.enabled,
    queryFn: ({ signal }) => supportApi(scope.api).questions(caseId, signal),
    staleTime: 0,
  });
}

export function useReports(caseId: number, page = 1) {
  const scope = useSupportScope(caseId);
  return useQuery({
    queryKey: reportKeys.list(scope.generation, caseId, page),
    enabled: scope.enabled,
    queryFn: ({ signal }) => supportApi(scope.api).reports(caseId, signal, page),
    staleTime: 0,
    refetchInterval: query => query.state.error ? false : query.state.data?.items.some(report => report.status === "PROCESSING") ? 2000 : false,
  });
}

export function useReport(caseId: number, initial: Report) {
  const scope = useSupportScope(caseId);
  return useQuery({
    queryKey: reportKeys.detail(scope.generation, caseId, initial.reportId),
    enabled: scope.enabled,
    queryFn: ({ signal }) => supportApi(scope.api).report(caseId, initial.reportId, signal),
    refetchInterval: query => query.state.error ? false : (query.state.data ?? initial).status === "PROCESSING" ? 2000 : false,
  });
}

export function useCreateReport(caseId: number, availableDocumentIds: readonly number[], onSuccess: (report: Report) => void) {
  const scope = useSupportScope(caseId);
  const retry = useRef<{ body: string; key: string } | null>(null);
  return useMutation({
    gcTime: 0,
    mutationFn: (documentIds: number[]) => {
      if (documentIds.some(id => !availableDocumentIds.includes(id))) {
        throw new MessageError("caseSupport.screens_selected_original_retry_confirm");
      }
      const body = JSON.stringify(documentIds);
      if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
      return supportApi(scope.api).create(caseId, documentIds, retry.current.key);
    },
    onSuccess: async report => {
      if (scope.session.getSnapshot().generation !== scope.generation) return;
      retry.current = null;
      onSuccess(report);
      await scope.queryClient.invalidateQueries({ queryKey: reportKeys.root(scope.generation, caseId) });
    },
  });
}

export function useRegisteredCenters(filters: CenterFilters) {
  const scope = useSessionScope();
  return useQuery({
    queryKey: [...businessKeys.root(scope.generation), "consultation-centers", filters],
    enabled: scope.enabled,
    queryFn: ({ signal }) => supportApi(scope.api).centers(filters.region, filters.category, filters.page, signal),
  });
}

/** Load all server pages so local selection and validation share the same scope. */
export function useReportDocuments(caseId: number) {
  const s = useSupportScope(caseId);
  const context = { kind: "case", id: caseId } as const;
  return useQuery({
    queryKey: [...documentKeys.lists(s.generation), "report-selection", caseId],
    enabled: s.enabled,
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
