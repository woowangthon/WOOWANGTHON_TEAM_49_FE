"use client";

import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ResultGroup } from "./result-explorer";
import { displayScalar } from "./view-models";
import styles from "./result-comparison-table.module.css";

const filters = { ALL: "전체", MATCH: "일치", DIFFERENCE: "차이", INSUFFICIENT_INFORMATION: "정보 부족", REVIEW_REQUIRED: "검토 필요" } as const;
const statuses: Record<string, { label: string; symbol: string }> = {
  MATCH: { label: "자료상 일치", symbol: "✓" },
  DIFFERENCE: { label: "차이 발견", symbol: "△" },
  INSUFFICIENT_INFORMATION: { label: "정보 부족", symbol: "?" },
  REVIEW_REQUIRED: { label: "검토 필요", symbol: "!" },
};
const knownTitles: Record<string, string> = {
  HOURLY_WAGE: "시급 대조", WORK_HOURS: "근로시간 대조", WORKED_HOURS: "실근로시간 대조",
  WORKED_MINUTES: "실근로시간 대조", BASE_PAY: "기본급 대조",
};
type Value = { label: string; value: unknown };
type Row = { groupId: string; cardId: string; groupTitle: string; title: string; status?: string; reference: Value[]; compared: Value[]; difference: unknown; unit?: string | null; mismatched: boolean };
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function rowsFrom(groups: ResultGroup[]): Row[] {
  return groups.filter(group => group.id !== "calculation").flatMap(group => group.cards.map(card => {
    const data = card.data;
    const basis = record(data.comparisonBasis);
    let reference: Value[], compared: Value[];
    if (group.id === "comparison") {
      reference = (["contractValue", "attendanceValue"] as const).filter(key => key in data).map(key => ({ label: key === "contractValue" ? "계약" : "근태", value: data[key] }));
      if (!reference.length) reference = [{ label: "계약·근태", value: undefined }];
      compared = [{ label: "명세서", value: data.payslipValue }];
    } else if (group.id === "validation") {
      reference = [{ label: "itemSum" in data ? "세부 합계" : "계산값", value: "itemSum" in data ? data.itemSum : data.calculated }];
      compared = [{ label: "명세서", value: "statedTotal" in data ? data.statedTotal : data.stated }];
    } else if (group.id === "deposit") {
      reference = [{ label: "명세서 실수령액", value: data.payslipNetPay }];
      compared = [{ label: "연결 지급액", value: data.linkedPaymentTotal }];
    } else {
      reference = [{ label: "비교 기준", value: undefined }];
      compared = [{ label: "대조 값", value: undefined }];
    }
    return { groupId: group.id, cardId: card.id, groupTitle: group.title, title: typeof data.type === "string" && card.title === data.type ? knownTitles[data.type] ?? card.title : card.title,
      status: card.status, reference, compared, difference: data.difference,
      unit: card.unit ?? (typeof basis?.unit === "string" ? basis.unit : group.id === "validation" || group.id === "deposit" ? "KRW" : undefined),
      mismatched: basis?.semanticMatch === false || card.period?.semanticMatch === false };
  }));
}
function Values({ values, unit }: { values: Value[]; unit?: string | null }) {
  return <div className={styles.valueList}>{values.map((value, index) => <div key={`${value.label}-${index}`}><small>{value.label}</small><span>{displayScalar(value.value, "value", unit)}</span></div>)}</div>;
}
export function ResultComparisonTable({ groups, onSelect, resultVersion }: { groups: ResultGroup[]; onSelect: (groupId: string, cardId: string) => void; resultVersion: number | null }) {
  const [filter, setFilter] = useState<keyof typeof filters>("ALL");
  const id = useId();
  const rows = rowsFrom(groups);
  const visible = rows.filter(row => filter === "ALL" || row.status === filter);
  return <section className={styles.section} aria-labelledby={`${id}-heading`}>
    <header className={styles.heading}><div><p>자료를 나란히 확인해요</p><h2 id={`${id}-heading`}>항목별 대조표</h2></div><span className={styles.version}>결과 버전 {resultVersion ?? "없음"}</span></header>
    <div role="group" aria-label="대조표 상태 필터" className={styles.filters}>{(Object.keys(filters) as (keyof typeof filters)[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{filters[key]} <span>({rows.filter(row => key === "ALL" || row.status === key).length})</span></button>)}</div>
    <p className={styles.scope}>현재 대조표의 {rows.length}개 항목 기준이에요. 임금 계산과 원문 확인 항목은 별도로 살펴보세요.</p>
    <div className={styles.tableFrame}><table className={styles.table}>
      <caption className={styles.visuallyHidden}>현재 응답에서 제공한 자료 대조·명세서 합계·연결 지급액 비교 결과</caption>
      <thead><tr><th scope="col">확인 항목</th><th scope="col">비교 기준</th><th scope="col">대조 값</th><th scope="col">결과</th><th scope="col">차이</th><th scope="col">근거</th></tr></thead>
      <tbody>{visible.length ? visible.map(row => <tr key={`${row.groupId}-${row.cardId}`}>
        <th scope="row" className={styles.item}><small>{row.groupTitle}</small><span>{row.title}</span></th>
        <td><span className={styles.mobileLabel} aria-hidden="true">비교 기준</span><Values values={row.reference} unit={row.unit}/></td>
        <td><span className={styles.mobileLabel} aria-hidden="true">대조 값</span><Values values={row.compared} unit={row.unit}/></td>
        <td className={styles.statusCell}><span className={styles.mobileLabel} aria-hidden="true">결과</span><span className={styles.badge} data-status={row.status}><span aria-hidden="true">{statuses[row.status ?? ""]?.symbol ?? "·"}</span>{statuses[row.status ?? ""]?.label ?? "상태 미제공"}</span></td>
        <td className={styles.difference}><span className={styles.mobileLabel} aria-hidden="true">차이</span><span data-difference={row.status === "DIFFERENCE" && typeof row.difference === "number" && !row.mismatched}>{row.mismatched ? "비교 기준 확인 필요" : displayScalar(row.difference, "difference", row.unit)}</span></td>
        <td className={styles.actionCell}><button type="button" className={styles.evidenceButton} aria-label={`${row.title} 근거 보기`} onClick={() => onSelect(row.groupId, row.cardId)}>근거 보기<ArrowUpRight size={14} aria-hidden="true"/></button></td>
      </tr>) : <tr><td colSpan={6} className={styles.empty}>해당 조건의 대조 항목이 없어요. 다른 상태를 선택해 주세요.</td></tr>}</tbody>
    </table></div>
    <p className={styles.disclaimer}>차이는 현재 비교 범위의 값이며, 확정된 미지급임금이 아니에요. 공제의 적법성이나 세금·보험료의 적정성을 판단하지 않아요.</p>
  </section>;
}
