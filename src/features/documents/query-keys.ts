import { queryKeys } from "@/lib/query/keys";
import { businessKeys } from "@/lib/query/business-keys";
import type { DocumentContext, DocumentFilters } from "./schemas";

export const documentKeys = {
  root: (g: number) => [...queryKeys.session(g), "documents"] as const,
  lists: (g: number) => [...documentKeys.root(g), "lists"] as const,
  list: (g: number, context: DocumentContext, filters: DocumentFilters) => [...documentKeys.lists(g), context, filters] as const,
  status: (g: number, context: DocumentContext, id: number) => [...documentKeys.root(g), "status", context, id] as const,
  impact: (g: number, workplaceId: number, id: number) => [...documentKeys.root(g), "impact", workplaceId, id] as const,
  recompute: (g: number, caseId: number) => [...businessKeys.case(g, caseId), "recompute-status"] as const,
  recomputeObservation: (g: number, caseId: number) => [...businessKeys.case(g, caseId), "recompute-observation"] as const,
  recomputeHint: (g: number, caseId: number) => [...businessKeys.case(g, caseId), "recompute-receipt"] as const,
};

// Client bookkeeping for a server mutation receipt, never fabricated job/freshness state.
export interface RecomputeReceipt { jobId: string; receivedAt: number }
