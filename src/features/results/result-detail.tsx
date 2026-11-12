"use client";

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
const labels: Record<string, string> = { MATCH: "자료상 일치", DIFFERENCE: "차이 발견", INSUFFICIENT_INFORMATION: "정보 부족", REVIEW_REQUIRED: "검토 필요" };
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function valuesFor(card: ResultCard, groupId: string): Value[][] {
  const d = card.data;
  const value = (key: string, label: string): Value => ({ key, label, value: d[key] });
  if (groupId === "comparison") {
    const reference = [value("contractValue", "계약서 값"), value("attendanceValue", "근태 기록 값")].filter(v => v.key in d);
    return [reference.length ? reference : [value("contractValue", "계약·근태 기준값")], [value("payslipValue", "급여명세서 값")]];
  }
  if (groupId === "validation") return [["itemSum" in d ? value("itemSum", "세부 항목 합계") : value("calculated", "서버 계산값")], ["statedTotal" in d ? value("statedTotal", "명세서 기재 합계") : value("stated", "명세서 기재값")]];
  if (groupId === "deposit") return [[value("payslipNetPay", "기재 실수령액")], [value("linkedPaymentTotal", "연결 지급 합계")]];
  return [[value("amount", "계산된 금액")]];
}

export function ResultDetail({ caseId, card, groupId, onClose }: { caseId: number; card: ResultCard; groupId: string; onClose: () => void }) {
  const columns = valuesFor(card, groupId);
  const basis = record(card.data.comparisonBasis) ?? card.period;
  const mismatched = basis?.semanticMatch === false;
  const sources = Array.isArray(card.data.sources) ? card.data.sources : [];
  const displayed = new Set([...columns.flat().map(v => v.key), ...metadataKeys, "difference", "formula", "comparisonBasis", "sources", "status", "type", "label", "title", "currency", "periodStart", "periodEnd", "nextAction"]);
  const remaining = Object.fromEntries(Object.entries(card.data).filter(([key]) => !displayed.has(key)));
  const tone = card.status;
  return <article data-result-detail tabIndex={-1} aria-label={`${card.title} 상세`} className={styles.detail}>
    <header className={styles.heading}><h3>{card.title}</h3><span className={styles.status} data-status={tone}><span aria-hidden="true">•</span>{card.status ? labels[tone ?? ""] ?? statusLabels[card.status] ?? card.status : "상태 미제공"}</span></header>
    <p className={styles.period}>산정기간: {displayScalar("periodStart" in card.data ? card.data.periodStart : basis?.periodStart, "periodStart")} ~ {displayScalar("periodEnd" in card.data ? card.data.periodEnd : basis?.periodEnd, "periodEnd")}</p>
    <div className={styles.comparison} data-single={columns.length === 1} aria-label="비교 금액" data-status={tone}>
      {columns.map((column, index) => <div key={index} className={styles.valueColumn}>
        {index > 0 && <ArrowDownUp className={styles.compareIcon} size={20} aria-hidden="true"/>}
        <dl>{column.map(value => <div key={value.key}><dt>{value.label}</dt><dd data-has-value={typeof value.value === "number"}>{displayScalar(value.value, value.key === "payslipNetPay" || value.key === "linkedPaymentTotal" ? "amount" : value.key, card.unit)}</dd></div>)}</dl>
      </div>)}
    </div>
    {"difference" in card.data && <p className={styles.difference} data-status={tone}>{mismatched ? "비교 기준 확인 필요" : <><strong>{displayScalar(card.data.difference, "difference", card.unit)}</strong><span>차이</span></>}</p>}
    <p className={styles.guidance}>{mismatched ? "기간·단위·의미가 일치하지 않습니다. 비교 기준을 확인해 주세요." : card.status === "DIFFERENCE" ? "자료에 기재된 값이 달라요. 원문과 추가 자료를 확인해 주세요." : card.status === "MATCH" ? "현재 비교한 자료의 값이 일치해요." : card.status === "INSUFFICIENT_INFORMATION" ? "미확인 값은 0이 아닙니다. 원문과 입력 조건을 보완해 주세요." : card.status === "REVIEW_REQUIRED" ? "원문과 적용 조건을 검토해 주세요." : "계산에 사용한 값과 적용 조건을 함께 확인해 주세요."}</p>
    {groupId !== "calculation" && <p className={styles.disclaimer}>차이는 현재 비교 범위의 값이며, 확정된 미지급임금이 아니에요.</p>}
    <section className={styles.section} aria-label="원문 근거"><h4 className={styles.sourceHeading}><span>원문 근거</span>{!sources.length&&<Link href={`/cases/${caseId}/review`}>문서 검토로 이동<ArrowRight size={14} aria-hidden="true"/></Link>}</h4>
      {sources.length ? <div className={styles.sources}>{sources.map((source, index) => <SourceEvidence key={index} caseId={caseId} value={record(source) ?? {}} compact/>)}</div> : <p className={styles.empty}>이 결과에 연결된 원문 근거가 제공되지 않았어요.</p>}
    </section>
    {Object.keys(remaining).length > 0 && <section className={`${styles.section} ${styles.additional}`} aria-label="추가 정보"><h4>추가 정보</h4><ServerValue caseId={caseId} value={remaining} unit={card.unit}/></section>}
    {typeof card.data.nextAction === "string" && <p className={styles.nextAction}>{card.data.nextAction}</p>}
    <footer className={styles.actions}><Link href={`/cases/${caseId}/questions`}>확인 질문 보기<ArrowRight size={16} aria-hidden="true"/></Link><button type="button" aria-label="확인 · 상세 닫기" onClick={onClose}>확인</button></footer>
  </article>;
}
