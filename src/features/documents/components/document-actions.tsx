"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { dangerButton, secondaryButton } from "@/components/ui/styles";
import { useCase } from "@/features/cases/queries";
import { ApiError } from "@/lib/api/error";
import { useDocumentAction, useDocumentImpact } from "../queries";

import type { DocumentDto } from "../schemas";

function OriginalDeletion({ dto, onClose }: { dto: DocumentDto; onClose: () => void }) {
const {documentError} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const impact = useDocumentImpact(dto.workplaceId, dto.documentId);
  const mutation = useDocumentAction();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useMessageState("");
  const [stale, setStale] = useState(false);
  const data = impact.data;
  return <ConfirmDialog title={translate("documents.documentActions_original_delete_impact_confirm")} busy={mutation.isPending} onClose={onClose} action={<button className={dangerButton} disabled={!checked || !data || impact.isFetching || impact.isError || stale || mutation.isPending} onClick={async () => {
    try { await mutation.mutateAsync({ type: "remove", workplaceId: dto.workplaceId, documentId: dto.documentId }); onClose(); }
    catch (e) { setError(documentError(e, true)); setChecked(false); setStale(true); }
  }}>{translate("documents.documentActions_original_delete_request")}</button>}>
    <p className="break-all font-bold">{dto.fileName}</p>
    {impact.isPending ? <QueryFeedback pending /> : impact.isError ? <QueryFeedback error={impact.error} retry={() => { void impact.refetch(); }} /> : data && <>
      <p>{translate("documents.documentActions_original_reference_case", { value1: data.linkedCaseCount })}</p>
      <div className="flex flex-wrap gap-2">{data.affectedCaseIds.map(id => <Link key={id} className="underline" href={`/cases/${id}`}>{translate("documents.documentActions_case", { value1: id })}</Link>)}</div>
      <p>{translate("documents.documentActions_link_payment_transaction_allocation_impact_case_original", { value1: data.affectedCaseIds.length, value2: data.derivedTransactionIds.length })}</p>
      <p>{translate("documents.documentActions_original_delete_all_link_case_report_check")}</p>
      <p>{translate("documents.documentActions_delete_count_automatic_complete")}</p>
      <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={mutation.isPending || stale} /><span>{translate("documents.documentActions_all_case_impact_confirm_original_delete_request")}</span></label>
    </>}
    {error && <p role="alert">{error}</p>}
    {stale && <button type="button" className={secondaryButton} onClick={async () => { const result = await impact.refetch(); if (!result.isError) { setStale(false); setError(""); } }}>{translate("documents.documentActions_delete_impact_retry_confirm")}</button>}
  </ConfirmDialog>;
}
function UnlinkConfirmation({ dto, caseId, version, onClose }: { dto: DocumentDto; caseId: number; version: number; onClose: () => void }) {
const {documentError} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const mutation = useDocumentAction();
  const latest = useCase(caseId);
  const [inputVersion, setInputVersion] = useState(version);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useMessageState("");
  return <ConfirmDialog title={translate("documents.documentActions_case_link_release")} busy={mutation.isPending} onClose={onClose} action={<button className={dangerButton} disabled={conflict || mutation.isPending} onClick={async () => {
    if (dto.linkId == null) return;
    try { await mutation.mutateAsync({ type: "unlink", caseId, linkId: dto.linkId, expectedInputVersion: inputVersion }); onClose(); }
    catch (e) { setError(documentError(e, true)); if (e instanceof ApiError && e.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true); }
  }}>{translate("documents.documentActions_link_release")}</button>}>
    <p className="break-all">{dto.fileName}</p><p>{translate("documents.documentActions_case_link_applicable_information_release_workplace_original")}</p>
    {error && <p role="alert">{error}</p>}
    {conflict && <button type="button" className={secondaryButton} disabled={latest.isFetching} onClick={async () => { const result = await latest.refetch(); if (result.data && !result.isError) { setInputVersion(result.data.inputVersion); setConflict(false); setError(""); } }}>{translate("documents.documentActions_current_case_confirm_retry_select")}</button>}
  </ConfirmDialog>;
}
export function DocumentActions({ dto, caseId, inputVersion }: { dto: DocumentDto; caseId?: number; inputVersion?: number }) {
 const {translate} = useTranslation();

  const [mode, setMode] = useState<"remove" | "unlink">();
  return <><div className="mt-4 flex flex-wrap gap-2">
    {caseId && dto.linkId != null && inputVersion && <button type="button" className={secondaryButton} onClick={() => setMode("unlink")}>{translate("documents.documentActions_case_link_release_2")}</button>}
    <button type="button" className={dangerButton} onClick={() => setMode("remove")}>{translate("documents.documentActions_original_delete")}</button>
  </div>
  {mode === "remove" && <OriginalDeletion dto={dto} onClose={() => setMode(undefined)} />}
  {mode === "unlink" && caseId && inputVersion && <UnlinkConfirmation dto={dto} caseId={caseId} version={inputVersion} onClose={() => setMode(undefined)} />}</>;
}
