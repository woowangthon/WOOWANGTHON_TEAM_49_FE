"use client";

import { useId, useState, type ReactNode } from "react";
import { Calculator, Check, ChevronRight, CircleHelp, Files, Landmark, ReceiptText, Search, TriangleAlert } from "lucide-react";
import { ResultCarousel } from "@/components/ui/result-carousel";
import type { Results } from "./schemas";
import { statusLabels } from "./view-models";
import { ServerValue } from "./result-screen";
import styles from "./result-explorer.module.css";
import { ResultComparisonTable } from "./result-comparison-table";
import { ResultDetail, type ResultCard } from "./result-detail";

export type ResultGroup = { id: string; title: string; cards: ResultCard[] };
const checks = { paymentTotal: "지급 합계", deductionTotal: "공제 합계", netPay: "실수령액" } as const;
const filters = { ALL: "전체", DIFFERENCE: "차이", INSUFFICIENT_INFORMATION: "정보 부족", REVIEW_REQUIRED: "검토 필요", MATCH: "일치" };
const comparisonTitles: Record<string, string> = { HOURLY_WAGE: "시급 대조" };
const groupIcons = { calculation: Calculator, comparison: Files, validation: ReceiptText, deposit: Landmark };
const shortcuts = [
 { status: "DIFFERENCE", count: "difference", Icon: TriangleAlert, tone: styles.difference },
 { status: "INSUFFICIENT_INFORMATION", count: "insufficientInformation", Icon: CircleHelp, tone: styles.insufficient },
 { status: "REVIEW_REQUIRED", count: "reviewRequired", Icon: Search, tone: styles.review },
] as const;
function text(v: unknown, fallback: string) { return typeof v === "string" ? v : fallback; }
export function resultGroups(d: Results, compare: boolean): ResultGroup[] {
 return [
  ...(!compare ? [{ id: "calculation", title: "임금 계산 항목", cards: (d.calculation?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: v.label ?? v.type ?? `계산 항목 ${i + 1}`, status: v.status, data: v, unit: v.currency, version: d.versions.calculation })) }] : []),
  { id: "comparison", title: compare ? "계약·근태·명세서 대조" : "자료 대조", cards: (d.comparison?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: text(v.title, comparisonTitles[v.type ?? ""] ?? v.type ?? `대조 항목 ${i + 1}`), status: v.status, data: v, unit: v.comparisonBasis?.unit, period: v.comparisonBasis ?? undefined, version: d.versions.comparison })) },
  { id: "validation", title: "명세서 내부 합계 검사", cards: d.payslipValidation ? (Object.keys(checks) as (keyof typeof checks)[]).map(key => ({ id: key, title: checks[key], status: d.payslipValidation![key].status, data: d.payslipValidation![key], unit: "KRW", version: d.versions.payslipValidation })) : [] },
  { id: "deposit", title: "입금 대조", cards: d.depositComparison ? [{ id: "deposit", title: "연결 지급액과 명세서 대조", status: typeof d.depositComparison.status === "string" ? d.depositComparison.status : undefined, data: d.depositComparison, unit: "KRW", version: d.versions.depositComparison }] : [] },
 ];
}
export function ResultExplorer({ data, compare, before, after, freshnessUnverified = false, showDetailsInitially = true }: { data: Results; compare: boolean; before?: ReactNode; after?: ReactNode; freshnessUnverified?: boolean; showDetailsInitially?: boolean }) {
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
  <aside className={styles.overview} aria-label="중요한 결과 안내">
   <div className={styles.overviewHeading}><h2>먼저 확인해 보세요</h2><p><Check size={14} aria-hidden="true"/>자료상 일치 <strong>{data.summary.counts.match}개</strong></p></div>
   <div className={styles.shortcuts}>{shortcuts.map(({status, count, Icon, tone}) => <button key={status} className={`${styles.shortcut} ${tone}`} data-empty={data.summary.counts[count] === 0} aria-label={`${filters[status]} ${data.summary.counts[count]}개 · 확인`} onClick={() => jump(status)}>
    <span className={styles.shortcutLabel}><Icon size={17} aria-hidden="true"/>{filters[status]}</span>
    <span className={styles.shortcutCount}><strong>{data.summary.counts[count]}</strong><span>개</span><ChevronRight size={17} aria-hidden="true"/></span>
   </button>)}</div>
   <p className={styles.scope}>서버 전체 요약입니다. 아래 필터 건수는 현재 응답의 선택 검사 범위입니다.</p>
   <p className={styles.version}>{freshnessUnverified ? "최신성 미확인" : statusLabels[data.freshness.overall]} · 현재 입력 v{data.currentInputVersion} · 결과 v{data.resultVersion ?? "없음"}</p>
   <p className={styles.caution}>차액은 확정된 미지급임금이 아닙니다.</p>
  </aside>
  {before}
  <div id={`${id}-comparison-table`} tabIndex={-1}><ResultComparisonTable groups={groups} resultVersion={data.resultVersion} onSelect={selectEvidence}/></div>
  {detailsVisible&&<section className={styles.explorer} aria-label={compare ? "검사 탐색" : "결과 탐색"}>
   <header className={styles.explorerHeading}><div><h2>{compare ? "어떤 자료에서 차이가 났을까요?" : "항목별로 자세히 볼까요?"}</h2><p>{compare ? "자료 대조와 명세서·입금 검사를 각각 확인해요." : "계산과 자료 대조 결과를 나누어 확인해요."}</p></div><span>{groups.length}가지 검사</span></header>
   <div role="tablist" aria-label="결과 카테고리" className={`${styles.tabs} ${compare ? styles.comparisonTabs : ""}`}>{groups.map((g, i) => { const Icon = groupIcons[g.id as keyof typeof groupIcons]; return <button key={g.id} id={`${id}-${g.id}`} role="tab" aria-label={g.title} aria-selected={group.id === g.id} aria-controls={`${id}-panel`} tabIndex={group.id === g.id ? 0 : -1} className={styles.tab} onClick={() => selectGroup(g.id)} onKeyDown={e => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? groups.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + groups.length) % groups.length;
    selectGroup(groups[next].id); document.getElementById(`${id}-${groups[next].id}`)?.focus();
   }}><Icon size={18} aria-hidden="true"/><span>{g.title}</span><span className={styles.tabCount} aria-hidden="true">{g.cards.length}</span></button>; })}</div>
   <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${group.id}`} tabIndex={-1} className={styles.panel}>
    <div role="group" aria-label="검사 상태 필터" className={styles.filters}>{Object.entries(filters).map(([key, label]) => <button key={key} aria-pressed={state.filter === key} className={styles.filter} onClick={() => filter(key)}>{label} <span>({group.cards.filter(c => key === "ALL" || c.status === key).length})</span></button>)}</div>
    <ResultCarousel count={filtered.length} index={index} title={group.title} onIndexChange={next => { setEvidenceStatus(undefined); setStates(s => ({ ...s, [group.id]: { ...state, selected: { ...state.selected, [state.filter]: filtered[next].id } } })); }}>
     {card && <ResultDetail key={`${group.id}-${card.id}`} caseId={data.caseId} card={card} groupId={group.id} onClose={closeDetail}/>}
    </ResultCarousel>
   </div>
  </section>}
  {evidenceStatus&&<section id={`${id}-evidence`} tabIndex={-1} aria-label="추가 근거 확인" className={styles.evidence}><h2>추가 근거 확인</h2><p role="status">{filters[evidenceStatus as keyof typeof filters]} 항목을 확인합니다. 해당 상태의 통합 항목이 없으면 서버 요약과 상세 제공 범위를 확인해 주세요.</p>{evidenceItems.map(item => <article key={item.id} className={styles.evidenceItem}><h3>{item.title} · {statusLabels[item.status]}</h3><ServerValue caseId={data.caseId} value={item}/></article>)}</section>}
  {after}
 </>;
}
