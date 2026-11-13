import { recomputeActive, type recomputeSchema } from "./api";
import type { z } from "zod";

export interface RecomputeObservation { active: boolean; activeJobId?: string; terminal?: string }
// Stored in the session/case QueryClient cache, so remounts and multiple observers
// share the same completion receipt. This never changes server freshness.
export function observeRecompute(previous: RecomputeObservation | undefined, result: z.infer<typeof recomputeSchema>, receiptJobId?: string) {
  if (recomputeActive(result)) return {state: {...previous, active: true, activeJobId: typeof result.activeJob?.jobId === "string" ? result.activeJob.jobId : previous?.activeJobId}, refresh: false};
  const job = result.latestJob;
  const terminal = job && typeof job.jobId === "string" && ["SUCCEEDED", "PARTIAL", "FAILED", "SUPERSEDED"].includes(String(job.status)) ? `${job.jobId}:${job.status}` : undefined;
  const changed = terminal !== undefined && terminal !== previous?.terminal;
  const refresh = changed && (!!previous?.active || (!!previous?.terminal) || job?.jobId === receiptJobId);
  return {state: {active: false, terminal: terminal ?? previous?.terminal}, refresh};
}
