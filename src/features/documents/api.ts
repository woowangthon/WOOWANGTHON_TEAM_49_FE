import { documentStatusView } from "./view-models";
import { versionSchema } from "@/features/results/schemas";
import { z } from "zod";
import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch } from "@/lib/api/schema";
import { linkCreateSchema, linkPatchSchema, caseDocumentSchema, documentSchema, documentTypePatchSchema, impactSchema, linkSchema, mutationSchema, statusSchema, uploadSchema, type DocumentDto, type DocumentContext, type DocumentFilters, type LinkInput } from "./schemas";

export function documentPath(context: DocumentContext) {
  return context.kind === "library" ? "/documents" : `/${context.kind === "case" ? "cases" : "workplaces"}/${context.id}/documents`;
}
export const recomputeSchema = z.object({
 caseId:z.number().int(),currentInputVersion:z.number().int(),activeJob:z.record(z.string(),z.json()).nullable(),latestJob:z.record(z.string(),z.json()).nullable(),results:z.record(z.string(),versionSchema),pending:z.number().int().optional(),running:z.number().int().optional(),
});
export function recomputeActive(value: z.infer<typeof recomputeSchema>) {
  return (value.pending ?? 0) > 0 || (value.running ?? 0) > 0 || ["PENDING", "RUNNING"].includes(typeof value.activeJob?.status === "string" ? value.activeJob.status : "");
}
export function documentApi(api: ApiClient) {
  return {
    list: (context: DocumentContext, filters: DocumentFilters, signal?: AbortSignal): Promise<{items: DocumentDto[]; page:number; size:number; total:number}> => {
      const search = paginationSearch(filters);
      const params = new URLSearchParams(search);
      if (context.kind === "library" && filters.workplaceId) params.set("workplaceId", String(filters.workplaceId));
      if (context.kind !== "case" && filters.documentType) params.set("documentType", filters.documentType);
      return context.kind === "case"
        ? api.requestJson(`${documentPath(context)}?${params}`, decodeWith(pageSchema(caseDocumentSchema)), { signal, expectedStatus: 200 })
        : api.requestJson(`${documentPath(context)}?${params}`, decodeWith(pageSchema(documentSchema)), { signal, expectedStatus: 200 });
    },
    detail: (c: number, d: number, signal?: AbortSignal) => api.requestJson(`/cases/${c}/documents/${d}`, decodeWith(documentSchema.refine(v=>v.documentId===d)), {signal,expectedStatus:200}),
    status: (context: Exclude<DocumentContext, {kind: "library"}>, id: number, signal?: AbortSignal) => api.requestJson(`${documentPath(context)}/${id}`, decodeWith(documentSchema.transform(documentStatusView)), { signal, expectedStatus: 200 }),
    upload: (context: Exclude<DocumentContext, {kind: "library"}>, file: File, documentType: string, signal?: AbortSignal) => {
      const formData = new FormData();
      formData.set("file", file); formData.set("documentType", documentType);
      return api.requestJson(documentPath(context), decodeWith(uploadSchema), { expectedStatus: 202, method: "POST", formData, signal });
    },
    connect: (caseId: number, documentId: number, body: LinkInput) => api.requestJson(`/cases/${caseId}/document-links`, decodeWith(linkSchema.extend(mutationSchema.shape)), { expectedStatus: 201, method: "POST", body: linkCreateSchema.parse({ documentId, ...body }) }),
    updateLink: (caseId: number, linkId: number, body: LinkInput) => api.requestJson(`/cases/${caseId}/document-links/${linkId}`, decodeWith(linkSchema.extend(mutationSchema.shape)), { expectedStatus: 200, method: "PATCH", body: linkPatchSchema.parse(body) }),
    unlink: (caseId: number, linkId: number, _expectedInputVersion: number) => api.requestNoContent(`/cases/${caseId}/document-links/${linkId}`, (void _expectedInputVersion, { method: "DELETE" })),
    retry: (caseId: number, documentId: number) => api.requestJson(`/cases/${caseId}/documents/${documentId}/retry`, decodeWith(statusSchema), { expectedStatus: 202, method: "POST" }),
    // P0 PATCH /workplaces/{workplace_id}/documents/{document_id}: set the type (or AUTO) and extract again.
    changeType: (workplaceId: number, documentId: number, documentType: string) => api.requestJson(`/workplaces/${workplaceId}/documents/${documentId}`, decodeWith(documentSchema.refine(v => v.documentId === documentId && v.workplaceId === workplaceId)), { expectedStatus: 202, method: "PATCH", body: documentTypePatchSchema.parse({ documentType }) }),
    impact: (workplaceId: number, documentId: number, signal?: AbortSignal) => api.requestJson(`/workplaces/${workplaceId}/documents/${documentId}/deletion-impact`, decodeWith(impactSchema), { signal, expectedStatus: 200 }),
    // P0 OpenAPI / API-041 specifies 204; no JSON envelope or purge receipt.
    remove: (workplaceId: number, documentId: number) => api.requestNoContent(`/workplaces/${workplaceId}/documents/${documentId}?confirm=true`, { method: "DELETE" }),
    recompute: (caseId: number, signal?: AbortSignal) => api.requestJson(`/cases/${caseId}/recompute-status`, decodeWith(recomputeSchema), { signal, expectedStatus: 200 }),
  };
}

export function jobText(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }
