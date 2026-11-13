"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';
import {createLocalizedFeaturesWorkplacesSchemas} from '../schemas';

import { useTranslation } from '@/i18n/use-translation';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {useForm} from '@/i18n/use-localized-form';

import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";

import { useCreateWorkplace, useUpdateWorkplace } from "../queries";
import {type WorkplaceDto, type WorkplaceFormValues, type WorkplaceWrite} from "../schemas";

const fields = ["name", "industry", "region", "employmentStatus"] as const;
export function WorkplaceForm({ initial, onSaved, onCancel }: { initial?: WorkplaceDto; onSaved?: () => void; onCancel?: () => void }) {
const {applyBusinessFormError} = useLocalized(createLocalizedLibApiFormErrors);
const {workplaceFormSchema} = useLocalized(createLocalizedFeaturesWorkplacesSchemas);

 const {translate} = useTranslation();

  const id = useId();
  const router = useRouter();
  const create = useCreateWorkplace();
  const update = useUpdateWorkplace(initial?.workplaceId ?? 0);
  const [completed, setCompleted] = useState(false);
  const { register, handleSubmit, setError, setFocus, formState: { errors, dirtyFields, isDirty } } = useForm<WorkplaceFormValues>({
    resolver: zodResolver(workplaceFormSchema),
    defaultValues: { name: initial?.name ?? "", industry: initial?.industry ?? "", region: initial?.region ?? "", employmentStatus: initial?.employmentStatus ?? "CURRENT" },
  });
  const pending = create.isPending || update.isPending || completed;
  const summary = useFormErrorFocus(errors, pending, setFocus, fields);
  async function submit(values: WorkplaceFormValues) {
    const body: WorkplaceWrite = { ...values, industry: values.industry === "" ? null : values.industry, region: values.region === "" ? null : values.region };
    try {
      if (initial) {
        const patch = {
          ...(dirtyFields.name ? { name: body.name } : {}),
          ...(dirtyFields.industry ? { industry: body.industry } : {}),
          ...(dirtyFields.region ? { region: body.region } : {}),
          ...(dirtyFields.employmentStatus ? { employmentStatus: body.employmentStatus } : {}),
        };
        if (!Object.keys(patch).length) return;
        await update.mutateAsync(patch);
        onSaved?.();
      } else {
        const result = await create.mutateAsync(body);
        setCompleted(true);
        router.replace(`/workplaces/${result.workplaceId}`);
      }
    } catch (error) { applyBusinessFormError(error, setError, fields); }
  }
  return (
    <form noValidate onSubmit={handleSubmit(submit)} aria-busy={pending} className="min-w-0 space-y-5">
      <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
        <legend className="sr-only">{translate("workplaces.workplaceForm_workplace_information")}</legend>
        <div className="sm:col-span-2"><TextField id={`${id}-name`} label={translate("workplaces.workplaceForm_workplace")} required error={errors.name?.message} maxLength={200} {...register("name")} /></div>
        <TextField id={`${id}-industry`} label={translate("workplaces.workplaceForm_industry_select")} error={errors.industry?.message} maxLength={200} {...register("industry")} />
        <TextField id={`${id}-region`} label={translate("workplaces.workplaceForm_region_select")} error={errors.region?.message} maxLength={200} {...register("region")} />
        <SelectField id={`${id}-employment`} label={translate("workplaces.workplaceForm_employed_status")} error={errors.employmentStatus?.message} {...register("employmentStatus")}><option value="CURRENT">{translate("workplaces.workplaceForm_employed")}</option><option value="FORMER">{translate("workplaces.workplaceForm_employmentEnd")}</option></SelectField>
      </fieldset>
      {errors.root?.server?.message && <p ref={summary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
      {completed && <p role="status" className="text-body">{translate("workplaces.workplaceForm_workplace_create_detail_navigate")}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={pending || Boolean(initial && !isDirty)}>{pending ? translate("workplaces.workplaceForm_save") : initial ? translate("workplaces.workplaceForm_change_save") : translate("workplaces.workplaceForm_workplace_create")}</button>
        {onCancel && <button type="button" className={secondaryButton} disabled={pending} onClick={onCancel}>{translate("workplaces.workplaceForm_edit_cancel")}</button>}
      </div>
    </form>
  );
}
