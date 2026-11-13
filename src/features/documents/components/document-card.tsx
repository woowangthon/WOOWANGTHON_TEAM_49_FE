"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleAlert, FileText, LoaderCircle } from "lucide-react";
import { secondaryButton } from "@/components/ui/styles";
import { useDocumentAction, useDocumentStatus } from "../queries";
import type { DocumentContext } from "../schemas";
import {type DocumentViewModel} from "../view-models";
import { DocumentTypeResolution } from "./document-type-resolution";
import { DocumentActions } from "./document-actions";
import { LinkForm } from "./link-form";
export function DocumentCard({ dto, context, linkDetails, inputVersion, selectableCaseId, canConnect = true, onEditingChange }: DocumentViewModel & { context: DocumentContext; inputVersion?: number; selectableCaseId?: number; canConnect?: boolean; onEditingChange?: (editing: boolean) => void }) {
const {documentCard, processingErrorMessage, documentError, documentTypeIssue, isProcessing} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const status = useDocumentStatus(context.kind === "library" ? { kind: "workplace", id: dto.workplaceId } : context, dto);
  const item = documentCard(dto, status.data);
  const [visibleLinks, setVisibleLinks] = useState(5);
  const [editing, setEditing] = useState(false);
  const mutation = useDocumentAction();
  const [error, setError] = useMessageState("");
  const active = isProcessing(item.processingStatus);
  const Icon = active ? LoaderCircle : item.processingStatus === "READY" ? CircleCheck : CircleAlert;
  const caseId = context.kind === "case" ? context.id : undefined;
  const link = linkDetails && linkDetails.linkId === dto.linkId && linkDetails.documentId === dto.documentId && linkDetails.caseId === caseId ? linkDetails : undefined;
  const retryCaseId = caseId ?? dto.linkedCaseIds?.[0];
  const typeIssue = active ? undefined : documentTypeIssue(dto, item.errorCode);
  return <article className={`document-row min-w-0`} aria-label={dto.fileName}>
    <div className="flex min-w-0 items-start gap-3"><FileText aria-hidden="true" className="mt-1 size-6 shrink-0" /><div className="min-w-0"><h3 className="break-all text-body font-bold">{dto.fileName}</h3><p className="mt-1 text-caption text-muted">{item.typeLabel}{context.kind === "library" && ` · ${dto.workplaceName ?? translate("documents.documentCard_workplace", { value1: dto.workplaceId })}`}</p></div></div>
    <p className="document-status flex flex-wrap items-center gap-2 text-body"><Icon aria-hidden="true" className={`size-4 shrink-0 ${active ? "animate-spin motion-reduce:animate-none" : ""}`} /><span>{translate("documents.documentCard_processing", { value1: item.statusLabel })}</span><span>{translate("documents.documentCard_review", { value1: item.reviewLabel })}</span></p>
    {active && item.progress != null && <label className="mt-3 block text-caption">{translate("documents.documentCard_document_processing")}{item.progress}%<progress className="mt-2 block w-full" max={100} value={item.progress} /></label>}
    {status.isError && <div role="alert" className="mt-3 text-body">{documentError(status.error)}<button className={`mt-2 ${secondaryButton}`} onClick={() => { void status.refetch(); }}>{translate("documents.documentCard_status_retry")}</button></div>}
    <p className="document-date text-caption text-muted">{item.uploadedLabel}</p>
    {typeIssue && <DocumentTypeResolution key={typeIssue.code} dto={dto} issue={typeIssue} />}
    {item.processingStatus === "FAILED" && <div className="mt-3"><p className="break-all text-body">{processingErrorMessage(item.errorCode)}</p>{retryCaseId ? <button className={`mt-2 ${secondaryButton}`} disabled={mutation.isPending} onClick={async () => { setError(""); try { await mutation.mutateAsync({ type: "retry", caseId: retryCaseId, documentId: dto.documentId }); } catch (e) { setError(documentError(e, true)); } }}>{translate("documents.documentCard_document_processing_2")}</button> : <p className="text-caption">{translate("documents.documentCard_failure_processing_case_link_use_count")}</p>}</div>}
    {error && <p role="alert" className="mt-3">{error}</p>}
    <details className="document-management mt-3"><summary className="cursor-pointer text-body font-bold">{translate("documents.documentCard_record_detail")}</summary>
    <Link className="mt-2 inline-flex min-h-11 items-center break-all text-body underline" href={`/workplaces/${dto.workplaceId}/documents`}>{translate("documents.documentCard_library", { value1: dto.workplaceName ?? translate("documents.documentCard_workplace", { value1: dto.workplaceId }) })}</Link>
    {dto.linkedCaseIds === undefined ? <p className="text-caption text-muted">{translate("documents.documentCard_link_case_information_notProvided")}</p> : <div className="text-caption"><p>{translate("documents.documentCard_link_case", { value1: dto.linkedCaseIds.length })}</p><div className="flex flex-wrap gap-x-3">{dto.linkedCaseIds.slice(0, visibleLinks).map(id => <Link className="inline-flex min-h-11 items-center underline" key={id} href={`/cases/${id}/upload`}>{translate("documents.documentActions_case", { value1: id })}</Link>)}</div>{dto.linkedCaseIds.length > visibleLinks && <button className={secondaryButton} onClick={() => setVisibleLinks(n => n + 5)}>{translate("documents.documentCard_link_case_showMore")}</button>}</div>}
    {caseId&&<Link className={`mt-3 ${secondaryButton}`} href={`/cases/${caseId}/review?documentId=${dto.documentId}`}>{translate("documents.documentCard_original_extractedValue_review")}</Link>}
    {caseId && !link && <p className="mt-3 text-caption text-muted">{translate("documents.documentCard_link_period_information_notProvided_edit_count_empty")}</p>}
    {link && <div className="mt-3 break-words text-body"><p>{translate("documents.documentCard_case_link", { value1: link.purpose })}</p><p>{translate("documents.documentCard_applicable_period", { value1: link.applicableFrom ?? translate("documents.documentCard_start"), value2: link.applicableTo ?? translate("documents.documentCard_value2_p") })}</p></div>}

    {selectableCaseId && inputVersion ? <div className="mt-auto pt-4">{!editing && <button className={secondaryButton} disabled={!canConnect || dto.linkedCaseIds?.includes(selectableCaseId)} onClick={() => { setEditing(true); onEditingChange?.(true); }}>{dto.linkedCaseIds?.includes(selectableCaseId) ? translate("documents.documentCard_link") : translate("documents.documentCard_original_select")}</button>}
      {editing && <LinkForm caseId={selectableCaseId} documentId={dto.documentId} inputVersion={inputVersion} onDone={() => { setEditing(false); onEditingChange?.(false); }} />}</div> : <>
      {caseId && link && inputVersion && <div className="mt-4">{!editing && <button className={secondaryButton} onClick={() => { setEditing(true); onEditingChange?.(true); }}>{translate("documents.documentCard_link_information_edit")}</button>}{editing && <LinkForm caseId={caseId} documentId={dto.documentId} link={link} inputVersion={inputVersion} onDone={() => { setEditing(false); onEditingChange?.(false); }} />}</div>}
      <div className="mt-auto"><DocumentActions dto={dto} caseId={caseId} inputVersion={inputVersion} /></div>
    </>}
    </details>
  </article>;
}
