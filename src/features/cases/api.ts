import { z } from "zod";

import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch, type PaginationInput } from "@/lib/api/schema";

import { caseCreatedSchema, caseDetailSchema, caseListItemSchema, deletionImpactSchema, type CaseCreate, type CasePatch } from "./schemas";

export function caseApi(api: ApiClient) {
  return {
    list: (pagination: PaginationInput, workplaceId?: number, signal?: AbortSignal) => api.requestJson(
      `${workplaceId === undefined ? "/cases" : `/workplaces/${workplaceId}/cases`}?${paginationSearch(pagination)}`, decodeWith(pageSchema(caseListItemSchema)), { signal },
    ),
    detail: (id: number, signal?: AbortSignal) => api.requestJson(`/cases/${id}`, decodeWith(caseDetailSchema), { signal }),
    create: (body: CaseCreate) => api.requestJson("/cases", decodeWith(caseCreatedSchema), { method: "POST", body: { ...body } }),
    update: (id: number, body: CasePatch) => api.requestJson(`/cases/${id}`, decodeWith(z.object({ inputVersion: z.number().int().positive(), recompute: z.unknown().optional() })), { method: "PATCH", body: { ...body } }),
    impact: (id: number, signal?: AbortSignal) => api.requestJson(`/cases/${id}/deletion-impact`, decodeWith(deletionImpactSchema), { signal }),
    remove: (id: number) => api.requestNoContent(`/cases/${id}`, { method: "DELETE" }),
  };
}
