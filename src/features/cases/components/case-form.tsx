"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { WorkplacePicker } from "@/features/workplaces/components/workplace-picker";
import { useWorkplace } from "@/features/workplaces/queries";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { useSessionScope } from "@/hooks/use-session-scope";
import { ApiError } from "@/lib/api/error";
import { applyBusinessFormError } from "@/lib/api/form-errors";
import { businessKeys } from "@/lib/query/business-keys";

import { caseApi } from "../api";
import { useCreateCase, useUpdateCase } from "../queries";
import { caseFormSchema, type CaseDetailDto, type CaseFormValues, type CasePatch } from "../schemas";

const fields = ["payType", "periodStart", "periodEnd", "scheduledPayDate"] as const;
function formValues(dto: CaseDetailDto): CaseFormValues {
  return { payType: dto.payType, periodStart: dto.periodStart, periodEnd: dto.periodEnd, scheduledPayDate: dto.scheduledPayDate ?? "" };
}

export function CaseForm({ initial, defaultWorkplaceId = null, onSaved, onCancel }: { initial?: CaseDetailDto; defaultWorkplaceId?: number | null; onSaved?: () => void; onCancel?: () => void }) {
  const id = useId();
  const router = useRouter();
  const scope = useSessionScope();
  const [workplaceId, setWorkplaceId] = useState<number | null>(initial?.workplaceId ?? defaultWorkplaceId);
  const workplace = useWorkplace(workplaceId ?? 0);
  // This is the version of the editable draft, not a copy of the server entity.
  const [baseVersion, setBaseVersion] = useState(initial?.inputVersion ?? 0);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const create = useCreateCase();
  const update = useUpdateCase(initial?.caseId ?? 0);
  const { register, handleSubmit, setError, setFocus, reset, formState: { errors, dirtyFields, isDirty } } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: initial ? formValues(initial) : { payType: "HOURLY", periodStart: "", periodEnd: "", scheduledPayDate: "" },
  });
  const pending = create.isPending || update.isPending || reloading || completed;
  const summary = useFormErrorFocus(errors, pending, setFocus, fields);
  async function reloadLatest() {
    if (!initial) return;
    setReloading(true);
    try {
      const latest = await scope.queryClient.fetchQuery({ queryKey: businessKeys.case(scope.generation, initial.caseId), queryFn: ({ signal }) => caseApi(scope.api).detail(initial.caseId, signal), staleTime: 0 });
      reset(formValues(latest));
      setBaseVersion(latest.inputVersion);
      setConflict(false);
    } catch (error) { applyBusinessFormError(error, setError, fields); }
    finally { setReloading(false); }
  }
  async function submit(values: CaseFormValues) {
    if (conflict) return;
    try {
      const scheduledPayDate = values.scheduledPayDate === "" ? null : values.scheduledPayDate;
      if (initial) {
        const patch: CasePatch = {
          expectedInputVersion: baseVersion,
          ...(dirtyFields.payType ? { payType: values.payType } : {}),
          ...(dirtyFields.periodStart ? { periodStart: values.periodStart } : {}),
          ...(dirtyFields.periodEnd ? { periodEnd: values.periodEnd } : {}),
          ...(dirtyFields.scheduledPayDate ? { scheduledPayDate } : {}),
        };
        if (Object.keys(patch).length === 1) return;
        await update.mutateAsync(patch);
        onSaved?.();
      } else {
        if (!workplaceId || !workplace.isSuccess) { setError("root.server", { message: "근무지를 선택하고 정보를 확인해 주세요." }); return; }
        const result = await create.mutateAsync({ workplaceId, payType: values.payType, periodStart: values.periodStart, periodEnd: values.periodEnd, scheduledPayDate });
        setCompleted(true);
        router.replace(`/cases/${result.caseId}/upload`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true);
      applyBusinessFormError(error, setError, fields);
    }
  }
  return (
    <form noValidate onSubmit={handleSubmit(submit)} aria-busy={pending} className="min-w-0 space-y-6">
      <fieldset disabled={pending} className="min-w-0 space-y-6">
        <legend className="sr-only">급여 사례 입력</legend>
        {!initial && <WorkplacePicker value={workplaceId} onChange={setWorkplaceId} />}
        <div className="rounded-control bg-neutral-soft p-4 text-body">
          <p>{workplaceId === null ? "먼저 근무지를 선택해 주세요." : workplace.isPending ? "선택한 근무지를 확인하고 있습니다." : workplace.isError ? "선택한 근무지에 접근할 수 없습니다. 다시 확인하거나 다른 근무지를 선택해 주세요." : `선택한 근무지: ${workplace.data.name}`}</p>
          {workplaceId !== null && workplace.isError && <button type="button" className={`mt-3 ${secondaryButton}`} onClick={() => { void workplace.refetch(); }}>선택한 근무지 다시 확인</button>}
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <SelectField id={`${id}-payType`} label="급여 형태" error={errors.payType?.message} {...register("payType")}><option value="HOURLY">시급제</option><option value="MONTHLY">월급제</option></SelectField>
          <div className="hidden sm:block" />
          <TextField id={`${id}-start`} type="date" label="산정 시작일" required error={errors.periodStart?.message} {...register("periodStart")} />
          <TextField id={`${id}-end`} type="date" label="산정 종료일" required error={errors.periodEnd?.message} {...register("periodEnd")} />
          <TextField id={`${id}-payDate`} type="date" label="약정 지급일 (선택)" error={errors.scheduledPayDate?.message} {...register("scheduledPayDate")} />
        </div>
        <p className="text-body text-muted">산정기간은 달력 월과 달라도 됩니다. 모르는 지급일은 비워 두세요.</p>
      </fieldset>
      {errors.root?.server?.message && <p ref={summary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
      {conflict && <div className="space-y-3 rounded-control bg-warning-soft p-4 text-body"><p>작성 중인 입력을 유지했습니다. 저장하려면 최신 정보를 다시 확인해 주세요. 아래 버튼은 작성 중인 내용을 최신 값으로 교체합니다.</p><button type="button" className={secondaryButton} disabled={pending} onClick={() => { void reloadLatest(); }}>최신 정보 불러오기</button></div>}
      {completed && <p role="status" className="text-body">사례를 만들었습니다. 자료 등록 단계 안내로 이동합니다.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={pending || conflict || (initial ? !isDirty : !workplace.isSuccess)}>{pending ? "저장 중…" : initial ? "변경 저장" : "사례 만들기"}</button>
        {onCancel && <button type="button" className={secondaryButton} disabled={pending} onClick={onCancel}>수정 취소</button>}
      </div>
    </form>
  );
}
