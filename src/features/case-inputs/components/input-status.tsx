"use client";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive, recomputeSchema } from "@/features/documents/api";
import type { z } from "zod";
import { useReadiness } from "../queries";
import { checkTypes, type Readiness } from "../schemas";

export const checkLabels = { WAGE_CALCULATION: "임금 계산", CONTRACT_ATTENDANCE_COMPARISON: "계약·근태 대조", PAYSLIP_VALIDATION: "명세서 합계 검사", DEPOSIT_COMPARISON: "입금 대조" };
const resultLabels: Record<string, string> = { calculation: "임금 계산", comparison: "계약·근태 대조", payslipValidation: "명세서 합계 검사", depositComparison: "입금 대조" };
const missingLabels: Record<string, string> = { contract_wage: "계약상 임금", regular_minutes: "소정근로시간", contract: "계약 자료", attendance: "근태 자료", comparison_basis_confirmation: "비교 기준 확인", confirmed_payslip_totals_and_items: "명세서 총액과 개별 금액", payslip_net_pay: "명세서 실수령액", allocated_payment: "이 사례에 배분한 입금", verified_statutory_rules: "검증된 법정수당 규칙", overtime_hours: "연장근로시간" };
export function ReadinessView({ data, caseId, compact = false }: { data: Readiness; caseId: number; compact?: boolean }) {
  return <section aria-label="기능별 실행 가능성" className="min-w-0 space-y-4"><h2 className="text-title font-bold">기능별 실행 가능성</h2><p>서버 입력 버전 {data.inputVersion}. 실행 가능은 결과의 일치·검사 완료를 뜻하지 않습니다. 작업 단계와 별개입니다.</p>
    <div className={`grid min-w-0 gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>{checkTypes.map(type => {
      const check = data.checks.find(c => c.checkType === type);
      return <article key={type} aria-label={checkLabels[type]} className={`${cardStyle} min-w-0 break-words space-y-3`}><h3 className="font-bold">{checkLabels[type]}</h3>{check ? <><p>{check.available ? "실행 가능" : "실행 보류"} · {{ FULL: "전체 입력 준비 (FULL)", PARTIAL: "일부 항목 준비 (PARTIAL)", NONE: "입력 부족 (NONE)" }[check.mode]}</p><p>필요 자료·조건: {check.missingInputs.map(key => missingLabels[key] ?? key).join(", ") || "서버가 보고한 부족 항목 없음"}</p>{check.reasonCode && <p>서버 사유: {check.reasonCode}</p>}</> : <p>서버 준비 상태 미제공</p>}<Link href={`/cases/${caseId}/manual-records`} className={secondaryButton}>수기 자료 확인</Link></article>;
    })}</div><p className="text-body text-muted">통합 결과와 대조·합계 검사 화면에서 서버 결과를 확인할 수 있습니다. 임금 계산의 보류가 다른 독립 검사나 자료 열람을 막지 않습니다.</p></section>;
}
export function RecomputeView({ data }: { data: z.infer<typeof recomputeSchema> }) {
  const active = recomputeActive(data);
  const job = data.activeJob ?? data.latestJob;
  return <section aria-label="자동 갱신 상태" className={`${cardStyle} min-w-0 break-words space-y-3`}><h2 className="text-title font-bold">자동 갱신 상태</h2><p role="status">{active ? "서버 자동 갱신 중" : "현재 진행 중인 작업 없음"}{job ? ` · ${job.status}` : ""}</p>{data.currentInputVersion !== undefined && <p>현재 입력 버전: {data.currentInputVersion}</p>}
    {job?.errorCode && <p role="alert">갱신 오류: {job.errorCode}. 이전 결과를 보존합니다. 입력을 확인하고 상태를 다시 조회해 주세요.</p>}
    {job?.status === "FAILED" && <p>자동 갱신에 실패했습니다. 상태 재조회는 작업을 새로 생성하지 않습니다. 결과 화면의 수동 재실행 버튼으로 다시 요청할 수 있습니다.</p>}
    {job?.status === "SUPERSEDED" && <p>이 작업은 새 입력으로 대체되었습니다. 최신 상태를 확인해 주세요.</p>}
    {data.results ? <ul className="space-y-2">{Object.entries(data.results).map(([key, ref]) => <li key={key}>{resultLabels[key] ?? key}: {ref ? `${ref.freshness} · 결과 버전 ${ref.version ?? "미제공"} · 입력 버전 ${ref.inputVersion ?? "미제공"}` : "결과 참조 없음"}</li>)}</ul> : <p>서버가 결과 최신성을 제공하지 않았습니다.</p>}
    <p className="text-muted">최신성은 서버 응답을 그대로 표시합니다. PARTIAL·SUCCEEDED 등 작업 종료가 모든 계산의 완료나 일치를 뜻하지 않습니다.</p></section>;
}
export function InputStatus({ caseId, compact = false }: { caseId: number; compact?: boolean }) {
  const ready = useReadiness(caseId); const recompute = useRecomputeStatus(caseId);
  return <div className="min-w-0 space-y-6">{recompute.awaitingScheduledJob && <p role="status">저장 응답에서 자동 갱신 접수를 확인했으나 해당 작업 상태는 아직 조회되지 않았습니다. 잠시 확인한 뒤에도 같으면 상태를 다시 조회해 주세요.</p>}{recompute.isPending ? <QueryFeedback pending /> : recompute.isError ? <QueryFeedback error={recompute.error} retry={() => { void recompute.refetch(); }} /> : <><RecomputeView data={recompute.data} /><button className={secondaryButton} disabled={recompute.isFetching} onClick={() => { void recompute.refetch(); }}>갱신 상태 다시 조회</button></>}
    {ready.isPending ? <QueryFeedback pending /> : ready.isError ? <QueryFeedback error={ready.error} retry={() => { void ready.refetch(); }} /> : <ReadinessView data={ready.data} caseId={caseId} compact={compact} />}</div>;
}
