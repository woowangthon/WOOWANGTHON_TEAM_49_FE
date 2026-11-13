"use client";
import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import {createLocalizedFeaturesResultsViewModels} from './view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ResultGroup } from "./result-explorer";

import styles from "./result-comparison-table.module.css";

type Value = { label: string; value: unknown };
type Row = { groupId: string; cardId: string; groupTitle: string; title: string; status?: string; reference: Value[]; compared: Value[]; difference: unknown; unit?: string | null; mismatched: boolean };
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function Values({ values, unit }: { values: Value[]; unit?: string | null }) {
const {displayScalar} = useLocalized(createLocalizedFeaturesResultsViewModels);

  return <div className={styles.valueList}>{values.map((value, index) => <div key={`${value.label}-${index}`}><small>{value.label}</small><span>{displayScalar(value.value, "value", unit)}</span></div>)}</div>;
}
export function ResultComparisonTable({ groups, onSelect, resultVersion }: { groups: ResultGroup[]; onSelect: (groupId: string, cardId: string) => void; resultVersion: number | null }) {
const {filters, statuses, rowsFrom} = useLocalized(createPresentation);

const {displayScalar} = useLocalized(createLocalizedFeaturesResultsViewModels);

 const {translate} = useTranslation();

  const [filter, setFilter] = useState<keyof typeof filters>("ALL");
  const id = useId();
  const rows = rowsFrom(groups);
  const visible = rows.filter(row => filter === "ALL" || row.status === filter);
  return <section className={styles.section} aria-labelledby={`${id}-heading`}>
    <header className={styles.heading}><div><p>{translate("results.resultComparisonTable_record_confirm")}</p><h2 id={`${id}-heading`}>{translate("results.resultComparisonTable_item_comparison")}</h2></div><span className={styles.version}>{translate("results.resultComparisonTable_result_version", { value1: resultVersion ?? translate("results.viewModels_none") })}</span></header>
    <div role="group" aria-label={translate("results.resultComparisonTable_comparison_status_filter")} className={styles.filters}>{(Object.keys(filters) as (keyof typeof filters)[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{filters[key]} <span>({rows.filter(row => key === "ALL" || row.status === key).length})</span></button>)}</div>
    <p className={styles.scope}>{translate("results.resultComparisonTable_current_comparison_item_basis_wage_calculation_original", { value1: rows.length })}</p>
    <div className={styles.tableFrame}><table className={styles.table}>
      <caption className={styles.visuallyHidden}>{translate("results.resultComparisonTable_current_response_provided_record_comparison_payslip_sum")}</caption>
      <thead><tr><th scope="col">{translate("results.resultComparisonTable_confirm_item")}</th><th scope="col">{translate("results.resultComparisonTable_comparison_basis")}</th><th scope="col">{translate("results.resultComparisonTable_comparison")}</th><th scope="col">{translate("results.resultComparisonTable_result")}</th><th scope="col">{translate("results.resultComparisonTable_difference")}</th><th scope="col">{translate("results.resultComparisonTable_evidence")}</th></tr></thead>
      <tbody>{visible.length ? visible.map(row => <tr key={`${row.groupId}-${row.cardId}`}>
        <th scope="row" className={styles.item}><small>{row.groupTitle}</small><span>{row.title}</span></th>
        <td><span className={styles.mobileLabel} aria-hidden="true">{translate("results.resultComparisonTable_comparison_basis")}</span><Values values={row.reference} unit={row.unit}/></td>
        <td><span className={styles.mobileLabel} aria-hidden="true">{translate("results.resultComparisonTable_comparison")}</span><Values values={row.compared} unit={row.unit}/></td>
        <td className={styles.statusCell}><span className={styles.mobileLabel} aria-hidden="true">{translate("results.resultComparisonTable_result")}</span><span className={styles.badge} data-status={row.status}><span aria-hidden="true">{statuses[row.status ?? ""]?.symbol ?? "·"}</span>{statuses[row.status ?? ""]?.label ?? translate("results.resultComparisonTable_status_notProvided")}</span></td>
        <td className={styles.difference}><span className={styles.mobileLabel} aria-hidden="true">{translate("results.resultComparisonTable_difference")}</span><span data-difference={row.status === "DIFFERENCE" && typeof row.difference === "number" && !row.mismatched}>{row.mismatched ? translate("results.resultComparisonTable_comparison_basis_confirm_required") : displayScalar(row.difference, "difference", row.unit)}</span></td>
        <td className={styles.actionCell}><button type="button" className={styles.evidenceButton} aria-label={translate("results.resultComparisonTable_evidence_2", { value1: row.title })} onClick={() => onSelect(row.groupId, row.cardId)}>{translate("results.resultComparisonTable_evidence_3")}<ArrowUpRight size={14} aria-hidden="true"/></button></td>
      </tr>) : <tr><td colSpan={6} className={styles.empty}>{translate("results.resultComparisonTable_comparison_item_empty_status_select")}</td></tr>}</tbody>
    </table></div>
    <p className={styles.disclaimer}>{translate("results.resultComparisonTable_difference_current_comparison_scope_unpaid_wage_deduction")}</p>
  </section>;
}

function createPresentation({translate}: Translation) {
const filters = { ALL: translate("results.resultComparisonTable_all"), MATCH: translate("results.resultComparisonTable_match"), DIFFERENCE: translate("results.resultComparisonTable_difference"), INSUFFICIENT_INFORMATION: translate("results.resultComparisonTable_information_insufficient"), REVIEW_REQUIRED: translate("common.reviewRequired") } as const;
const statuses: Record<string, { label: string; symbol: string }> = {
  MATCH: { label: translate("results.resultComparisonTable_record_match"), symbol: "✓" },
  DIFFERENCE: { label: translate("results.resultComparisonTable_difference_2"), symbol: "△" },
  INSUFFICIENT_INFORMATION: { label: translate("results.resultComparisonTable_information_insufficient"), symbol: "?" },
  REVIEW_REQUIRED: { label: translate("common.reviewRequired"), symbol: "!" },
};
const knownTitles: Record<string, string> = {
  HOURLY_WAGE: translate("results.resultComparisonTable_hourlyWage_comparison"), WORK_HOURS: translate("results.resultComparisonTable_work_time_comparison"), WORKED_HOURS: translate("results.resultComparisonTable_work_time_comparison_2"),
  WORKED_MINUTES: translate("results.resultComparisonTable_work_time_comparison_2"), BASE_PAY: translate("results.resultComparisonTable_basePay_comparison"),
};
function rowsFrom(groups: ResultGroup[]): Row[] {
  return groups.filter(group => group.id !== "calculation").flatMap(group => group.cards.map(card => {
    const data = card.data;
    const basis = record(data.comparisonBasis);
    let reference: Value[], compared: Value[];
    if (group.id === "comparison") {
      reference = (["contractValue", "attendanceValue"] as const).filter(key => key in data).map(key => ({ label: key === "contractValue" ? translate("results.resultComparisonTable_contract") : translate("results.resultComparisonTable_attendance"), value: data[key] }));
      if (!reference.length) reference = [{ label: translate("results.resultComparisonTable_contract_attendance"), value: undefined }];
      compared = [{ label: translate("results.resultComparisonTable_payslip"), value: data.payslipValue }];
    } else if (group.id === "validation") {
      reference = [{ label: "itemSum" in data ? translate("results.resultComparisonTable_sum") : translate("results.resultComparisonTable_calculation"), value: "itemSum" in data ? data.itemSum : data.calculated }];
      compared = [{ label: translate("results.resultComparisonTable_payslip"), value: "statedTotal" in data ? data.statedTotal : data.stated }];
    } else if (group.id === "deposit") {
      reference = [{ label: translate("results.resultComparisonTable_payslip_netPay"), value: data.payslipNetPay }];
      compared = [{ label: translate("results.resultComparisonTable_link_payment"), value: data.linkedPaymentTotal }];
    } else {
      reference = [{ label: translate("results.resultComparisonTable_comparison_basis"), value: undefined }];
      compared = [{ label: translate("results.resultComparisonTable_comparison"), value: undefined }];
    }
    return { groupId: group.id, cardId: card.id, groupTitle: group.title, title: typeof data.type === "string" && card.title === data.type ? knownTitles[data.type] ?? card.title : card.title,
      status: card.status, reference, compared, difference: data.difference,
      unit: card.unit ?? (typeof basis?.unit === "string" ? basis.unit : group.id === "validation" || group.id === "deposit" ? "KRW" : undefined),
      mismatched: basis?.semanticMatch === false || card.period?.semanticMatch === false };
  }));
}
return {filters, statuses, knownTitles, rowsFrom};
}
