"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsSchemas} from '../schemas';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useId, useState } from "react";
import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { useDocumentAction } from "../queries";
import {type ConcreteDocumentType, type DocumentDto} from "../schemas";

type Issue = NonNullable<ReturnType<ReturnType<typeof createLocalizedFeaturesDocumentsViewModels>["documentTypeIssue"]>>;

/** Resolves DOCUMENT_TYPE_MISMATCH / DOCUMENT_TYPE_UNRESOLVED through the P0 document type PATCH. */
export function DocumentTypeResolution({ dto, issue, disabled = false }: { dto: DocumentDto; issue: Issue; disabled?: boolean }) {
const {documentTypes} = useLocalized(createLocalizedFeaturesDocumentsSchemas);
const {documentError, typeLabels} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const id = useId();
  const mutation = useDocumentAction();
  const [choosing, setChoosing] = useState(!issue.detected);
  const [selected, setSelected] = useState<ConcreteDocumentType | "">("");
  const [error, setError] = useMessageState("");
  const busy = mutation.isPending || disabled;
  const change = async (documentType: ConcreteDocumentType) => {
    setError("");
    try { await mutation.mutateAsync({ type: "changeType", workplaceId: dto.workplaceId, documentId: dto.documentId, documentType }); }
    catch (e) { setError(documentError(e, true)); }
  };
  return <section aria-labelledby={`${id}-title`} className="mt-3 min-w-0 space-y-3 rounded-control border border-border bg-neutral-soft p-4">
    <h4 id={`${id}-title`} className="text-body font-bold">{translate("documents.documentTypeResolution_document_type_confirm_required")}</h4>
    <p className="break-words text-body">{issue.message}</p>
    {issue.detected && !choosing && <div className="flex flex-wrap gap-2">
      <button type="button" className={primaryButton} disabled={busy} onClick={() => { void change(issue.detected!); }}>{translate("documents.documentTypeResolution_retry_extraction", { value1: typeLabels[issue.detected] })}</button>
      <button type="button" className={secondaryButton} disabled={busy} onClick={() => setChoosing(true)}>{translate("documents.documentTypeResolution_type_select")}</button>
    </div>}
    {choosing && <form className="space-y-3" aria-label={translate("documents.documentTypeResolution_document_type_select")} onSubmit={event => { event.preventDefault(); if (selected) void change(selected); }}>
      <SelectField id={`${id}-type`} label={translate("documents.documentTypeResolution_document_type")} value={selected} disabled={busy} onChange={event => setSelected(event.target.value as ConcreteDocumentType | "")}>
        <option value="">{translate("documents.documentTypeResolution_type_select_2")}</option>
        {documentTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}
      </SelectField>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton} disabled={busy || !selected}>{translate("documents.documentTypeResolution_type_retry_extraction")}</button>
        {issue.detected && <button type="button" className={secondaryButton} disabled={busy} onClick={() => { setChoosing(false); setSelected(""); }}>{translate("documents.documentTypeResolution_select_cancel")}</button>}
      </div>
    </form>}
    {mutation.isPending && <p role="status" className="text-body">{translate("documents.documentTypeResolution_document_type_change_request")}</p>}
    {error && <p role="alert" className="break-words text-body">{error}</p>}
    <p className="text-caption text-muted">{translate("documents.documentTypeResolution_type_confirm_extractedValue_new_retry_extraction_original")}</p>
  </section>;
}
