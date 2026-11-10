"use client";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { PageHeading } from "@/components/ui/page-heading";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { useConditions, useInputAction } from "../queries";
import { conditionAnswerSchema, conditionIds, type Conditions } from "../schemas";
import { InputStatus } from "./input-status";

const labels = { REQUIRED: "추가 응답 필요", ANSWERED: "응답 완료", UNKNOWN: "모름·확인 예정", NOT_APPLICABLE: "해당 없음" };
const optionLabels: Record<string, string> = { LESS_THAN_5: "5인 미만", AT_LEAST_5: "5인 이상", UNKNOWN: "모름·확인 예정", true: "예", false: "아니요" };
const checkLabels: Record<string, string> = { WAGE_CALCULATION: "임금 계산", PAYSLIP_VALIDATION: "명세서 합계 검사", DEPOSIT_COMPARISON: "입금 대조", CONTRACT_ATTENDANCE_COMPARISON: "계약·근태 대조" };
const reasons: Record<string, string> = { workplace_size: "사업장 규모에 따른 수당 적용 여부를 확인하는 데 필요합니다.", regular_minutes: "이 기간의 약정 근로시간과 실제 기록을 비교하는 데 필요합니다.", base_scope_confirmed: "임금의 적용 범위를 확인하는 데 필요합니다." };
const valuesOf = (data: Conditions) => Object.fromEntries(data.conditions.map(c => [c.conditionId, c.value === null ? "" : String(c.value)]));
export function ConditionsScreen({ caseId }: { caseId: number }) {
  const owner = useCase(caseId); const removal = useCaseRemoval(caseId); const query = useConditions(caseId);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 사례입니다.</p>;
  if (owner.isPending || query.isPending) return <QueryFeedback pending />;
  if (owner.isError || (query.isError && !query.data)) return <QueryFeedback error={owner.error ?? query.error} retry={() => { void owner.refetch(); void query.refetch(); }} />;
  return <div className="min-w-0 space-y-6"><PageHeading title="계산 조건 확인" description={`${owner.data.workplace.name} · 모르는 값은 모름으로 남겨 주세요.`} /><nav className="flex flex-wrap gap-3" aria-label="계산 조건 탐색"><Link className={secondaryButton} href={`/cases/${caseId}/manual-records`}>수기 자료 입력·관리</Link><Link className={secondaryButton} href={`/cases/${caseId}/upload`}>문서 자료 등록</Link><Link className={secondaryButton} href={`/cases/${caseId}`}>사례 상세</Link><a className={secondaryButton} href="#readiness">실행 가능성 보기</a></nav>
    <div className="grid min-w-0 items-start gap-6"><ConditionsForm caseId={caseId} initial={query.data!} reload={async () => { const r = await query.refetch(); if (r.isError || !r.data) throw r.error; return r.data; }} /><div id="readiness" className="min-w-0 scroll-mt-6"><InputStatus caseId={caseId} compact /></div></div>
  </div>;
}
export function ConditionsForm({ caseId, initial, reload }: { caseId: number; initial: Conditions; reload: () => Promise<Conditions> }) {
  const [base, setBase] = useState(initial); const [conflict, setConflict] = useState(false); const [notice, setNotice] = useState("");
  const id = useId(); const summary = useRef<HTMLParagraphElement>(null); const lock = useRef(false); const mutation = useInputAction(caseId);
  const schema = z.object({ values: z.record(z.string(), z.string()) }).superRefine(({ values }, ctx) => {
    for (const c of base.conditions) {
      const text = values[c.conditionId] ?? "";
      if (text === String(c.value ?? "")) continue;
      const parsed = conditionAnswerSchema.safeParse({ conditionId: c.conditionId, value: c.type === "NUMBER" && text !== "UNKNOWN" && text.trim() !== "" ? Number(text) : c.type === "BOOLEAN" && text !== "UNKNOWN" ? (text === "true" ? true : text === "false" ? false : text) : text });
      if (!parsed.success || text.trim() === "" || (c.type === "NUMBER" && text !== "UNKNOWN" && !/^\d+$/.test(text.trim()))) ctx.addIssue({ code: "custom", path: ["values", c.conditionId], message: "허용된 응답을 입력하거나 모름을 선택하세요. 분은 0~1000000 정수입니다." });
    }
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { values: valuesOf(base) } });
  const { register, handleSubmit, setError, setFocus, reset, formState: { errors, isSubmitting, isDirty } } = form;
  useLayoutEffect(() => { if (isSubmitting) return; const field = Object.keys(errors.values ?? {})[0]; if (field) setFocus(`values.${field}`); else if (errors.root?.server) summary.current?.focus(); }, [errors, isSubmitting, setFocus]);
  const refresh = async () => { const latest = await reload(); setBase(latest); reset({ values: valuesOf(latest) }); setConflict(false); setNotice("최신 질문과 답변을 불러왔습니다."); };
  return <form noValidate aria-label="계산 조건 폼" className="min-w-0 space-y-5" onSubmit={event => { void handleSubmit(async ({ values }) => {
    if (lock.current || conflict) return; lock.current = true; setNotice("");
    let accepted = false;
    const answers = base.conditions.filter(c => values[c.conditionId] !== String(c.value ?? "")).map(c => conditionAnswerSchema.parse({ conditionId: c.conditionId, value: c.type === "NUMBER" && values[c.conditionId] !== "UNKNOWN" ? Number(values[c.conditionId]) : c.type === "BOOLEAN" && values[c.conditionId] !== "UNKNOWN" ? values[c.conditionId] === "true" : values[c.conditionId] }));
    try {
      if (!answers.length) { setNotice("변경된 답변이 없습니다."); return; }
      await mutation.mutateAsync({ type: "conditions", body: { answers, expectedInputVersion: base.inputVersion } });
      accepted = true;
      await refresh(); setNotice("변경된 조건을 저장했습니다. 서버가 관련 검사 상태를 자동 갱신합니다.");
    } catch (e) {
      if (accepted) { setConflict(true); setError("root.server", { message: "조건은 저장했지만 최신 질문 조회에 실패했습니다. 다시 저장하지 말고 최신 질문·답변을 불러와 주세요." }); return; }
      if (e instanceof ApiError && e.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true);
      if (e instanceof ApiError && e.status === 422) for (const issue of e.fieldErrors) {
        const index = Number(issue.field.match(/answers\.(\d+)/)?.[1]);
        const key = Number.isInteger(index) ? answers[index]?.conditionId : base.conditions.find(c => issue.field.includes(c.conditionId))?.conditionId;
        if (key) setError(`values.${key}`, { message: issue.reason });
      }
      setError("root.server", { message: businessErrorMessage(e) });
    } finally { lock.current = false; }
  })(event); }}>
    <header className="space-y-2"><h2 className="text-title font-bold">계산에 필요한 질문</h2><p>확인이 필요한 항목 {base.conditions.filter(c => c.status === "REQUIRED" || c.status === "UNKNOWN").length}개 · 전체 {base.conditions.length}개</p><p className="text-muted">아는 항목부터 답변하고 저장하세요. 미응답은 아직 답하지 않은 상태이며, 모름은 확인이 필요한 답변입니다. 해당 없음은 서버가 판단한 적용 제외 상태입니다. 실제 0과 아니요도 각각 유효한 답변입니다.</p></header>
    {base.conditions.length > 0 && <details className={`${cardStyle} min-w-0`}><summary className="min-h-11 cursor-pointer font-bold">조건 질문 바로가기 ({base.conditions.length}개)</summary><nav aria-label="조건 질문 바로가기"><ol className="space-y-2">{base.conditions.map(c => <li key={c.conditionId}><a className="inline-flex min-h-11 items-center break-words underline" href={`#${id}-${c.conditionId}`}>{c.question}</a></li>)}</ol></nav></details>}
    {!base.conditions.length && <p className={cardStyle}>서버가 요청한 조건 질문이 없습니다.</p>}
    {base.conditions.map(c => {
      const known = (conditionIds as readonly string[]).includes(c.conditionId);
      const disabled = isSubmitting || conflict || c.status === "NOT_APPLICABLE" || !known || c.type === "TEXT";
      const props = { id: `${id}-${c.conditionId}`, label: c.question, disabled, error: errors.values?.[c.conditionId]?.message, ...register(`values.${c.conditionId}`) };
      return <section key={c.conditionId} aria-label={`${c.question} 조건`} className={`${cardStyle} min-w-0 break-words space-y-3`}>
        <p className="inline-flex rounded-full bg-soft px-3 py-1 text-caption font-bold">{labels[c.status]}</p><p className="text-muted">{reasons[c.conditionId] ?? "아래 검사의 적용 조건을 확인하는 데 필요한 질문입니다."}</p>
        {c.type === "SELECT" || c.type === "BOOLEAN" ? <SelectField {...props}><option value="">미응답·선택 필요</option>{(c.type === "BOOLEAN" ? ["true", "false", "UNKNOWN"] : c.options ?? []).map(o => <option key={o} value={o}>{optionLabels[o] ?? o}</option>)}</SelectField> : <><TextField {...props} inputMode={c.type === "NUMBER" ? "numeric" : undefined} /><button className={secondaryButton} type="button" disabled={disabled} onClick={() => form.setValue(`values.${c.conditionId}`, "UNKNOWN", { shouldDirty: true, shouldValidate: true })}>모름으로 응답</button></>}
        <p>필요한 검사: {c.requiredFor.map(key => checkLabels[key] ?? "기타 검사 (상세 참고)").join(", ") || "서버 미지정"}</p><details className="border-t border-border pt-3"><summary className="min-h-11 cursor-pointer font-bold">조건 출처·기술 상세</summary><p>{labels[c.status]} · {c.type} · {c.conditionId}</p><p>검사 식별자: {c.requiredFor.join(", ") || "미지정"}</p><p>출처: {c.source ? `문서 #${c.source.documentId} · ${c.source.page ?? "미제공"}페이지 · ${c.source.text ?? "근거 문구 미제공"}` : "문서 출처 미제공"}</p></details>
        {(!known || c.type === "TEXT") && <p>현재 P0의 허용 조건 ID·응답 타입에 포함되지 않아 저장하지 않습니다. 서버 계약 확인이 필요합니다.</p>}
      </section>;
    })}
    {conflict && <p role="alert">버전 충돌로 저장을 중단했습니다. 초안은 보존했습니다. 최신 질문을 불러온 뒤 변경 내용을 다시 검토해 주세요.</p>}
    {errors.root?.server && <p role="alert" ref={summary} tabIndex={-1}>{errors.root.server.message}</p>}{notice && <p role="status">{notice}</p>}
    <div className="flex flex-wrap gap-3"><button className={primaryButton} disabled={isSubmitting || conflict || !isDirty} type="submit">{isSubmitting ? "조건 저장 중…" : "변경된 조건 저장"}</button><button className={secondaryButton} type="button" disabled={isSubmitting} onClick={() => { if (!isDirty || window.confirm("편집 초안을 버리고 최신 질문과 답변을 불러올까요?")) void refresh().catch(e => setError("root.server", { message: businessErrorMessage(e) })); }}>최신 질문·답변 다시 불러오기</button></div>
    <Link className={secondaryButton} href={`/cases/${caseId}/result`}>결과 확인</Link><details className="border-t border-border pt-3"><summary className="min-h-11 cursor-pointer font-bold">저장 방식·입력 버전</summary><p>현재 편집 기준 입력 버전 {base.inputVersion}. 변경한 답변만 부분 병합합니다. 저장하면 서버가 관련 검사를 자동 갱신합니다.</p></details>
  </form>;
}
