"use client";
import { translate } from "@/i18n/translate";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { documentKeys, type RecomputeReceipt } from "./query-keys";
import { businessKeys } from "@/lib/query/business-keys";
import { useRemovalState } from "@/lib/query/use-removal-state";
import { documentApi, recomputeActive } from "./api";
import type { DocumentContext, DocumentDto, DocumentFilters, LinkInput } from "./schemas";
import { isProcessing } from "./view-models";

export { documentKeys } from "./query-keys";

export function useDocuments(context: DocumentContext, filters: DocumentFilters) {
  const s = useSessionScope();
  const removal = useRemovalState(context.kind === "library" ? ["unused-removal"] : [...(context.kind === "case" ? businessKeys.case(s.generation, context.id) : businessKeys.workplace(s.generation, context.id)), "remove"]);
  return useQuery({ queryKey: documentKeys.list(s.generation, context, filters), queryFn: ({ signal }) => documentApi(s.api).list(context, filters, signal), enabled: s.enabled && !removal.pending && !removal.removed });
}
export function useDocumentStatus(context: DocumentContext, dto: DocumentDto) {
  const s = useSessionScope();
  return useQuery({
    queryKey: documentKeys.status(s.generation, context, dto.documentId),
    queryFn: async ({ signal }) => {
      if (context.kind === "library") throw new Error(translate("documents.queries_original_detail_required"));
      const result = await documentApi(s.api).status(context, dto.documentId, signal);
      if (!isProcessing(result.processingStatus)) {
        void s.queryClient.invalidateQueries({ queryKey: documentKeys.lists(s.generation) });
        void s.queryClient.invalidateQueries({ queryKey: businessKeys.cases(s.generation) });
      }
      return result;
    },
    enabled: s.enabled && context.kind !== "library" && isProcessing(dto.processingStatus),
    staleTime: Infinity, refetchOnWindowFocus: false,
    refetchInterval: q => q.state.error ? false : isProcessing(q.state.data?.processingStatus ?? dto.processingStatus) ? 2000 : false,
  });
}
export function useDocumentImpact(workplaceId: number, id: number) {
  const s = useSessionScope();
  return useQuery({ queryKey: documentKeys.impact(s.generation, workplaceId, id), queryFn: ({ signal }) => documentApi(s.api).impact(workplaceId, id, signal), enabled: s.enabled, staleTime: 0 });
}
export function useRecomputeStatus(caseId: number) {
  const s = useSessionScope();
  const removal = useRemovalState([...businessKeys.case(s.generation, caseId), "remove"]);
  const receipt = useQuery<RecomputeReceipt | null>({ queryKey: documentKeys.recomputeHint(s.generation, caseId), queryFn: () => null, enabled: false });
  const unobserved = (data: Awaited<ReturnType<ReturnType<typeof documentApi>["recompute"]>> | undefined) => !!receipt.data && data?.activeJob?.jobId !== receipt.data.jobId && data?.latestJob?.jobId !== receipt.data.jobId;
  const query = useQuery({ queryKey: documentKeys.recompute(s.generation, caseId), queryFn: async ({ signal }) => {
      const result = await documentApi(s.api).recompute(caseId, signal);
      if (!recomputeActive(result)) {
        // Existing result snapshots remain visible while the final server versions refresh.
        void s.queryClient.invalidateQueries({ queryKey: businessKeys.case(s.generation, caseId), predicate: q => q.queryKey.includes("readiness") || q.queryKey.includes("results") || q.queryKey.includes("deposit-comparison") || q.queryKey.includes("questions") || q.queryKey.includes("reports") });
      }
      return result;
    }, enabled: s.enabled && !removal.pending && !removal.removed,
    refetchInterval: q => q.state.error ? false : q.state.data && recomputeActive(q.state.data) ? 2000
      : unobserved(q.state.data) && Date.now() - receipt.data!.receivedAt < 15_000 ? 2000 : false });
  return { ...query, awaitingScheduledJob: unobserved(query.data) };
}
export type DocumentAction =
 | { type: "upload"; context: Exclude<DocumentContext, {kind: "library"}>; file: File; documentType: string; signal: AbortSignal }
 | { type: "connect"; caseId: number; documentId: number; body: LinkInput }
 | { type: "update"; caseId: number; linkId: number; body: LinkInput }
 | { type: "unlink"; caseId: number; linkId: number; expectedInputVersion: number }
 | { type: "retry"; caseId: number; documentId: number }
 | { type: "changeType"; workplaceId: number; documentId: number; documentType: string }
 | { type: "remove"; workplaceId: number; documentId: number };
export function useDocumentAction() {
  const s = useSessionScope();
  return useMutation({
    gcTime: 0,
    mutationFn: async (action: DocumentAction) => {
      const api = documentApi(s.api);
      switch (action.type) {
        case "upload": return api.upload(action.context, action.file, action.documentType, action.signal);
        case "connect": return api.connect(action.caseId, action.documentId, action.body);
        case "update": return api.updateLink(action.caseId, action.linkId, action.body);
        case "unlink": return api.unlink(action.caseId, action.linkId, action.expectedInputVersion);
        case "retry": return api.retry(action.caseId, action.documentId);
        case "changeType": return api.changeType(action.workplaceId, action.documentId, action.documentType);
        case "remove": return api.remove(action.workplaceId, action.documentId);
      }
    },
    onSettled: async (_data, _error, action) => {
      if (s.session.getSnapshot().generation !== s.generation) return;
      // A finished status poll would otherwise keep showing the previous type error over the refreshed list.
      if (action.type === "changeType") s.queryClient.removeQueries({ queryKey: documentKeys.root(s.generation), predicate: q => q.queryKey[3] === "status" && q.queryKey[5] === action.documentId });
      // Mutation failures can have reached the server, so refresh authoritative state too.
      if (action.type === "remove" || action.type === "unlink") {
        await s.queryClient.cancelQueries({ queryKey: documentKeys.root(s.generation) });
        s.queryClient.removeQueries({ queryKey: documentKeys.root(s.generation), predicate: q => q.queryKey[3] === "status" || (!_error && action.type === "remove" && q.queryKey[3] !== "lists" && q.queryKey[5] === action.documentId) });
      }
      await Promise.all([
        s.queryClient.invalidateQueries({ queryKey: documentKeys.root(s.generation), predicate: q => {
          // Do not refetch revoked detail/impact URLs while their dialog/card unmounts.
          if (["preview", "file"].includes(String(q.queryKey[3]))) return false;
          if (!_error && action.type === "remove" && q.queryKey[3] !== "lists") return false;
          if (!_error && action.type === "unlink" && q.queryKey[3] === "status") return false;
          return true;
        } }),
        s.queryClient.invalidateQueries({ queryKey: businessKeys.root(s.generation) }),
      ]);
    },
  });
}
