import { z } from "zod";
import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema } from "@/lib/api/schema";
import { updateMetaSchema } from "@/features/documents/review/schemas";
import { conditionsSchema, manualRecordSchema, manualSavedSchema, readinessSchema, type ConditionsPut, type ManualInput } from "./schemas";

export function caseInputsApi(api: ApiClient) {
  const path = (c: number) => `/cases/${c}/manual-records`;
  return {
    list: (c: number, page: number, signal?: AbortSignal) => api.requestJson(`${path(c)}?page=${page}&size=20`, decodeWith(pageSchema(manualRecordSchema).transform(v => ({ ...v, items: v.items.filter(r => r.recordType !== "DEPOSIT") }))), { signal }),
    record: (c: number, r: number, signal?: AbortSignal) => api.requestJson(`${path(c)}/${r}`, decodeWith(manualRecordSchema.refine(v => v.caseId === c && v.recordId === r)), { signal }),
    create: (c: number, body: ManualInput) => api.requestJson(path(c), decodeWith(manualSavedSchema), { method: "POST", body: { ...body } }),
    update: (c: number, r: number, body: ManualInput) => api.requestJson(`${path(c)}/${r}`, decodeWith(manualSavedSchema), { method: "PATCH", body: { ...body } }),
    remove: (c: number, r: number) => api.requestNoContent(`${path(c)}/${r}`, { method: "DELETE" }),
    conditions: (c: number, signal?: AbortSignal) => api.requestJson(`/cases/${c}/conditions`, decodeWith(conditionsSchema), { signal }),
    saveConditions: (c: number, body: ConditionsPut) => api.requestJson(`/cases/${c}/conditions`, decodeWith(updateMetaSchema.extend({ inputVersion: z.number().int().positive() })), { method: "PUT", body: { ...body } }),
    readiness: (c: number, signal?: AbortSignal) => api.requestJson(`/cases/${c}/readiness`, decodeWith(readinessSchema.refine(v => v.caseId === c)), { signal }),
  };
}
