"use client";
import { translate } from "@/i18n/translate";


import Link from "next/link";
import { ArrowDownUp, ArrowRight } from "lucide-react";
import type { Results } from "./schemas";
import { ServerValue } from "./result-screen";
import { SourceEvidence } from "./source-evidence";
import { displayScalar, statusLabels } from "./view-models";
import styles from "./result-detail.module.css";

export type ResultCard = {
  id: string; title: string; status?: string; data: Record<string, unknown>;
  unit?: string | null; period?: Record<string, unknown>; version?: Results["versions"][string];
};
type Value = { key: string; label: string; value: unknown };
const metadataKeys = ["version", "basedOnInputVersion", "inputVersion", "createdAt", "freshness", "confirmedAt"];
const labels: Record<string, string> = { MATCH: translate("results.resultComparisonTable_record_match"), DIFFERENCE: translate("results.resultComparisonTable_difference_2"), INSUFFICIENT_INFORMATION: translate("results.resultComparisonTable_information_insufficient"), REVIEW_REQUIRED: translate("common.reviewRequired") };
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function valuesFor(card: ResultCard, groupId: string): Value[][] {
  const d = card.data;
  const value = (key: string, label: string): Value => ({ key, label, value: d[key] });
  if (groupId === "comparison") {
    const reference = [value("contractValue", translate("results.resultDetail_contract")), value("attendanceValue", translate("results.resultDetail_attendance"))].filter(v => v.key in d);
    return [reference.length ? reference : [value("contractValue", translate("results.resultDetail_contract_attendance_basis"))], [value("payslipValue", translate("results.resultDetail_payslip"))]];
  }
  if (groupId === "validation") return [["itemSum" in d ? value("itemSum", translate("results.resultDetail_item_sum")) : value("calculated", translate("results.resultDetail_calculation"))], ["statedTotal" in d ? value("statedTotal", translate("results.resultDetail_payslip_sum")) : value("stated", translate("results.resultDetail_payslip_2"))]];
  if (groupId === "deposit") return [[value("payslipNetPay", translate("results.resultDetail_netPay"))], [value("linkedPaymentTotal", translate("results.resultDetail_link_payment_sum"))]];
  return [[value("amount", translate("results.resultDetail_calculation_amount"))]];
}

export function ResultDetail({ caseId, card, groupId, onClose }: { caseId: number; card: ResultCard; groupId: string; onClose: () => void }) {
  const columns = valuesFor(card, groupId);
  const basis = record(card.data.comparisonBasis) ?? card.period;
  const mismatched = basis?.semanticMatch === false;
  const sources = Array.isArray(card.data.sources) ? card.data.sources : [];
  const displayed = new Set([...columns.flat().map(v => v.key), ...metadataKeys, "difference", "formula", "comparisonBasis", "sources", "status", "type", "label", "title", "currency", "periodStart", "periodEnd", "nextAction"]);
  const remaining = Object.fromEntries(Object.entries(card.data).filter(([key]) => !displayed.has(key)));
  const tone = card.status;
  return <article data-result-detail tabIndex={-1} aria-label={translate("results.resultDetail_detail", { value1: card.title })} className={styles.detail}>
    <header className={styles.heading}><h3>{card.title}</h3><span className={styles.status} data-status={tone}><span aria-hidden="true">•</span>{card.status ? labels[tone ?? ""] ?? statusLabels[card.status] ?? card.status : translate("results.resultComparisonTable_status_notProvided")}</span></header>
    <p className={styles.period}>{translate("results.resultDetail_wagePeriod", { value1: displayScalar("periodStart" in card.data ? card.data.periodStart : basis?.periodStart, "periodStart"), value2: displayScalar("periodEnd" in card.data ? card.data.periodEnd : basis?.periodEnd, "periodEnd") })}</p>
    <div className={styles.comparison} data-single={columns.length === 1} aria-label={translate("results.resultDetail_comparison_amount")} data-status={tone}>
      {columns.map((column, index) => <div key={index} className={styles.valueColumn}>
        {index > 0 && <ArrowDownUp className={styles.compareIcon} size={20} aria-hidden="true"/>}
        <dl>{column.map(value => <div key={value.key}><dt>{value.label}</dt><dd data-has-value={typeof value.value === "number"}>{displayScalar(value.value, value.key === "payslipNetPay" || value.key === "linkedPaymentTotal" ? "amount" : value.key, card.unit)}</dd></div>)}</dl>
      </div>)}
    </div>
    {"difference" in card.data && <p className={styles.difference} data-status={tone}>{mismatched ? translate("results.resultComparisonTable_comparison_basis_confirm_required") : <><strong>{displayScalar(card.data.difference, "difference", card.unit)}</strong><span>{translate("results.resultComparisonTable_difference")}</span></>}</p>}
    <p className={styles.guidance}>{mismatched ? translate("results.resultDetail_period_unit_match_comparison_basis_confirm") : card.status === "DIFFERENCE" ? translate("results.resultDetail_record_original_add_confirm") : card.status === "MATCH" ? translate("results.resultDetail_current_comparison_record_match") : card.status === "INSUFFICIENT_INFORMATION" ? translate("results.resultDetail_confirm_original_input") : card.status === "REVIEW_REQUIRED" ? translate("results.resultDetail_original_applicable_review") : translate("results.resultDetail_calculation_use_applicable_confirm")}</p>
    {groupId !== "calculation" && <p className={styles.disclaimer}>{translate("results.resultDetail_difference_current_comparison_scope_unpaid_wage")}</p>}
    <section className={styles.section} aria-label={translate("results.resultDetail_original_evidence")}><h4 className={styles.sourceHeading}><span>{translate("results.resultDetail_original_evidence")}</span>{!sources.length&&<Link href={`/cases/${caseId}/review`}>{translate("results.resultDetail_document_review_navigate")}<ArrowRight size={14} aria-hidden="true"/></Link>}</h4>
      {sources.length ? <div className={styles.sources}>{sources.map((source, index) => <SourceEvidence key={index} caseId={caseId} value={record(source) ?? {}} compact/>)}</div> : <p className={styles.empty}>{translate("results.resultDetail_result_link_original_evidence_notProvided")}</p>}
    </section>
    {Object.keys(remaining).length > 0 && <section className={`${styles.section} ${styles.additional}`} aria-label={translate("results.resultDetail_add_information")}><h4>{translate("results.resultDetail_add_information")}</h4><ServerValue caseId={caseId} value={remaining} unit={card.unit}/></section>}
    {typeof card.data.nextAction === "string" && <p className={styles.nextAction}>{card.data.nextAction}</p>}
    <details className={styles.section}><summary>?????? ???????? ??</summary><ServerValue caseId={caseId} value={card.data} unit={card.unit}/><ServerValue caseId={caseId} value={card.version}/></details>
    <footer className={styles.actions}><Link href={`/cases/${caseId}/questions`}>{translate("results.resultDetail_confirm_question")}<ArrowRight size={16} aria-hidden="true"/></Link><button type="button" aria-label={translate("results.resultDetail_confirm_detail_close")} onClick={onClose}>{translate("results.resultDetail_confirm")}</button></footer>
  </article>;
}
