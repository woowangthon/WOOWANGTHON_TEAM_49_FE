"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsFileValidation} from '../../file-validation';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '../view-models';
import {createLocalizedFeaturesDocumentsViewModels} from '../../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { useCase } from "@/features/cases/queries";

import { useReplacement, useReviewAction } from "../queries";
import { replacementCreatedSchema, type ReplacementId, type ReviewContext, type SourceDto } from "../schemas";

import { OriginalViewer } from "./original-viewer";
export function ReplacementPanel({context,version,replacementId,onCreated,onConfirmed,onDirty,disabled,onReset}:{context:ReviewContext;version:number;replacementId?:ReplacementId;onCreated:(id:ReplacementId)=>void;onReset?:()=>void;onConfirmed:(documentId:number)=>void;onDirty:(value:boolean)=>void;disabled:boolean}){
const {validateFile, validateImageDimensions} = useLocalized(createLocalizedFeaturesDocumentsFileValidation);
const {reviewError} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate} = useTranslation();

  const id=useId();const [file,setFile]=useState<File>();const [error,setError]=useMessageState("");const [busy,setBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);const locked=useRef(false);const mutation=useReviewAction(context);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{onDirty(!!file||busy);},[file,busy,onDirty]);useEffect(()=>()=>onDirty(false),[onDirty]);
  if(replacementId!==undefined)return <ReplacementCandidate context={context} replacementId={replacementId} onConfirmed={onConfirmed} disabled={disabled} onReset={onReset} />;
  return <section className={`${cardStyle} space-y-4`} aria-label={translate("documents.replacementPanel_original")}><h2 className="text-title font-bold">{translate("documents.replacementPanel_original_step_new_file_create")}</h2>
    <p className="text-body">{translate("documents.replacementPanel_new_original_processing_extraction_field_confirm_link")}</p>
    <label htmlFor={`${id}-file`} className="block text-body font-bold">{translate("documents.replacementPanel_new_file")}</label><input id={`${id}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy||disabled} className="block min-w-0 w-full text-body file:min-h-11 file:mr-2" onChange={e=>{const chosen=e.target.files?.[0];const invalid=chosen?validateFile(chosen):undefined;setError(invalid??"");setFile(invalid?undefined:chosen);}} />
    <p className="text-caption text-muted">{translate("documents.replacementPanel_pdf_atMost_page_image_format_check")}</p>
    {error&&<p role="alert">{error}</p>}
    {busy&&<p role="status">{translate("documents.replacementPanel_file_request_original_link")}</p>}
    <div className="flex flex-wrap gap-2"><button className={primaryButton} disabled={busy||!file||disabled} onClick={async()=>{
      if(!file||locked.current)return;locked.current=true;setBusy(true);setError("");controller.current=new AbortController();
      try{const invalid=validateFile(file)??await validateImageDimensions(file);if(invalid){setError(invalid);return;}controller.current.signal.throwIfAborted();
        const data=await mutation.mutateAsync({type:"replace",file,version,signal:controller.current.signal});const receipt=replacementCreatedSchema.parse(data);setFile(undefined);onCreated(receipt.replacementId);
      }catch(e){setError(reviewError(e, true));}finally{locked.current=false;setBusy(false);}
    }}>{translate("documents.replacementPanel_new_original_request")}</button>{busy&&<button className={secondaryButton} onClick={()=>controller.current?.abort()}>{translate("documents.uploadForm_request_pending_stop")}</button>}</div>
    <p className="text-caption text-muted">{translate("documents.replacementPanel_request_pending_stop_processing_cancel_count_confirm")}</p>
  </section>;
}
function ReplacementCandidate({context,replacementId,onConfirmed,disabled,onReset}:{context:ReviewContext;replacementId:ReplacementId;onConfirmed:(documentId:number)=>void;disabled:boolean;onReset?:()=>void}){
const {isProcessing, statusLabels} = useLocalized(createLocalizedFeaturesDocumentsViewModels);
const {reviewError} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate} = useTranslation();

  const confirmLock=useRef(false);const [compareOriginal,setCompareOriginal]=useState(false);
  const q=useReplacement(context.caseId,replacementId);const mutation=useReviewAction(context);const latest=useCase(context.caseId);
  const [source,setSource]=useState<SourceDto|null>();const [originalReady,setOriginalReady]=useState(false);const [confirmVersion,setConfirmVersion]=useState<number>();const [checked,setChecked]=useState(false);const [dialog,setDialog]=useState(false);
  const [error,setError]=useMessageState("");const [conflict,setConflict]=useState(false);
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  const data=q.data;
  if(String(data.replacementId)!==String(replacementId)||data.documentId===context.documentId)return <p role="alert">{translate("documents.replacementPanel_request_new_original_information_match_stop")}</p>;
  const candidateId=data.documentId;
  const canConfirm=originalReady&&candidateId!==undefined&&["READ_READY","READY","REVIEW_REQUIRED"].includes(data.processingStatus??"")&&data.status==="CANDIDATE"&&data.original?.documentId===context.documentId&&data.candidate?.workplaceId===context.workplaceId&&data.fields!==undefined&&data.fields.every(f=>f.fieldId!==undefined&&f.key!==undefined&&f.label!==undefined&&f.value!==undefined&&f.status!==undefined);
  return <section className={`${cardStyle} space-y-5`} aria-label={translate("documents.replacementPanel_original_confirm")}><h2 className="text-title font-bold">{translate("documents.replacementPanel_original_step_new_field_confirm")}</h2>
    <p className="text-body">{translate("documents.replacementPanel_request_new_document", { value1: replacementId, value2: data.documentId, value3: data.processingStatus?statusLabels[data.processingStatus]:translate("documents.replacementPanel_candidate_information_pending") })}</p>
    <p className="text-body">{translate("documents.replacementPanel_case_link_new_original")}</p>
    {q.isFetching&&isProcessing(data.processingStatus)&&<p role="status">{translate("documents.replacementPanel_new_original_processing_status_confirm")}</p>}
    <details onToggle={e=>setCompareOriginal(e.currentTarget.open)}><summary>{translate("documents.replacementPanel_original_comparison")}</summary>{compareOriginal&&<OriginalViewer workplaceId={context.workplaceId} documentId={context.documentId} />}</details>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">{candidateId===undefined?<p role="status">{translate("documents.replacementPanel_candidate_original_notProvided")}</p>:<OriginalViewer workplaceId={context.workplaceId} documentId={candidateId} source={source} onReady={setOriginalReady} />}
      <section className="min-w-0 space-y-3" aria-label={translate("documents.replacementPanel_candidate_extraction_field")}><h3 className="text-title font-bold">{translate("documents.replacementPanel_new_original_extraction_field")}</h3>
        {data.fields===undefined?<p>{translate("documents.replacementPanel_new_field_notProvided_confirm_count_empty")}</p>:!data.fields.length?<p>{translate("documents.replacementPanel_extraction_field_empty_original_confirm")}</p>:data.fields.map((field,index)=>{const vm={valueLabel:field.value===undefined?translate("documents.replacementPanel_notProvided"):typeof field.value==="string"?field.value:JSON.stringify(field.value),statusLabel:field.status??translate("documents.replacementPanel_information_notProvided")};return <article aria-label={field.label} className="rounded-control border border-border p-4" key={field.fieldId??index}><h4 className="break-words font-bold">{field.label??field.key??translate("documents.replacementPanel_information_notProvided")}</h4><p className="break-all">{vm.valueLabel} · {vm.statusLabel}</p><p className="break-words">{field.source?.text??translate("documents.replacementPanel_evidence_notProvided")}</p><button className={`mt-2 ${secondaryButton}`} onClick={()=>setSource(field.source??null)}>{translate("documents.replacementPanel_new_original_evidence")}</button></article>;})}
      </section>
    </div>
    {data.processingStatus==="FAILED"&&<p role="alert">{translate("documents.replacementPanel_candidate_processing_failure_link_notProvided_new_file")}</p>}
    {onReset&&<div className="space-y-2"><p className="text-caption text-muted">{translate("documents.replacementPanel_file_retry_request_current_candidate_processing_cancel")}</p><button className={secondaryButton} disabled={mutation.isPending} onClick={onReset}>{translate("documents.replacementPanel_file_new_request")}</button></div>}
    <p className="text-caption text-muted">{translate("documents.replacementPanel_override_applicable_field_source_confirm_status_retry")}</p>
    <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} disabled={!canConfirm||mutation.isPending} onChange={e=>setChecked(e.target.checked)} /><span>{translate("documents.replacementPanel_new_original_extraction_field_comparison_case_link")}</span></label>
    {error&&<p role="alert">{error}</p>}
    {conflict&&<button className={secondaryButton} disabled={q.isFetching||latest.isFetching} onClick={async()=>{const results=await Promise.all([q.refetch(),latest.refetch()]);if(results.every(r=>!r.isError)){setConflict(false);setChecked(false);setError("");}}}>{translate("documents.replacementPanel_current_status_version_retry_confirm")}</button>}
    <button className={primaryButton} disabled={!checked||!canConfirm||conflict||mutation.isPending||disabled||!latest.data} onClick={()=>{setConfirmVersion(latest.data?.inputVersion);setDialog(true);}}>{translate("documents.replacementPanel_original_2")}</button>
    {dialog&&<ConfirmDialog title={translate("documents.replacementPanel_case_original_link")} busy={mutation.isPending} onClose={()=>setDialog(false)} action={<button className={primaryButton} disabled={mutation.isPending||!latest.data} onClick={async()=>{
      if(confirmVersion===undefined||candidateId===undefined||confirmLock.current)return;confirmLock.current=true;
      try{await mutation.mutateAsync({type:"confirm-replacement",replacementId,version:confirmVersion});setDialog(false);onConfirmed(candidateId);}
      catch(e){setError(reviewError(e, true));setConflict(true);setChecked(false);setDialog(false);}finally{confirmLock.current=false;}
    }}>{translate("documents.replacementPanel_new_original_link_confirm")}</button>}><p>{translate("documents.replacementPanel_case_link_document_original", { value1: data.documentId })}</p></ConfirmDialog>}
  </section>;
}
