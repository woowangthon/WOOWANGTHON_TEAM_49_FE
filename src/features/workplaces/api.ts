import { z } from "zod";

import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch, type PaginationInput } from "@/lib/api/schema";

import { workplaceSchema, type WorkplaceWrite } from "./schemas";

export function workplaceApi(api: ApiClient) {
  return {
    list: (pagination: PaginationInput, signal?: AbortSignal) => api.requestJson(`/workplaces?${paginationSearch(pagination)}`, decodeWith(pageSchema(workplaceSchema)), { signal }),
    detail: (id: number, signal?: AbortSignal) => api.requestJson(`/workplaces/${id}`, decodeWith(workplaceSchema), { signal }),
    create: (body: WorkplaceWrite) => api.requestJson("/workplaces", decodeWith(z.object({ workplaceId: z.number().int().positive() })), { method: "POST", body: { ...body } }),
    update: (id: number, body: Partial<WorkplaceWrite>) => api.requestJson(`/workplaces/${id}`, () => undefined, { method: "PATCH", body: { ...body } }),
    // P0 API_ENDPOINTS supplies the status omitted from the narrative PDF.
    remove: (id: number) => api.requestNoContent(`/workplaces/${id}`, { method: "DELETE" }),
  };
}
