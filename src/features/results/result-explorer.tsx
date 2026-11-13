"use client";

import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import {createLocalizedFeaturesResultsViewModels} from './view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useId, useState, type ReactNode } from "react";
import { Calculator, Check, ChevronRight, CircleHelp, Files, Landmark, ReceiptText, Search, TriangleAlert } from "lucide-react";
import { ResultCarousel } from "@/components/ui/result-carousel";
import type { Results } from "./schemas";

import { ServerValue } from "./result-screen";
import styles from "./result-explorer.module.css";
import { ResultComparisonTable } from "./result-comparison-table";
import { ResultDetail, type ResultCard } from "./result-detail";

export type ResultGroup = { id: string; title: string; cards: ResultCard[] };

const groupIcons = { calculation: Calculator, comparison: Files, validation: ReceiptText, deposit: Landmark };
const shortcuts = [
 { status: "DIFFERENCE", count: "difference", Icon: TriangleAlert, tone: styles.difference },
 { status: "INSUFFICIENT_INFORMATION", count: "insufficientInformation", Icon: CircleHelp, tone: styles.insufficient },
 { status: "REVIEW_REQUIRED", count: "reviewRequired", Icon: Search, tone: styles.review },
] as const;
function text(v: unknown, fallback: string) { return typeof v === "string" ? v : fallback; }

