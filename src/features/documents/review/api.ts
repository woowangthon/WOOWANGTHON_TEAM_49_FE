import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch } from "@/lib/api/schema";
import { fieldUpdatedSchema, fieldsSchema, historySchema, overrideRemovedSchema, previewSchema, replacementConfirmedSchema, replacementCreatedSchema, replacementSchema, reviewSchema, type FieldPatch, type ReplacementId } from "./schemas";
export const caseDocumentPath = (caseId: number, documentId: number) => `/cases/${caseId}/documents/${documentId}`;
export function reviewApi(api: ApiClient) {
  return {
    preview: (w: number, d: number, signal?: AbortSignal) => api.requestJson(`/workplaces/${w}/documents/${d}/preview`, decodeWith(previewSchema), {signal,expectedStatus:200}),
    file: (w: number, d: number, signal?: AbortSignal) => api.requestBlob(`/workplaces/${w}/documents/${d}/file`, {signal}),
    fields: (c: number, d: number, signal?: AbortSignal) => api.requestJson(`${caseDocumentPath(c,d)}/fields`, decodeWith(fieldsSchema.refine(v=>v.caseId===c&&v.documentId===d)), {signal,expectedStatus:200}),
    patchCase: (c: number, d: number, f: number, patch: FieldPatch, version: number) => api.requestJson(`${caseDocumentPath(c,d)}/fields/${f}`, decodeWith(fieldUpdatedSchema), {expectedStatus:200,method:"PATCH", body:{...patch,expectedInputVersion:version}}),
    patchShared: (w: number, d: number, f: number, patch: FieldPatch) => api.requestJson(`/workplaces/${w}/documents/${d}/fields/${f}`, decodeWith(fieldUpdatedSchema), {expectedStatus:200,method:"PATCH",body:{...patch}}),
    removeOverride: (c: number, d: number, f: number, version: number) => api.requestJson(`${caseDocumentPath(c,d)}/field-overrides/${f}`, decodeWith(overrideRemovedSchema), {expectedStatus:200,method:"DELETE",body:{expectedInputVersion:version}}),
    history: (c: number, d: number, f: number, page: number, signal?: AbortSignal) => api.requestJson(`${caseDocumentPath(c,d)}/fields/${f}/history?${paginationSearch({page,size:20})}`, decodeWith(pageSchema(historySchema)), {signal,expectedStatus:200}),
    review: (c: number, d: number, signal?: AbortSignal) => api.requestJson(`${caseDocumentPath(c,d)}/review`, decodeWith(reviewSchema.refine(v=>v.caseId===c&&v.documentId===d)), {signal,expectedStatus:200}),
    confirmReview: (c: number, d: number, version: number) => api.requestJson(`${caseDocumentPath(c,d)}/review/confirm`, decodeWith(reviewSchema), {expectedStatus:200,method:"POST",body:{expectedInputVersion:version}}),
    replace: (c: number, d: number, file: File, version: number, signal?: AbortSignal) => {
      const formData = new FormData();formData.set("file",file);formData.set("expectedInputVersion",String(version));
      return api.requestJson(`${caseDocumentPath(c,d)}/replace`, decodeWith(replacementCreatedSchema), {expectedStatus:202,method:"POST",formData,signal});
    },
    replacement: (c: number, r: ReplacementId, signal?: AbortSignal) => api.requestJson(`/cases/${c}/document-replacements/${encodeURIComponent(r)}`, decodeWith(replacementSchema), {signal,expectedStatus:200}),
    confirmReplacement: (c: number, r: ReplacementId, version: number) => api.requestJson(`/cases/${c}/document-replacements/${encodeURIComponent(r)}/confirm`, decodeWith(replacementConfirmedSchema), {expectedStatus:200,method:"POST",body:{confirmed:true,expectedInputVersion:version}}),
  };
}
