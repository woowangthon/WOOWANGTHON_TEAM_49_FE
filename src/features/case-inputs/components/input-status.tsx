"use client";
import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import {createLocalizedFeaturesCaseInputsSchemas} from '../schemas';

import { useTranslation } from '@/i18n/use-translation';

import { jobText } from "@/features/documents/api";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive, recomputeSchema } from "@/features/documents/api";
import type { z } from "zod";
import { useReadiness } from "../queries";
import {type Readiness} from "../schemas";

export function ReadinessView({ data, caseId, compact = false }: { data: Readiness; caseId: number; compact?: boolean }) {
const {checkLabels, missingLabels} = useLocalized(createPresentation);

const {checkTypes} = useLocalized(createLocalizedFeaturesCaseInputsSchemas);

 const {translate} = useTranslation();

  return <section data-ui="caseInputs-inputStatus_ariaLabel_section" aria-label={translate("caseInputs.inputStatus_run")} className="min-w-0 space-y-4"><h2 className="text-title font-bold">{translate("caseInputs.inputStatus_run")}</h2><p>{translate("caseInputs.inputStatus_input_version_run_result_match_check_complete", { value1: data.inputVersion })}</p>
    <div className={`grid min-w-0 gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>{checkTypes.map(type => {
      const check = data.checks.find(c => c.checkType === type);
      return <article key={type} aria-label={checkLabels[type]} className={`${cardStyle} min-w-0 break-words space-y-3`}><h3 className="font-bold">{checkLabels[type]}</h3>{check ? <><p>{check.available ? translate("caseInputs.inputStatus_run_2") : translate("caseInputs.inputStatus_run_3")} · {{ FULL: translate("caseInputs.inputStatus_all_input"), PARTIAL: translate("caseInputs.inputStatus_item"), NONE: translate("caseInputs.inputStatus_input_insufficient") }[check.mode]}</p><p>{translate("caseInputs.inputStatus_required_record", { value1: check.missingInputs.map(key => missingLabels[key] ?? key).join(", ") || translate("caseInputs.inputStatus_insufficient_item_none") })}</p>{check.reasonCode && <p>{translate("caseInputs.inputStatus_article2", { value1: check.reasonCode })}</p>}</> : <p>{translate("caseInputs.inputStatus_status_notProvided")}</p>}<Link href={`/cases/${caseId}/manual-records`} className={secondaryButton}>{translate("caseInputs.inputStatus_manual_record_confirm")}</Link></article>;
    })}</div><p className="text-body text-muted">{translate("caseInputs.inputStatus_result_comparison_sum_check_confirm_count_wage")}</p></section>;
}
export function RecomputeView({ data }: { data: z.infer<typeof recomputeSchema> }) {
const {resultLabels} = useLocalized(createPresentation);

 const {translate} = useTranslation();

  const active = recomputeActive(data);
  const job = data.activeJob ?? data.latestJob;
  return <section aria-label={translate("caseInputs.inputStatus_automatic_update_status")} className={`${cardStyle} min-w-0 break-words space-y-3`}><h2 className="text-title font-bold">{translate("caseInputs.inputStatus_automatic_update_status")}</h2><p role="status">{active ? translate("caseInputs.inputStatus_automatic_update") : translate("caseInputs.inputStatus_current_progress_none")}{job ? ` · ${job.status}` : ""}</p>{data.currentInputVersion !== undefined && <p>{translate("caseInputs.inputStatus_current_input_version", { value1: data.currentInputVersion })}</p>}
    {job?.errorCode && <p role="alert">{translate("caseInputs.inputStatus_update_error_previous_result_input_confirm_status", { value1: jobText(job.errorCode) })}</p>}
    {job?.status === "FAILED" && <p>{translate("caseInputs.inputStatus_automatic_update_failure_status_new_result_count")}</p>}
    {job?.status === "SUPERSEDED" && <p>{translate("caseInputs.inputStatus_new_input_current_status_confirm")}</p>}
    {data.results ? <ul className="space-y-2">{Object.entries(data.results).map(([key, ref]) => <li key={key}>{resultLabels[key] ?? key}: {ref ? translate("caseInputs.inputStatus_result_version_input", { value1: ref.freshness, value2: ref.version ?? translate("common.notProvided"), value3: ref.inputVersion ?? translate("common.notProvided") }) : translate("caseInputs.inputStatus_result_reference_none")}</li>)}</ul> : <p>{translate("caseInputs.inputStatus_result_current_provided")}</p>}
    <p className="text-muted">{translate("caseInputs.inputStatus_current_response_all_calculation_complete_match")}</p></section>;
}
export function InputStatus({ caseId, compact = false }: { caseId: number; compact?: boolean }) {
 const {translate} = useTranslation();

  const ready = useReadiness(caseId); const recompute = useRecomputeStatus(caseId);
  return <div className="min-w-0 space-y-6">{recompute.awaitingScheduledJob && <p role="status">{translate("caseInputs.inputStatus_save_response_automatic_update_count_confirm_status")}</p>}{recompute.isPending ? <QueryFeedback pending /> : recompute.isError ? <QueryFeedback error={recompute.error} retry={() => { void recompute.refetch(); }} /> : <><RecomputeView data={recompute.data} /><button className={secondaryButton} disabled={recompute.isFetching} onClick={() => { void recompute.refetch(); }}>{translate("caseInputs.inputStatus_update_status_retry")}</button></>}
    {ready.isPending ? <QueryFeedback pending /> : ready.isError ? <QueryFeedback error={ready.error} retry={() => { void ready.refetch(); }} /> : <ReadinessView data={ready.data} caseId={caseId} compact={compact} />}</div>;
}

function createPresentation({translate}: Translation) {
const checkLabels = { WAGE_CALCULATION: translate("caseInputs.inputStatus_wage_calculation"), CONTRACT_ATTENDANCE_COMPARISON: translate("caseInputs.inputStatus_contract_attendance_comparison"), PAYSLIP_VALIDATION: translate("caseInputs.inputStatus_payslip_sum_check"), DEPOSIT_COMPARISON: translate("caseInputs.inputStatus_deposit_comparison") };
const resultLabels: Record<string, string> = { calculation: translate("caseInputs.inputStatus_wage_calculation"), comparison: translate("caseInputs.inputStatus_contract_attendance_comparison"), payslipValidation: translate("caseInputs.inputStatus_payslip_sum_check"), depositComparison: translate("caseInputs.inputStatus_deposit_comparison") };
const missingLabels: Record<string, string> = { contract_wage: translate("caseInputs.inputStatus_contract_wage"), regular_minutes: translate("caseInputs.inputStatus_work_time"), contract: translate("caseInputs.inputStatus_contract_record"), attendance: translate("caseInputs.inputStatus_attendance_record"), comparison_basis_confirmation: translate("caseInputs.inputStatus_comparison_basis_confirm"), confirmed_payslip_totals_and_items: translate("caseInputs.inputStatus_payslip_total_amount"), payslip_net_pay: translate("caseInputs.inputStatus_payslip_netPay"), allocated_payment: translate("caseInputs.inputStatus_case_allocation_deposit"), verified_statutory_rules: translate("caseInputs.inputStatus_allowance"), overtime_hours: translate("caseInputs.inputStatus_work_time_2") };
return {checkLabels, resultLabels, missingLabels};
}
