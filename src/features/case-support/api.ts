import { decodeWith } from "@/lib/api/schema";
import type { ApiClient } from "@/lib/api/client";
import {
  questionsSchema, reportSchema, reportsSchema, inquirySchema,
  inquiryInputSchema, centersSchema, type InquiryInput,
} from "./schemas";

export const supportApi = (api: ApiClient) => ({
  // P0 optional fields; keep minimal requests available to existing callers.
  inquiry: (caseId: number, input: InquiryInput = {}) =>
    api.requestJson(`/cases/${caseId}/company-inquiry`, decodeWith(inquirySchema), {
      method: "POST",
      body: inquiryInputSchema.parse(input),
      expectedStatus: 200,
    }),
  centers: (region: string, category: string, page: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (region.trim()) params.set("region", region.trim());
    if (category === "WAGE") params.set("category", category);
    return api.requestJson(`/consultation-centers?${params}`, decodeWith(centersSchema), {
      signal,
      expectedStatus: 200,
    });
  },
  questions: (caseId: number, signal?: AbortSignal) =>
    api.requestJson(`/cases/${caseId}/questions`, decodeWith(questionsSchema), { signal, expectedStatus: 200 }),
  reports: (caseId: number, signal?: AbortSignal, page = 1) =>
    api.requestJson(`/cases/${caseId}/reports?page=${page}&size=20`, decodeWith(reportsSchema), { signal, expectedStatus: 200 }),
  report: (caseId: number, reportId: number, signal?: AbortSignal) =>
    api.requestJson(`/cases/${caseId}/reports/${reportId}`, decodeWith(reportSchema), { signal, expectedStatus: 200 }),
  create: (caseId: number, documentIds: number[], idempotencyKey: string) =>
    api.requestJson(`/cases/${caseId}/reports`, decodeWith(reportSchema), {
      method: "POST",
      expectedStatus: 202,
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        includeOriginalDocuments: documentIds.length > 0,
        documentIds,
        useLatestAvailableResults: true,
        acknowledgeOutdatedResults: false,
      },
    }),
});
