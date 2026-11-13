"use client";
import { ReviewStatusBadges } from "./review-status-badges";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsViewModels} from '../../view-models';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { jobText } from "@/features/documents/api";
import { useSearchParams } from "next/navigation";
import { safeChatReturn } from "@/features/results/snapshot-link";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useDocuments, useDocumentStatus, useDocumentAction, useRecomputeStatus } from "../../queries";
import { recomputeActive } from "../../api";
import type { DocumentDto } from "../../schemas";

import { DocumentTypeResolution } from "../../components/document-type-resolution";
import { useFields } from "../queries";
import type { SourceDto } from "../schemas";

import { discardChanges, useUnsavedChanges } from "../use-unsaved";
import { OriginalViewer } from "./original-viewer";
import { FieldsPanel } from "./fields-panel";
import { CaseNextStep } from "@/features/cases/components/case-next-step";
import { ReviewConfirmation } from "./review-confirmation";
import styles from "./review-screen.module.css";
export function ReviewScreen({id,initialDocumentId}:{id:number;initialDocumentId?:number}){


 const {translate} = useTranslation();

  const back=safeChatReturn(useSearchParams().get("returnTo"));
  const c=useCase(id);const removal=useCaseRemoval(id);const documents=useDocuments({kind:"case",id},{page:1,size:100});
  const [selected,setSelected]=useState(initialDocumentId);
  const [editDirty,setEditDirty]=useState(false);
  const dirty=editDirty;useUnsavedChanges(dirty);
  const changeDocument=(documentId:number)=>{
    if(dirty&&!discardChanges(translate))return;setEditDirty(false);setSelected(documentId);
    window.history.replaceState(null,"",`/cases/${id}/review?documentId=${documentId}`);
  };
  if(removal.pending||removal.removed)return <p role="status">{translate("documents.reviewScreen_delete")}</p>;
  if(c.isPending||documents.isPending)return <QueryFeedback pending />;
  if(c.isError||documents.isError)return <QueryFeedback error={c.error??documents.error} retry={()=>{void c.refetch();void documents.refetch();}} />;
  const dto=documents.data.items.find(d=>d.documentId===(selected??documents.data.items[0]?.documentId));
  return <div className={styles.screen}>{back&&<Link href={back} className={secondaryButton}>{translate("documents.reviewScreen_div")}</Link>}<CaseStageHeader stage="review" title={translate("documents.reviewScreen_document_content_confirm")} description={translate("documents.reviewScreen_extraction_confirm")} action={<Link href={`/cases/${id}/upload`} className={secondaryButton}>{translate("documents.reviewScreen_record_create")}</Link>} />
    {dirty&&<p role="status" className="rounded-control bg-warning-soft p-4 text-body">{translate("documents.reviewScreen_save_change_document_navigate")}</p>}
    <CaseNextStep title={translate("documents.reviewScreen_document_content_confirm_2")} description={translate("documents.reviewScreen_work_calculation_required_information_confirm")} href={`/cases/${id}/conditions`} label={translate("documents.reviewScreen_calculation_confirm")} ariaLabel={translate("documents.reviewScreen_document_review_next_step")} />
    <details data-case-document-picker className={styles.documentPicker}><summary><span className={styles.fileIcon}><FileText size={21} aria-hidden="true" /></span><span className={styles.fileName}><small>{translate("documents.reviewScreen_current_document")}</small>{dto?.fileName??translate("documents.reviewScreen_select_none")}</span><span className={styles.documentCount}>{translate("documents.reviewScreen_document_change", { value1: documents.data.items.length })}</span><ChevronDown size={17} aria-hidden="true" /></summary><nav aria-label={translate("documents.reviewScreen_review_document_select")} className="max-h-64 overflow-y-auto">{documents.data.items.map(d=><button key={d.documentId} className={styles.documentOption} aria-current={dto?.documentId===d.documentId?"page":undefined} onClick={()=>changeDocument(d.documentId)}><span className={styles.optionName}>{d.fileName}{dto?.documentId===d.documentId&&<span className="sr-only">{translate("documents.reviewScreen_select")}</span>}</span><ReviewStatusBadges processing={d.processingStatus} review={d.reviewStatus}/></button>)}</nav></details>
    {!dto?<section className={cardStyle}><h2 className="text-title font-bold">{translate("documents.reviewScreen_review_link_document_empty")}</h2><p>{translate("documents.reviewScreen_selected_document_release_record_empty_create_link")}</p></section>:<ReviewDocument key={dto.documentId} dto={dto} caseId={id} version={c.data.inputVersion} period={{start:c.data.periodStart,end:c.data.periodEnd}} dirty={editDirty} onDirty={setEditDirty} />}
  </div>;
}
function ReviewDocument({dto,caseId,version,period,dirty,onDirty}:{dto:DocumentDto;caseId:number;version:number;period:{start:string;end:string};dirty:boolean;onDirty:(dirty:boolean)=>void}){
const {documentTypeIssue, processingErrorMessage, isProcessing} = useLocalized(createLocalizedFeaturesDocumentsViewModels);
const {recomputeJobLabel, reviewError, reviewStateView} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate} = useTranslation();

  const retry=useDocumentAction();const [retryError,setRetryError]=useMessageState("");
  const status=useDocumentStatus({kind:"case",id:caseId},dto);const processing=status.data?.processingStatus??dto.processingStatus;
  const typeIssue=isProcessing(processing)?undefined:documentTypeIssue(dto,status.data?status.data.errorCode:dto.errorCode);
  const fields=useFields(caseId,dto.documentId,!isProcessing(processing));const recompute=useRecomputeStatus(caseId);
  const [source,setSource]=useState<SourceDto|null>();const [tab,setTab]=useState<"original"|"fields">("fields");
  const [sourceRequest,setSourceRequest]=useState(0);
  const sourceTrigger=useRef<HTMLElement|null>(null);
  const context={caseId,documentId:dto.documentId,workplaceId:dto.workplaceId};
  return <>

    {status.isError&&<QueryFeedback error={status.error} retry={()=>{void status.refetch();}} />}
    {recompute.isError?<QueryFeedback error={recompute.error} retry={()=>{void recompute.refetch();}} />:<p hidden={!!recompute.data && !recomputeActive(recompute.data) && recompute.data.latestJob?.status !== "FAILED"} role="status" className="text-body text-muted">{!recompute.data?translate("documents.reviewScreen_update_status_load"):recomputeActive(recompute.data)?translate("documents.reviewScreen_input_change_result_update"):translate("documents.reviewScreen_update_all_calculation_complete", { value1: recomputeJobLabel(jobText(recompute.data.latestJob?.status??recompute.data.activeJob?.status)) })}</p>}
    {typeIssue&&<div className={cardStyle}><DocumentTypeResolution key={typeIssue.code} dto={dto} issue={typeIssue} disabled={dirty} /></div>}
    {processing==="FAILED"&&<div className={`${cardStyle} space-y-3`}><p>{processingErrorMessage(status.data?.errorCode??dto.errorCode)}</p><p>{translate("documents.reviewScreen_document_processing_failure_original_confirm_count")}</p>{retryError&&<p role="alert">{retryError}</p>}<button className={secondaryButton} disabled={retry.isPending||dirty} onClick={async()=>{setRetryError("");try{await retry.mutateAsync({type:"retry",caseId,documentId:dto.documentId});}catch(error){setRetryError(reviewError(error, true));}}}>{translate("documents.documentCard_document_processing_2")}</button></div>}
    <div onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="Home"?"original":event.key==="End"?"fields":tab==="original"?"fields":"original";setTab(next);document.getElementById(`${next}-tab`)?.focus();}} role="tablist" aria-label={translate("documents.reviewScreen_original_field")} className={`review-tabs ${styles.tabs}`}><button id="original-tab" role="tab" tabIndex={tab==="original"?0:-1} aria-selected={tab==="original"} aria-controls="original-panel" onClick={()=>setTab("original")}>{translate("documents.reviewScreen_original")}</button><button id="fields-tab" role="tab" tabIndex={tab==="fields"?0:-1} aria-selected={tab==="fields"} aria-controls="fields-panel" onClick={()=>setTab("fields")}>{translate("documents.reviewScreen_extraction_field")}</button></div>
    <div className={`review-comparison grid min-w-0 ${styles.comparison}`}>
      <div id="original-panel" tabIndex={-1} role="tabpanel" aria-labelledby="original-tab" className={`${styles.original} ${tab==="original"?"block":"review-inactive"}`}><button className={`${secondaryButton} mb-3 review-return-button`} onClick={()=>{setTab("fields");requestAnimationFrame(()=>sourceTrigger.current?.focus());}}>{translate("documents.reviewScreen_extraction_field_2")}</button><OriginalViewer workplaceId={dto.workplaceId} documentId={dto.documentId} source={source} sourceRequest={sourceRequest} /></div>
      <div id="fields-panel" role="tabpanel" aria-labelledby="fields-tab" className={`${styles.fields} ${tab==="fields"?"block":"review-inactive"}`}>
        {isProcessing(processing)?<p role="status" className={cardStyle}>{translate("documents.reviewScreen_document_processing_original_count_extraction_field_confirm")}</p>:fields.isPending?<QueryFeedback pending />:fields.isError?<QueryFeedback error={fields.error} retry={()=>{void fields.refetch();}} />:<FieldsPanel actionsDisabled={!reviewStateView(fields.data.processingStatus,fields.data.reviewStatus).canAct} fields={fields.data.fields} documentType={dto.documentType} period={period} context={context} inputVersion={version} onSource={s=>{sourceTrigger.current=document.activeElement as HTMLElement;setSource(s?{...s}:s);setSourceRequest(v=>v+1);setTab("original");requestAnimationFrame(()=>document.getElementById("original-panel")?.focus({preventScroll:true}));}} dirty={dirty} onDirty={onDirty} linkedCaseIds={dto.linkedCaseIds} />}
      </div>
    </div>
    {!isProcessing(processing)&&fields.data&&<ReviewConfirmation context={context} version={version} fields={fields.data.fields} documentType={dto.documentType} disabled={dirty||!reviewStateView(fields.data.processingStatus,fields.data.reviewStatus).canAct} />}
  </>;
}
