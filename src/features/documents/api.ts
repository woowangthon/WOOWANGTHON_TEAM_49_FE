import { z } from "zod";
import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch } from "@/lib/api/schema";
import { caseDocumentSchema, documentSchema, impactSchema, linkSchema, mutationSchema, statusSchema, uploadSchema, type DocumentContext, type DocumentFilters, type LinkInput } from "./schemas";

export function documentPath(context: DocumentContext) {
  return context.kind === "library" ? "/documents" : `/${context.kind === "case" ? "cases" : "workplaces"}/${context.id}/documents`;
}
export const recomputeSchema = z.object({
  caseId: z.number().int().positive(),
  pending: z.number().int().nonnegative().optional(), running: z.number().int().nonnegative().optional(),
  currentInputVersion: z.number().int().positive().optional(),
  activeJob: z.object({ status: z.string(), jobId: z.string().optional(), errorCode: z.string().nullable().optional() }).nullable().optional(),
  latestJob: z.object({ status: z.string(), jobId: z.string().optional(), errorCode: z.string().nullable().optional() }).nullable().optional(),
  results: z.record(z.string(), z.object({
    snapshotId: z.number().nullable().optional(), version: z.number().nullable().optional(),
    inputVersion: z.number().int().optional(), freshness: z.enum(["CURRENT", "STALE", "UPDATING", "FAILED"]),
  }).nullable()).optional(),
}).refine(v => v.pending !== undefined || v.running !== undefined || v.activeJob !== undefined,
  "갱신 상태 계약을 확인할 수 없습니다.");
export function recomputeActive(value: z.infer<typeof recomputeSchema>) {
  return (value.pending ?? 0) > 0 || (value.running ?? 0) > 0 || ["PENDING", "RUNNING"].includes(value.activeJob?.status ?? "");
}
export function documentApi(api: ApiClient) {
  return {
    list: (context: DocumentContext, filters: DocumentFilters, signal?: AbortSignal) => {
      const search = paginationSearch(filters);
      const params = new URLSearchParams(search);
      if (context.kind === "library" && filters.workplaceId) params.set("workplaceId", String(filters.workplaceId));
      if (context.kind !== "case" && filters.documentType) params.set("documentType", filters.documentType);
      if (context.kind === "library" && filters.processingStatus) params.set("processingStatus", filters.processingStatus);
      return api.requestJson(`${documentPath(context)}?${params}`, decodeWith(pageSchema(context.kind === "case" ? caseDocumentSchema : documentSchema)), { signal, expectedStatus: 200 });
    },
    detail: (c: number, d: number, signal?: AbortSignal) => api.requestJson(`/cases/${c}/documents/${d}`, decodeWith(documentSchema.refine(v=>v.documentId===d)), {signal,expectedStatus:200}),
    status: (context: Exclude<DocumentContext, {kind: "library"}>, id: number, signal?: AbortSignal) => api.requestJson(`${documentPath(context)}/${id}`, decodeWith(statusSchema), { signal, expectedStatus: 200 }),
    upload: (context: Exclude<DocumentContext, {kind: "library"}>, file: File, documentType: string, signal?: AbortSignal) => {
      const formData = new FormData();
      formData.set("file", file); formData.set("documentType", documentType);
      return api.requestJson(documentPath(context), decodeWith(uploadSchema), { expectedStatus: 202, method: "POST", formData, signal });
    },
    connect: (caseId: number, documentId: number, body: LinkInput) => api.requestJson(`/cases/${caseId}/document-links`, decodeWith(linkSchema.extend(mutationSchema.shape)), { expectedStatus: 201, method: "POST", body: { documentId, ...body } }),
    updateLink: (caseId: number, linkId: number, body: LinkInput) => api.requestJson(`/cases/${caseId}/document-links/${linkId}`, decodeWith(linkSchema.extend(mutationSchema.shape)), { expectedStatus: 200, method: "PATCH", body: { ...body } }),
    unlink: (caseId: number, linkId: number, expectedInputVersion: number) => api.requestNoContent(`/cases/${caseId}/document-links/${linkId}`, { method: "DELETE", body: { expectedInputVersion } }),
    retry: (caseId: number, documentId: number) => api.requestJson(`/cases/${caseId}/documents/${documentId}/retry`, decodeWith(statusSchema), { expectedStatus: 202, method: "POST", body: {} }),
    impact: (workplaceId: number, documentId: number, signal?: AbortSignal) => api.requestJson(`/workplaces/${workplaceId}/documents/${documentId}/deletion-impact`, decodeWith(impactSchema), { signal, expectedStatus: 200 }),
    // P0 API_ENDPOINTS explicitly specifies 204; no JSON envelope or purge receipt.
    remove: (workplaceId: number, documentId: number) => api.requestNoContent(`/workplaces/${workplaceId}/documents/${documentId}?confirm=true`, { method: "DELETE" }),
    recompute: (caseId: number, signal?: AbortSignal) => api.requestJson(`/cases/${caseId}/recompute-status`, decodeWith(recomputeSchema), { signal, expectedStatus: 200 }),
  };
}
