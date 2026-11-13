"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';
import {createLocalizedFeaturesDocumentsSchemas} from '../schemas';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useId, useState } from "react";
import {useForm} from '@/i18n/use-localized-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/text-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";

import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { useCase } from "@/features/cases/queries";
import {type LinkDto} from "../schemas";
import { useDocumentAction } from "../queries";

export function LinkForm({ caseId, documentId, link, inputVersion, onDone }: { caseId: number; documentId: number; link?: LinkDto; inputVersion: number; onDone: () => void }) {
const {applyBusinessFormError} = useLocalized(createLocalizedLibApiFormErrors);
const {linkFormSchema} = useLocalized(createLocalizedFeaturesDocumentsSchemas);
const {documentError} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const id = useId();
  const mutation = useDocumentAction();
  const latest = useCase(caseId);
  const [version, setVersion] = useState(inputVersion);
  const [conflict, setConflict] = useState(false);
  const { register, handleSubmit, setFocus, formState: { errors, isSubmitting }, setError } = useForm({ resolver: zodResolver(linkFormSchema), defaultValues: { purpose: link?.purpose ?? "", applicableFrom: link?.applicableFrom ?? "", applicableTo: link?.applicableTo ?? "" } });
  const summary = useFormErrorFocus(errors, isSubmitting, setFocus, ["purpose", "applicableFrom", "applicableTo"]);
  return <form aria-label={link ? translate("documents.documentCard_link_information_edit") : translate("documents.linkForm_original_link")} className="mt-4 space-y-4" onSubmit={handleSubmit(async values => {
    if (conflict) return;
    const body = { purpose: values.purpose, applicableFrom: values.applicableFrom || null, applicableTo: values.applicableTo || null, expectedInputVersion: version };
    try {
      await mutation.mutateAsync(link ? { type: "update", caseId, linkId: link.linkId, body } : { type: "connect", caseId, documentId, body });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true);
      applyBusinessFormError(error, setError, ["purpose", "applicableFrom", "applicableTo"]);
      setError("root.server", { message: documentError(error) });
    }
  })}>
    <TextField id={`${id}-purpose`} label={translate("documents.linkForm_link")} list={`${id}-purposes`} placeholder={translate("documents.linkForm_use_input_select")} disabled={isSubmitting} error={errors.purpose?.message} maxLength={100} {...register("purpose")} />
    <datalist id={`${id}-purposes`}><option value="CONTRACT_FOR_PERIOD">{translate("documents.linkForm_wagePeriod_applicable_contract")}</option></datalist>
    <p className="text-caption text-muted">{translate("documents.linkForm_record_case_use_input_select")}</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <TextField id={`${id}-from`} label={translate("documents.linkForm_applicable_startDate_select")} type="date" disabled={isSubmitting} error={errors.applicableFrom?.message} {...register("applicableFrom")} />
      <TextField id={`${id}-to`} label={translate("documents.linkForm_applicable_endDate_select")} type="date" disabled={isSubmitting} error={errors.applicableTo?.message} {...register("applicableTo")} />
    </div>
    {errors.root?.server && <p ref={summary} tabIndex={-1} role="alert">{errors.root.server.message}</p>}
    {conflict && <button type="button" className={secondaryButton} disabled={latest.isFetching} onClick={async () => { const result = await latest.refetch(); if (result.data && !result.isError) { setVersion(result.data.inputVersion); setConflict(false); } }}>{translate("documents.linkForm_current_version_confirm_input_retry")}</button>}
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={isSubmitting || conflict} className={primaryButton}>{isSubmitting ? translate("documents.linkForm_save") : link ? translate("documents.linkForm_link_information_save") : translate("documents.linkForm_original_link_2")}</button><button type="button" onClick={onDone} disabled={isSubmitting} className={secondaryButton}>{translate("common.close")}</button></div>
  </form>;
}
