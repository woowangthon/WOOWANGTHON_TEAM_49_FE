"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { ApiError } from "@/lib/api/error";
import { manualDefaults, manualFields, manualFormSchema, toManualInput, typeLabels } from "../manual-fields";
import { useInputAction } from "../queries";
import type { ManualRecord, ManualSaved, RecordType } from "../schemas";

export function ManualForm({ caseId, type, periodStart, periodEnd, initial, onSaved }: { caseId: number; type: RecordType; periodStart: string; periodEnd: string; initial?: ManualRecord; onSaved: (receipt: ManualSaved) => void }) {
  const id = useId(); const mutation = useInputAction(caseId); const locked = useRef(false); const summary = useRef<HTMLParagraphElement>(null);
  const [failure, setFailure] = useState("");
  const form = useForm({ resolver: zodResolver(manualFormSchema(type, periodStart, periodEnd)), defaultValues: manualDefaults(type, initial?.data) });
  const { register, handleSubmit, setError, setFocus, formState: { errors, isSubmitting } } = form;
  useLayoutEffect(() => { if (isSubmitting) return; const field = Object.keys(errors.values ?? {})[0]; if (field) setFocus(`values.${field}`); else if (failure) summary.current?.focus(); }, [errors, failure, isSubmitting, setFocus]);
  return <form aria-label={`${typeLabels[type]} 수기 입력`} className={`${cardStyle} min-w-0 space-y-5`} noValidate onSubmit={event => { void handleSubmit(async ({ values }) => {
    if (locked.current) return; locked.current = true; setFailure("");
    try {
      const body = toManualInput(type, values, initial?.data);
      const result = await mutation.mutateAsync(initial ? { type: "update", recordId: initial.recordId, body } : { type: "create", body });
      if (result && "recordId" in result) onSaved(result as ManualSaved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) for (const e of error.fieldErrors) {
        const key = e.field.split(".").at(-1)!;
        if (manualFields[type].some(f => f.key === key)) setError(`values.${key}`, { message: e.reason });
      }
      setFailure(businessErrorMessage(error));
    } finally { locked.current = false; }
  })(event); }}>
    <h2 className="text-title font-bold">{typeLabels[type]} {initial ? "수정" : "수기 입력"}</h2><p>원본 문서 없는 사용자 직접 입력 · USER_INPUT. 선택 항목의 빈칸은 미확인으로 남깁니다. 실제 0만 0으로 입력하세요.</p>
    {type === "ATTENDANCE" && <p>근무일 {periodStart} ~ {periodEnd}. 출퇴근 입력은 한국시간 UTC+09:00으로 전송합니다.</p>}
    {type === "PAYSLIP" && <p>개별 지급·공제 목록에는 소계·합계를 제외하고 빠짐없이 확인한 금액만 입력하세요. 불완전한 목록은 빈칸으로 남깁니다.</p>}
    {type === "DEPOSIT" && <p>수령 사실은 사용자 신고(USER_REPORTED)입니다. 서버가 거래와 이 사례의 전액 배분을 생성하며, 일반 수기 목록에 중복 저장하지 않습니다.</p>}
    <div className="grid min-w-0 gap-5 md:grid-cols-2">{manualFields[type].map(f => {
      const props = { id: `${id}-${f.key}`, label: `${f.label} · ${f.required ? "필수" : "선택·미확인 가능"}`, disabled: isSubmitting, required: f.required, error: errors.values?.[f.key]?.message, ...register(`values.${f.key}`) };
      return f.kind === "method" ? <SelectField key={f.key} {...props}><option value="">선택해 주세요</option><option value="BANK_TRANSFER">계좌이체</option><option value="CASH">현금</option></SelectField> : <TextField key={f.key} {...props} type={f.kind === "date" ? "date" : f.kind === "datetime" ? "datetime-local" : "text"} step={f.kind === "datetime" ? "1" : undefined} inputMode={f.kind === "money" || f.kind === "minutes" ? "numeric" : undefined} placeholder={f.kind === "list" ? "예: 2000000, 300000" : undefined} />;
    })}</div>
    {failure && <p tabIndex={-1} role="alert" ref={summary}>{failure}</p>}<button className={primaryButton} disabled={isSubmitting} type="submit">{isSubmitting ? "저장 중…" : initial ? "수기 기록 수정 저장" : "수기 자료 저장"}</button>
    {initial && <p className="text-caption text-muted">같은 유형의 data 전체를 교체합니다. 선택 항목을 지우면 해당 값은 null로 전송합니다.</p>}
  </form>;
}
