"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { applyBusinessFormError } from "@/lib/api/form-errors";

import { useCreateWorkplace, useUpdateWorkplace } from "../queries";
import { workplaceFormSchema, type WorkplaceDto, type WorkplaceFormValues, type WorkplaceWrite } from "../schemas";

const fields = ["name", "industry", "region", "employmentStatus"] as const;
export function WorkplaceForm({ initial, onSaved, onCancel }: { initial?: WorkplaceDto; onSaved?: () => void; onCancel?: () => void }) {
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
        <legend className="sr-only">근무지 정보</legend>
        <div className="sm:col-span-2"><TextField id={`${id}-name`} label="사업장명" required error={errors.name?.message} {...register("name")} /></div>
        <TextField id={`${id}-industry`} label="업종 (선택)" error={errors.industry?.message} {...register("industry")} />
        <TextField id={`${id}-region`} label="지역 (선택)" error={errors.region?.message} {...register("region")} />
        <SelectField id={`${id}-employment`} label="재직 상태" error={errors.employmentStatus?.message} {...register("employmentStatus")}><option value="CURRENT">재직 중</option><option value="FORMER">퇴사</option></SelectField>
      </fieldset>
      {errors.root?.server?.message && <p ref={summary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
      {completed && <p role="status" className="text-body">근무지를 등록했습니다. 상세 화면으로 이동합니다.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={pending || Boolean(initial && !isDirty)}>{pending ? "저장 중…" : initial ? "변경 저장" : "근무지 등록"}</button>
        {onCancel && <button type="button" className={secondaryButton} disabled={pending} onClick={onCancel}>수정 취소</button>}
      </div>
    </form>
  );
}
