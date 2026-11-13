"use client";
import { useRef } from "react";
import { useCase } from "@/features/cases/queries";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive } from "@/features/documents/api";
import { useResultExecution } from "./queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { primaryButton } from "@/components/ui/styles";
import { useTranslation } from "@/i18n/use-translation";
import type { Results } from "./schemas";

import { RefreshCw } from "lucide-react";

export function ResultRefresh({caseId, data}: {caseId: number; data: Results}) {
  const context = useCase(caseId);
  const status = useRecomputeStatus(caseId);
  const action = useResultExecution(caseId);
  const lock = useRef(false);
  const {translate} = useTranslation();

  const busy = data.freshness.overall === "UPDATING" || action.isPending || status.awaitingScheduledJob || !!(status.data && recomputeActive(status.data));
  return <section className="min-w-0 space-y-3" aria-label={translate("results.checkFreshness")}>
    <button type="button" title={translate("results.recomputeLabel")} aria-label={translate("results.recomputeLabel")} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line focus-visible:outline-2 disabled:opacity-50" disabled={busy || !context.data || context.isFetching || status.isPending || status.isError} onClick={async () => {
      if(lock.current || busy || !context.data)return;
      lock.current = true;
      try { await action.mutateAsync({endpoint: "recompute", version: context.data.inputVersion}); }
      catch { /* Mutation errors remain visible; onSettled refreshes the current Case. */ }
      finally { lock.current = false; }
    }}><RefreshCw size={19} aria-hidden="true" className={busy ? "animate-spin" : undefined}/><span className="sr-only" role="status">{busy ? translate("results.recalculating") : ""}</span></button>
    {status.awaitingScheduledJob && <button type="button" className={primaryButton} disabled={status.isFetching} onClick={() => void status.refetch()}>{translate("results.resultScreen_update_status_retry_confirm")}</button>}
    {action.isError && <><p role="alert">{translate("results.refreshRetry")}</p><QueryFeedback error={action.error}/></>}
    {status.isError && <QueryFeedback error={status.error} retry={() => void status.refetch()}/>}
  </section>;
}
