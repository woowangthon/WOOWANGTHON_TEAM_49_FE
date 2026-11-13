"use client";
import { useRef } from "react";
import { useCase } from "@/features/cases/queries";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive } from "@/features/documents/api";
import { useResultExecution } from "./queries";


import { useTranslation } from "@/i18n/use-translation";
import type { Results } from "./schemas";

import { RefreshCw } from "lucide-react";

export function ResultRefresh({caseId, data}: {caseId: number; data: Results}) {
  const context = useCase(caseId);
  const status = useRecomputeStatus(caseId);
  const action = useResultExecution(caseId);
  const lock = useRef(false);
  const {translate} = useTranslation();

  const retryStatus = status.isError || status.scheduledJobTimedOut;
  const busy = !retryStatus && ( data.freshness.overall === "UPDATING" || action.isPending || status.awaitingScheduledJob || !!(status.data && recomputeActive(status.data)));
  return <section className="min-w-0 space-y-2 text-right" aria-label={translate("results.checkFreshness")}>
    <button type="button" title={translate("results.recomputeLabel")} aria-label={translate("results.recomputeLabel")} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line focus-visible:outline-2 disabled:opacity-50" disabled={busy || !context.data || context.isFetching || status.isPending} onClick={async () => {
      if(lock.current || busy || !context.data)return;
      if(retryStatus){ void status.refetch(); return; }
      lock.current = true;
      try { await action.mutateAsync({endpoint: "recompute", version: context.data.inputVersion}); }
      catch { /* Mutation errors remain visible; onSettled refreshes the current Case. */ }
      finally { lock.current = false; }
    }}><RefreshCw size={19} aria-hidden="true" className={busy ? "animate-spin" : undefined}/><span className="sr-only" role="status">{busy ? translate("results.recalculating") : ""}</span></button>
    {(action.isError || retryStatus) && <p role="alert" className="text-xs">{translate("results.refreshRetry")}</p>}
  </section>;
}
