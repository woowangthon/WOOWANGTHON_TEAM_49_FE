import type { ApiClient } from "@/lib/api/client";
import { decodeWith } from "@/lib/api/schema";
import { resultsSchema } from "./schemas";
export function resultsApi(api: ApiClient) { return {
  results: (c: number, signal?: AbortSignal) => api.requestJson(`/cases/${c}/results`, decodeWith(resultsSchema), { signal }),
}; }
