import { z } from "zod";

import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema, paginationSearch, type PaginationInput } from "@/lib/api/schema";

import { workplaceSchema, workplaceCreateSchema, workplacePatchSchema, type WorkplaceWrite } from "./schemas";

export function workplaceApi(api: ApiClient) {
  return {
    list: (pagination: PaginationInput, signal?: AbortSignal) => api.requestJson(`/workplaces?${paginationSearch(pagination)}`, decodeWith(pageSchema(workplaceSchema)), { signal, expectedStatus: 200 }),
    detail: (id: number, signal?: AbortSignal) => api.requestJson(`/workplaces/${id}`, decodeWith(workplaceSchema), { signal, expectedStatus: 200 }),
    create: (body: WorkplaceWrite) => api.requestJson("/workplaces", decodeWith(z.object({ workplaceId: z.number().int().positive() })), { expectedStatus: 201, method: "POST", body: workplaceCreateSchema.parse(body) }),
    update: (id: number, body: z.infer<typeof workplacePatchSchema>) => api.requestJson(`/workplaces/${id}`, () => undefined, { expectedStatus: 200, method: "PATCH", body: workplacePatchSchema.parse(body) }),
    // P0 API_ENDPOINTS supplies the status omitted from the narrative PDF.
    remove: (id: number) => api.requestNoContent(`/workplaces/${id}`, { method: "DELETE" }),
  };
}