export function ResultExplorer({ data, compare, before, after, freshnessUnverified = false, showDetailsInitially = true }: { data: Results; compare: boolean; before?: ReactNode; after?: ReactNode; freshnessUnverified?: boolean; showDetailsInitially?: boolean }) {
const {filters, resultGroups} = useLocalized(createResultPresentation);

const {statusLabels} = useLocalized(createLocalizedFeaturesResultsViewModels);

 const {translate} = useTranslation();

 const groups = resultGroups(data, compare);
 const [detailsVisible, setDetailsVisible] = useState(showDetailsInitially);
 const [active, setActive] = useState(groups[0].id);
 const [evidenceStatus, setEvidenceStatus] = useState<string>();
 const [states, setStates] = useState<Record<string, { filter: string; selected: Record<string, string> }>>({});
 const id = useId();
 const group = groups.find(g => g.id === active) ?? groups[0];
 const state = states[group.id] ?? { filter: "ALL", selected: {} };
 const filtered = group.cards.filter(c => state.filter === "ALL" || c.status === state.filter);
 const index = Math.max(0, filtered.findIndex(c => c.id === state.selected[state.filter]));
 const card = filtered[index];
 const evidenceItems = data.items.filter(item => item.status === evidenceStatus);
 const selectGroup = (next: string) => { setEvidenceStatus(undefined); setActive(next); };
 const filter = (next: string) => { setEvidenceStatus(undefined); setStates(s => ({ ...s, [group.id]: { ...state, filter: next } })); };
 const selectEvidence = (groupId: string, cardId: string) => {
  if (!groups.some(g => g.id === groupId && g.cards.some(c => c.id === cardId))) return;
  setEvidenceStatus(undefined); setDetailsVisible(true); setActive(groupId);
  setStates(s => ({ ...s, [groupId]: { filter: "ALL", selected: { ...s[groupId]?.selected, ALL: cardId } } }));
  requestAnimationFrame(() => {
   const panel = document.getElementById(`${id}-panel`);
   const evidence = panel?.querySelector<HTMLElement>("[data-result-detail]");
   if (evidence) { evidence.focus(); evidence.scrollIntoView?.({ block: "start" }); }
   else panel?.focus();
  });
 };
 const closeDetail = () => {
  setDetailsVisible(false);
  requestAnimationFrame(() => {
   const table = document.getElementById(`${id}-comparison-table`);
   table?.focus(); table?.scrollIntoView?.({ block: "start" });
  });
 };
 const jump = (status: string) => {
  setEvidenceStatus(undefined);
  const target = groups.find(g => g.cards.some(c => c.status === status));
  if (target) { setDetailsVisible(true); setActive(target.id); setStates(s => ({ ...s, [target.id]: { filter: status, selected: { ...s[target.id]?.selected, [status]: target.cards.find(c => c.status === status)!.id } } })); }
  else {
   setEvidenceStatus(status);
   requestAnimationFrame(() => {
    const evidence = document.getElementById(`${id}-evidence`);
    if (evidence) { evidence.focus(); evidence.scrollIntoView?.({ block: "center" }); }
   });
  }
  if (target) requestAnimationFrame(() => document.getElementById(`${id}-panel`)?.focus());
 };
 return <>
  <aside className={styles.overview} data-ui="results-resultExplorer_ariaLabel_aside" aria-label={translate("results.resultExplorer_important_result_notice")}>
   <div className={styles.overviewHeading}><h2>{translate("results.resultExplorer_confirm")}</h2><p><Check size={14} aria-hidden="true"/>{translate("results.resultExplorer_record_match")}<strong>{translate("results.resultExplorer_p2", { value1: data.summary.counts.match ?? translate("common.notProvided") })}</strong></p></div>
   <div className={styles.shortcuts}>{shortcuts.map(({status, count, Icon, tone}) => <button key={status} className={`${styles.shortcut} ${tone}`} data-empty={data.summary.counts[count] === 0} aria-label={translate("results.resultExplorer_confirm_2", { value1: filters[status], value2: data.summary.counts[count] })} onClick={() => jump(status)}>
    <span className={styles.shortcutLabel}><Icon size={17} aria-hidden="true"/>{filters[status]}</span>
    <span className={styles.shortcutCount}><strong>{data.summary.counts[count] ?? translate("common.notProvided")}</strong><span>{translate("common.countUnit")}</span><ChevronRight size={17} aria-hidden="true"/></span>
   </button>)}</div>
   <p className={styles.scope}>{translate("results.resultExplorer_all_filter_count_current_response_select_check")}</p>
   <p className={styles.version}>{translate("results.resultExplorer_current_input_result", { value1: freshnessUnverified ? translate("results.resultExplorer_current_confirm") : statusLabels[data.freshness.overall ?? ""] ?? translate("results.resultExplorer_current_notProvided"), value2: data.currentInputVersion, value3: data.resultVersion ?? translate("results.viewModels_none") })}</p>
   <p className={styles.caution}>{translate("results.resultExplorer_unpaid_wage")}</p>
  </aside>
  {before}
  <div id={`${id}-comparison-table`} tabIndex={-1}><ResultComparisonTable groups={groups} resultVersion={data.resultVersion} onSelect={selectEvidence}/></div>
  {!detailsVisible&&showDetailsInitially&&<button className={styles.filter} type="button" onClick={()=>setDetailsVisible(true)}>{translate("results.resultExplorer_item_detail_retry")}</button>}
  {detailsVisible&&<section className={styles.explorer} aria-label={compare ? translate("results.resultExplorer_check") : translate("results.resultExplorer_result")}>
   <header className={styles.explorerHeading}><div><h2>{compare ? translate("results.resultExplorer_record_difference") : translate("results.resultExplorer_item")}</h2><p>{compare ? translate("results.resultExplorer_record_comparison_payslip_deposit_check_confirm") : translate("results.resultExplorer_calculation_record_comparison_result_confirm")}</p></div><span>{translate("results.resultExplorer_check_2", { value1: groups.length })}</span></header>
   <div role="tablist" aria-label={translate("results.resultExplorer_result_2")} className={`${styles.tabs} ${compare ? styles.comparisonTabs : ""}`}>{groups.map((g, i) => { const Icon = groupIcons[g.id as keyof typeof groupIcons]; return <button key={g.id} id={`${id}-${g.id}`} role="tab" aria-label={g.title} aria-selected={group.id === g.id} aria-controls={`${id}-panel`} tabIndex={group.id === g.id ? 0 : -1} className={styles.tab} onClick={() => selectGroup(g.id)} onKeyDown={e => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? groups.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + groups.length) % groups.length;
    selectGroup(groups[next].id); document.getElementById(`${id}-${groups[next].id}`)?.focus();
   }}><Icon size={18} aria-hidden="true"/><span>{g.title}</span><span className={styles.tabCount} aria-hidden="true">{g.cards.length}</span></button>; })}</div>
   <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${group.id}`} tabIndex={-1} className={styles.panel}>
    <div role="group" aria-label={translate("results.resultExplorer_check_status_filter")} className={styles.filters}>{Object.entries(filters).map(([key, label]) => <button key={key} aria-pressed={state.filter === key} className={styles.filter} onClick={() => filter(key)}>{label} <span>({group.cards.filter(c => key === "ALL" || c.status === key).length})</span></button>)}</div>
    <ResultCarousel count={filtered.length} index={index} title={group.title} onIndexChange={next => { setEvidenceStatus(undefined); setStates(s => ({ ...s, [group.id]: { ...state, selected: { ...state.selected, [state.filter]: filtered[next].id } } })); }}>
     {card && <ResultDetail key={`${group.id}-${card.id}`} caseId={data.caseId} card={card} groupId={group.id} onClose={closeDetail}/>}
    </ResultCarousel>
   </div>
  </section>}
  {evidenceStatus&&<section id={`${id}-evidence`} tabIndex={-1} aria-label={translate("results.resultExplorer_add_evidence_confirm")} className={styles.evidence}><h2>{translate("results.resultExplorer_add_evidence_confirm")}</h2><p role="status">{translate("results.resultExplorer_item_confirm_status_none_detail_provided_scope", { value1: filters[evidenceStatus as keyof typeof filters] })}</p>{evidenceItems.map(item => <article key={item.id} className={styles.evidenceItem}><h3>{item.title} · {statusLabels[item.status]}</h3><ServerValue caseId={data.caseId} value={item}/></article>)}</section>}
  {after}
 </>;
}

export function createResultPresentation({translate}: Translation) {
const checks = { paymentTotal: translate("results.resultExplorer_payment_sum"), deductionTotal: translate("results.resultExplorer_deduction_sum"), netPay: translate("results.resultExplorer_netPay") } as const;
const filters = { ALL: translate("results.resultComparisonTable_all"), DIFFERENCE: translate("results.resultComparisonTable_difference"), INSUFFICIENT_INFORMATION: translate("results.resultComparisonTable_information_insufficient"), REVIEW_REQUIRED: translate("common.reviewRequired"), MATCH: translate("results.resultComparisonTable_match") };
const comparisonTitles: Record<string, string> = { HOURLY_WAGE: translate("results.resultComparisonTable_hourlyWage_comparison") };
function resultGroups(d: Results, compare: boolean): ResultGroup[] {
 return [
  ...(!compare ? [{ id: "calculation", title: translate("results.resultExplorer_wage_calculation_item"), cards: (d.calculation?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: v.label ?? v.type ?? translate("results.resultExplorer_calculation_item", { value1: i + 1 }), status: v.status, data: v, unit: v.currency, version: d.versions.calculation })) }] : []),
  { id: "comparison", title: compare ? translate("results.resultExplorer_contract_attendance_payslip_comparison") : translate("results.resultExplorer_record_comparison"), cards: (d.comparison?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: text(v.title, comparisonTitles[v.type ?? ""] ?? v.type ?? translate("results.resultExplorer_comparison_item", { value1: i + 1 })), status: v.status, data: v, unit: v.comparisonBasis?.unit, period: v.comparisonBasis ?? undefined, version: d.versions.comparison })) },
  { id: "validation", title: translate("results.resultExplorer_payslip_sum_check"), cards: d.payslipValidation ? (Object.keys(checks) as (keyof typeof checks)[]).map(key => ({ id: key, title: checks[key], status: d.payslipValidation![key].status, data: d.payslipValidation![key], unit: "KRW", version: d.versions.payslipValidation })) : [] },
  { id: "deposit", title: translate("results.resultExplorer_deposit_comparison"), cards: d.depositComparison ? [{ id: "deposit", title: translate("results.resultExplorer_link_payment_payslip_comparison"), status: typeof d.depositComparison.status === "string" ? d.depositComparison.status : undefined, data: d.depositComparison, unit: "KRW", version: d.versions.depositComparison }] : [] },
 ];
}
return {checks, filters, comparisonTitles, resultGroups};
}
