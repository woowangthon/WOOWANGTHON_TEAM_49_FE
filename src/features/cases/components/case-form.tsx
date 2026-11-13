"use client";
import {message as describeMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';
import {createLocalizedFeaturesCasesSchemas} from '../schemas';

import { useTranslation } from '@/i18n/use-translation';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {useForm} from '@/i18n/use-localized-form';

import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { WorkplacePicker } from "@/features/workplaces/components/workplace-picker";
import { useWorkplace } from "@/features/workplaces/queries";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { useSessionScope } from "@/hooks/use-session-scope";
import { ApiError } from "@/lib/api/error";

import { businessKeys } from "@/lib/query/business-keys";

import { caseApi } from "../api";
import { useCreateCase, useUpdateCase } from "../queries";
import {type CaseDetailDto, type CaseFormValues, type CasePatch} from "../schemas";

const fields = ["payType", "periodStart", "periodEnd", "scheduledPayDate"] as const;
function formValues(dto: CaseDetailDto): CaseFormValues {
  return { payType: dto.payType, periodStart: dto.periodStart, periodEnd: dto.periodEnd, scheduledPayDate: dto.scheduledPayDate ?? "" };
}

export function CaseForm({ initial, defaultWorkplaceId = null, onSaved, onCancel }: { initial?: CaseDetailDto; defaultWorkplaceId?: number | null; onSaved?: () => void; onCancel?: () => void }) {
const {applyBusinessFormError} = useLocalized(createLocalizedLibApiFormErrors);
const {caseFormSchema} = useLocalized(createLocalizedFeaturesCasesSchemas);

 const {translate} = useTranslation();

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
        if (!workplaceId || !workplace.isSuccess) { setError("root.server", { message: describeMessage("cases.caseForm_workplace_select_information_confirm") }); return; }
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
        <legend className="sr-only">{translate("cases.caseForm_wageCase_input")}</legend>
        {!initial && <WorkplacePicker value={workplaceId} onChange={setWorkplaceId} />}
        <div className="rounded-control bg-neutral-soft p-4 text-body">
          <p>{workplaceId === null ? translate("cases.caseForm_workplace_select") : workplace.isPending ? translate("cases.caseForm_selected_workplace_confirm") : workplace.isError ? translate("cases.caseForm_selected_workplace_access_count_empty_retry_confirm") : translate("cases.caseForm_selected_workplace", { value1: workplace.data.name })}</p>
          {workplaceId !== null && workplace.isError && <button type="button" className={`mt-3 ${secondaryButton}`} onClick={() => { void workplace.refetch(); }}>{translate("cases.caseForm_selected_workplace_retry_confirm")}</button>}
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <SelectField id={`${id}-payType`} label={translate("cases.caseDetailScreen_wage")} error={errors.payType?.message} {...register("payType")}><option value="HOURLY">{translate("cases.caseForm_hourlyWage")}</option><option value="MONTHLY">{translate("cases.caseForm_monthlyWage")}</option></SelectField>
          <div className="hidden sm:block" />
          <TextField id={`${id}-start`} type="date" label={translate("cases.caseForm_startDate")} required error={errors.periodStart?.message} {...register("periodStart")} />
          <TextField id={`${id}-end`} type="date" label={translate("cases.caseForm_endDate")} required error={errors.periodEnd?.message} {...register("periodEnd")} />
          <TextField id={`${id}-payDate`} type="date" label={translate("cases.caseForm_payment_select")} error={errors.scheduledPayDate?.message} {...register("scheduledPayDate")} />
        </div>
        <p className="text-body text-muted">{translate("cases.caseForm_wagePeriod_payment")}</p>
      </fieldset>
      {errors.root?.server?.message && <p ref={summary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
      {conflict && <div className="space-y-3 rounded-control bg-warning-soft p-4 text-body"><p>{translate("cases.caseForm_input_save_current_information_retry_confirm_content")}</p><button type="button" className={secondaryButton} disabled={pending} onClick={() => { void reloadLatest(); }}>{translate("cases.caseForm_current_information_load")}</button></div>}
      {completed && <p role="status" className="text-body">{translate("cases.caseForm_case_record_create_navigate")}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={pending || conflict || (initial ? !isDirty : !workplace.isSuccess)}>{pending ? translate("cases.caseForm_save") : initial ? translate("cases.caseForm_change_save") : translate("cases.caseForm_case")}</button>
        {onCancel && <button type="button" className={secondaryButton} disabled={pending} onClick={onCancel}>{translate("cases.caseForm_edit_cancel")}</button>}
      </div>
    </form>
  );
}
