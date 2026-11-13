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
import { useLocalized } from "@/i18n/use-translation";
import { createLocalizedFeaturesResultsViewModels } from "./view-models";

export function ResultRefresh({caseId, data}: {caseId: number; data: Results}) {
  const context = useCase(caseId);
  const status = useRecomputeStatus(caseId);
  const action = useResultExecution(caseId);
  const lock = useRef(false);
  const {translate} = useTranslation();
  const {statusLabels} = useLocalized(createLocalizedFeaturesResultsViewModels);
  const busy = action.isPending || status.awaitingScheduledJob || !!(status.data && recomputeActive(status.data));
  const needsRefresh = ["STALE", "FAILED", "UPDATING"].includes(data.freshness.overall ?? "");
  const checks = ["calculation", "comparison", "payslipValidation", "depositComparison"] as const;
  const labels = {calculation: "results.checkCalculation", comparison: "results.checkComparison", payslipValidation: "results.checkPayslip", depositComparison: "results.checkDeposit"} as const;
  return <section className="min-w-0 space-y-3" aria-label={translate("results.checkFreshness")}>
    <ul>{checks.map(check => {
      const version = status.data?.results[check] ?? data.versions[check];
      return version ? <li key={check}>{translate(labels[check])}: {statusLabels[version.freshness]}</li> : null;
    })}</ul>
    {(needsRefresh || busy) && <button type="button" className={primaryButton} disabled={busy || !context.data || context.isFetching || status.isPending || status.isError} onClick={async () => {
      if(lock.current || busy || !context.data)return;
      lock.current = true;
      try { await action.mutateAsync({endpoint: "recompute", version: context.data.inputVersion}); }
      catch { /* Mutation errors remain visible; onSettled refreshes the current Case. */ }
      finally { lock.current = false; }
    }}>{busy ? translate("results.recalculating") : translate("results.refreshLatest")}</button>}
    {status.awaitingScheduledJob && <button type="button" className={primaryButton} disabled={status.isFetching} onClick={() => void status.refetch()}>{translate("results.resultScreen_update_status_retry_confirm")}</button>}
    {action.isError && <><p role="alert">{translate("results.refreshRetry")}</p><QueryFeedback error={action.error}/></>}
    {status.isError && <QueryFeedback error={status.error} retry={() => void status.refetch()}/>}
  </section>;
}
