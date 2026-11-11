"use client";
import { StepFormNavigation } from "@/components/ui/step-form-navigation";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { ApiError } from "@/lib/api/error";
import { manualDefaults, manualFields, manualFormSchema, toManualInput, typeLabels } from "../manual-fields";
import { useInputAction } from "../queries";
import type { ManualRecord, ManualSaved, RecordType } from "../schemas";

const inputSteps: Record<RecordType, { label: string; keys: string[] }[]> = {
  CONTRACT: [{ label: "임금 정보 입력", keys: ["hourlyWage", "monthlyBasePay"] }],
  ATTENDANCE: [{ label: "근무일·출퇴근", keys: ["workDate", "clockIn", "clockOut"] }, { label: "휴게시간", keys: ["breakMinutes"] }],
  PAYSLIP: [{ label: "총액 입력", keys: ["grossPay", "totalDeductions", "netPay"] }, { label: "지급·공제 상세", keys: ["paymentItems", "deductionItems"] }, { label: "근로·임금 조건", keys: ["hourlyWage", "basePay", "workedMinutes"] }],
  DEPOSIT: [{ label: "지급 수단·일자·금액", keys: ["paymentMethod", "transactionDate", "amount"] }, { label: "송금자·메모", keys: ["sender", "memo"] }],
};
export function ManualForm({ caseId, type, periodStart, periodEnd, initial, onSaved }: { caseId: number; type: RecordType; periodStart: string; periodEnd: string; initial?: ManualRecord; onSaved: (receipt: ManualSaved) => void }) {
  const id = useId(); const mutation = useInputAction(caseId); const locked = useRef(false); const summary = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);
  const steps = inputSteps[type];
  const [failure, setFailure] = useState("");
  const form = useForm({ resolver: zodResolver(manualFormSchema(type, periodStart, periodEnd)), defaultValues: manualDefaults(type, initial?.data) });
  const { register, handleSubmit, setError, setFocus, formState: { errors, isSubmitting, isDirty } } = form;
  useLayoutEffect(() => { if (isSubmitting) return; const field = Object.keys(errors.values ?? {})[0]; if (field) setFocus(`values.${field}`); else if (failure) summary.current?.focus(); }, [errors, failure, isSubmitting, setFocus, step]);
  return <form aria-label={`${typeLabels[type]} 수기 입력`} className={`${cardStyle} min-w-0 space-y-5`} noValidate onSubmit={event => { if (step !== steps.length) { event.preventDefault(); setStep(step + 1); return; } void handleSubmit(async ({ values }) => {
    if (locked.current) return; locked.current = true; setFailure("");
    try {
      const body = toManualInput(type, values, initial?.data);
      const result = await mutation.mutateAsync(initial ? { type: "update", recordId: initial.recordId, body } : { type: "create", body });
      if (result && "recordId" in result) onSaved(result as ManualSaved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) for (const e of error.fieldErrors) {
        const key = e.field.split(".").at(-1)!;
        if (manualFields[type].some(f => f.key === key)) { setError(`values.${key}`, { message: e.reason }); setStep(steps.findIndex(s => s.keys.includes(key))); }
      }
      setFailure(businessErrorMessage(error));
    } finally { locked.current = false; }
  }, invalid => { const field = Object.keys(invalid.values ?? {})[0]; if (field) setStep(steps.findIndex(s => s.keys.includes(field))); })(event); }}>
    <h2 className="text-title font-bold">{typeLabels[type]} {initial ? "수정" : "수기 입력"}</h2><p>원본 문서 없이 직접 알려주신 기록입니다. 선택 항목의 빈칸은 미확인으로 남깁니다. 실제 0만 0으로 입력하세요.</p>
    {type === "ATTENDANCE" && <p>근무일 {periodStart} ~ {periodEnd}. 출퇴근 입력은 한국시간 UTC+09:00으로 전송합니다.</p>}
    {type === "PAYSLIP" && <p>개별 지급·공제 목록에는 소계·합계를 제외하고 빠짐없이 확인한 금액만 입력하세요. 불완전한 목록은 빈칸으로 남깁니다.</p>}
    {type === "DEPOSIT" && <p>수령 사실은 사용자 신고(USER_REPORTED)입니다. 서버가 거래와 이 사례의 전액 배분을 생성하며, 일반 수기 목록에 중복 저장하지 않습니다.</p>}
    <p className="text-muted">{isDirty ? "미저장 변경사항이 있습니다." : "입력 후 마지막 확인 단계에서 저장하세요."}</p>
    <StepFormNavigation steps={[...steps.map(s => s.label), "확인"]} current={step} onChange={setStep} busy={isSubmitting} errors={steps.map(s => s.keys.some(key => !!errors.values?.[key]))} />
    {step === steps.length && <section aria-label="입력 내용 확인" className="space-y-3"><h3 className="font-bold">저장 전 확인</h3><dl className="grid gap-3 sm:grid-cols-2">{manualFields[type].map(f => <div key={f.key}><dt className="text-muted">{f.label}</dt><dd className="break-words">{form.getValues(`values.${f.key}`) || "미확인"}</dd></div>)}</dl></section>}
    {[true, false].map(required => { const fields = manualFields[type].filter(f => !!f.required === required); return fields.length > 0 && <fieldset hidden={step === steps.length || !fields.some(f => steps[step]?.keys.includes(f.key))} key={String(required)} className="min-w-0 space-y-5 border-t border-border pt-5"><legend className="px-2 font-bold">{required ? "필수 입력" : "선택 입력 · 아는 항목만 입력하세요"}</legend><div className="grid min-w-0 gap-5 min-[951px]:grid-cols-2">{fields.map(f => {
      const props = { id: `${id}-${f.key}`, label: `${f.label} · ${f.required ? "필수" : "선택·미확인 가능"}`, disabled: isSubmitting, required: f.required, error: errors.values?.[f.key]?.message, ...register(`values.${f.key}`) };
      return <div key={f.key} hidden={step === steps.length || !steps[step]?.keys.includes(f.key)}>{f.kind === "method" ? <SelectField key={f.key} {...props}><option value="">선택해 주세요</option><option value="BANK_TRANSFER">계좌이체</option><option value="CASH">현금</option></SelectField> : <TextField key={f.key} {...props} type={f.kind === "date" ? "date" : f.kind === "datetime" ? "datetime-local" : "text"} step={f.kind === "datetime" ? "1" : undefined} inputMode={f.kind === "money" || f.kind === "minutes" ? "numeric" : undefined} placeholder={f.kind === "list" ? "예: 2000000, 300000" : undefined} />}</div>;
    })}</div></fieldset>; })}
    {failure && <p tabIndex={-1} role="alert" ref={summary}>{failure}</p>}{step === steps.length && <button className={primaryButton} disabled={isSubmitting} type="submit">{isSubmitting ? "저장 중…" : initial ? "수기 기록 수정 저장" : "수기 자료 저장"}</button>}
    <button type="button" className={secondaryButton} disabled={isSubmitting} onClick={() => { form.reset(); setFailure(""); }}>입력 취소·되돌리기</button>
    {initial && <details><summary className="min-h-11 cursor-pointer font-bold">수정 저장 방식</summary><p>같은 유형의 자료 전체를 교체합니다. 바꾸지 않은 필드는 보존하고, 기존 선택 값을 지우면 미확인 값(null)으로 전송합니다.</p></details>}
  </form>;
}
