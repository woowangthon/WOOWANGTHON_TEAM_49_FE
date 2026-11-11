"use client";

import { useId, useState, type ReactNode } from "react";
import { ResultCarousel } from "@/components/ui/result-carousel";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import type { Results } from "./schemas";
import { displayScalar, fieldLabels, statusLabels } from "./view-models";
import { ServerValue } from "./result-screen";

type Card = { id: string; title: string; status?: string; data: Record<string, unknown>; unit?: string | null; period?: Record<string, unknown>; meta?: ReactNode };
type Group = { id: string; title: string; cards: Card[] };
const checks = { paymentTotal: "지급 합계", deductionTotal: "공제 합계", netPay: "실수령액" } as const;
const filters = { ALL: "전체", DIFFERENCE: "차이", INSUFFICIENT_INFORMATION: "정보 부족", REVIEW_REQUIRED: "검토 필요", MATCH: "일치" };
const valueKeys = ["amount", "contractValue", "attendanceValue", "payslipValue", "itemSum", "statedTotal", "calculated", "stated", "payslipNetPay", "linkedBankDepositTotal", "linkedCashPaymentTotal", "linkedPaymentTotal", "difference"];
const labels: Record<string, string> = { payslipNetPay: "명세서 실수령액", linkedBankDepositTotal: "연결 계좌 입금", linkedCashPaymentTotal: "연결 현금 지급", linkedPaymentTotal: "전체 연결 지급액" };
const statusTones: Record<string, string> = { MATCH: "bg-success-soft text-success-foreground", CALCULATED: "bg-success-soft text-success-foreground", DIFFERENCE: "bg-danger-soft text-danger-foreground", INSUFFICIENT_INFORMATION: "bg-warning-soft text-warning-foreground", REVIEW_REQUIRED: "bg-neutral-soft text-review-foreground" };
function text(v: unknown, fallback: string) { return typeof v === "string" ? v : fallback; }
export function resultGroups(d: Results, compare: boolean): Group[] {
 const meta = (key: "calculation" | "comparison" | "payslipValidation") => <ServerValue caseId={d.caseId} value={d.versions[key]}/>;
 return [
  ...(!compare ? [{ id: "calculation", title: "임금 계산 항목", cards: (d.calculation?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: v.label ?? v.type ?? `계산 항목 ${i + 1}`, status: v.status, data: v, unit: v.currency, meta: meta("calculation") })) }] : []),
  { id: "comparison", title: compare ? "계약·근태·명세서 대조" : "자료 대조", cards: (d.comparison?.items ?? []).map((v, i) => ({ id: `${v.type ?? "item"}-${i}`, title: text(v.title, v.type ?? `대조 항목 ${i + 1}`), status: v.status, data: v, unit: v.comparisonBasis?.unit, period: v.comparisonBasis ?? undefined, meta: meta("comparison") })) },
  { id: "validation", title: "명세서 내부 합계 검사", cards: d.payslipValidation ? (Object.keys(checks) as (keyof typeof checks)[]).map(key => ({ id: key, title: checks[key], status: d.payslipValidation![key].status, data: d.payslipValidation![key], unit: "KRW", meta: meta("payslipValidation") })) : [] },
  { id: "deposit", title: "입금 대조", cards: d.depositComparison ? [{ id: "deposit", title: "연결 지급액과 명세서 대조", status: typeof d.depositComparison.status === "string" ? d.depositComparison.status : undefined, data: d.depositComparison, unit: "KRW" }] : [] },
 ];
}
export function ResultExplorer({ data, compare, before, after }: { data: Results; compare: boolean; before?: ReactNode; after?: ReactNode }) {
 const groups = resultGroups(data, compare);
 const [active, setActive] = useState(groups[0].id);
 const [evidenceStatus, setEvidenceStatus] = useState<string>();
 const [states, setStates] = useState<Record<string, { filter: string; selected: Record<string, string> }>>({});
 const id = useId();
 const group = groups.find(g => g.id === active) ?? groups[0];
 const state = states[group.id] ?? { filter: "ALL", selected: {} };
 const filtered = group.cards.filter(c => state.filter === "ALL" || c.status === state.filter);
 const index = Math.max(0, filtered.findIndex(c => c.id === state.selected[state.filter]));
 const card = filtered[index];
 const filter = (next: string) => setStates(s => ({ ...s, [group.id]: { ...state, filter: next } }));
 const jump = (status: string) => {
  const target = groups.find(g => g.cards.some(c => c.status === status));
  if (target) { setActive(target.id); setStates(s => ({ ...s, [target.id]: { filter: status, selected: { ...s[target.id]?.selected, [status]: target.cards.find(c => c.status === status)!.id } } })); }
  else {
   setEvidenceStatus(status);
   requestAnimationFrame(() => {
    const evidence = document.getElementById(`${id}-evidence`) as HTMLDetailsElement | null;
    if (evidence) { evidence.open = true; evidence.querySelector("summary")?.focus(); evidence.scrollIntoView({ block: "center" }); }
   });
  }
  if (target) requestAnimationFrame(() => document.getElementById(`${id}-panel`)?.focus());
 };
 return <>
  <aside className="space-y-3 rounded-2xl bg-warning-soft p-5" aria-label="중요한 결과 안내">
   <h2 className="font-bold">차이와 보완이 필요한 항목</h2>
   <p>서버 전체 요약입니다. 아래 필터 건수는 현재 응답의 선택 검사 범위입니다.</p>
   <div className="flex flex-wrap gap-2">{([["DIFFERENCE", data.summary.counts.difference], ["INSUFFICIENT_INFORMATION", data.summary.counts.insufficientInformation], ["REVIEW_REQUIRED", data.summary.counts.reviewRequired]] as const).map(([status, count]) => <button key={status} className={secondaryButton} onClick={() => jump(status)}>{filters[status]} {count}개 · 확인</button>)}</div>
   <p>차액은 확정된 미지급임금이 아닙니다. {statusLabels[data.freshness.overall ?? ""] ?? "\ucd5c\uc2e0\uc131 \ubbf8\uc81c\uacf5"} · 현재 입력 v{data.currentInputVersion} · 결과 v{data.resultVersion ?? "없음"}</p>
  </aside>
  {before}
  <section className="min-w-0 space-y-5" aria-label={compare ? "검사 탐색" : "결과 탐색"}>
   <h2 className="text-xl font-bold">{compare ? "어떤 자료에서 차이가 났을까요?" : "항목별 결과 확인"}</h2>
   <div role="tablist" aria-label="결과 카테고리" className="flex flex-wrap gap-2 border-b border-line pb-3">{groups.map((g, i) => <button key={g.id} id={`${id}-${g.id}`} role="tab" aria-selected={group.id === g.id} aria-controls={`${id}-panel`} tabIndex={group.id === g.id ? 0 : -1} className={secondaryButton} onClick={() => setActive(g.id)} onKeyDown={e => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? groups.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + groups.length) % groups.length;
    setActive(groups[next].id); document.getElementById(`${id}-${groups[next].id}`)?.focus();
   }}>{g.title}</button>)}</div>
   <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${group.id}`} tabIndex={-1} className="space-y-4">
    <div role="group" aria-label="검사 상태 필터" className="flex flex-wrap gap-2">{Object.entries(filters).map(([key, label]) => <button key={key} aria-pressed={state.filter === key} className="min-h-11 rounded-full px-3 py-2 text-sm aria-pressed:bg-neutral-soft aria-pressed:font-bold aria-pressed:ring-2 aria-pressed:ring-primary" onClick={() => filter(key)}>{label} ({group.cards.filter(c => key === "ALL" || c.status === key).length})</button>)}</div>
    <ResultCarousel count={filtered.length} index={index} title={group.title} onIndexChange={next => setStates(s => ({ ...s, [group.id]: { ...state, selected: { ...state.selected, [state.filter]: filtered[next].id } } }))}>
     {card && <article key={`${group.id}-${card.id}`} className={`${cardStyle} space-y-4`}>
      <h3 className="text-xl font-bold">{card.title}</h3><p className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${statusTones[card.status ?? ""] ?? "bg-neutral-soft"}`}>{card.status ? statusLabels[card.status] ?? card.status : "상태 미제공"}</p>
      <p>산정기간: {displayScalar("periodStart" in card.data ? card.data.periodStart : card.period?.periodStart, "periodStart")} ~ {displayScalar("periodEnd" in card.data ? card.data.periodEnd : card.period?.periodEnd, "periodEnd")} · 단위: {card.unit ?? "미제공"}</p>
      <dl className="grid gap-4 sm:grid-cols-2">{valueKeys.filter(k => k in card.data).map(k => <div key={k}><dt className="text-sm text-muted">{fieldLabels[k] ?? labels[k] ?? k}</dt><dd className="text-2xl font-bold">{displayScalar(card.data[k], k in labels ? "amount" : k, card.unit)}</dd></div>)}</dl>
      {typeof card.data.reasonCode === "string" && <p>검토 사유: {card.data.reasonCode}</p>}
      {typeof card.data.nextAction === "string" && <p>{card.data.nextAction}</p>}
      {card.period?.semanticMatch === false && <p role="note">기간·단위·의미가 일치하지 않습니다. 비교 기준을 확인해 주세요.</p>}
      {card.status === "INSUFFICIENT_INFORMATION" && <p>미확인 값은 0이 아닙니다. 원문과 입력 조건을 보완해 주세요.</p>}
      {card.status === "REVIEW_REQUIRED" && <p>원문과 적용 조건을 검토해 주세요.</p>}
      <details><summary className="cursor-pointer font-bold">계산식·비교 기준·출처·버전 상세</summary><div className="mt-4 space-y-4"><ServerValue caseId={data.caseId} value={card.data}/>{card.meta}</div></details>
     </article>}
    </ResultCarousel>
   </div>
  </section>
  <details id={`${id}-evidence`} className={cardStyle}><summary>통합 항목의 추가 근거·원문 출처 ({data.items.length})</summary><p>서버 통합 항목 원본입니다. 위 검사와 중복되는 항목을 포함할 수 있습니다.</p>{evidenceStatus&&<p role="status">{filters[evidenceStatus as keyof typeof filters]} 항목을 펼쳤습니다. 해당 상태의 통합 항목이 없으면 서버 요약과 상세 제공 범위를 확인해 주세요.</p>}{data.items.map(item => <details key={`${item.id}-${evidenceStatus}`} open={item.status===evidenceStatus || undefined} className="py-3"><summary>{item.title} · {statusLabels[item.status]}</summary><ServerValue caseId={data.caseId} value={item}/></details>)}</details>
  {after}
 </>;
}
