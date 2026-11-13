"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '../view-models';
import {createLocalizedFeaturesDocumentsViewModels} from '../../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useCase } from "@/features/cases/queries";
import { ApiError } from "@/lib/api/error";
import { useState } from "react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";
import { useReview, useReviewAction } from "../queries";
import type { ExtractedField, ReviewContext } from "../schemas";

import type { DocumentDto } from "../../schemas";
import { groupReviewFields } from "../field-groups";
import styles from "./review-screen.module.css";
export function ReviewConfirmation({context,version,fields,disabled,documentType="PAYSLIP"}:{context:ReviewContext;version:number;fields:ExtractedField[];disabled:boolean;documentType?:DocumentDto["documentType"]}){
const {reviewError} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);
const {reviewLabels, statusLabels} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

 const {translate} = useTranslation();

  const latest=useCase(context.caseId);const [conflict,setConflict]=useState(false);const q=useReview(context.caseId,context.documentId);const mutation=useReviewAction(context);const [error,setError]=useMessageState("");
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  const data=q.data;
  const groups=groupReviewFields(fields,documentType);
  const pending=data.pendingRequiredFieldIds??data.unconfirmedFieldIds;
  const remainingDetails=groups.details.filter(field=>data.unconfirmedFieldIds?.includes(field.fieldId)).length;
  return <section className={`${cardStyle} ${styles.confirmation}`} aria-label={translate("documents.reviewConfirmation_document_all_review")}><div className={styles.confirmationCopy}><h2>{translate("documents.reviewConfirmation_document_confirm")}</h2>
    <p className="text-body">{translate("documents.reviewConfirmation_processing_link_document_review", { value1: statusLabels[data.processingStatus], value2: reviewLabels[data.reviewStatus] })}</p>
    {data.totalFieldCount!==undefined&&data.confirmedFieldCount!==undefined&&<p>{translate("documents.reviewConfirmation_confirm_field", { value1: data.confirmedFieldCount, value2: data.totalFieldCount })}</p>}
    {data.canCompleteReview===undefined&&remainingDetails>0&&<p className="text-body">{translate("documents.reviewConfirmation_item_confirm_expand", { value1: remainingDetails })}</p>}
    {pending&&pending.length>0&&<p className="break-words">{translate("documents.reviewConfirmation_complete_item", { value1: pending.map(id=>fields.find(f=>f.fieldId===id)?.label??translate("documents.reviewConfirmation_field", { value1: id })).join(", ") })}</p>}
    {data.reasonCodes?.length? <p className="break-words">{translate("documents.reviewConfirmation_div6", { value1: data.reasonCodes.join(", ") })}</p>:null}
    <p className="text-caption text-muted">{translate("documents.reviewConfirmation_review_complete_original")}</p>
    {data.canCompleteReview===undefined&&<p>{translate("documents.reviewPolicy_legacy")}</p>}
    {error&&<p role="alert">{error}</p>}
    {conflict&&<button className={primaryButton} disabled={q.isFetching||latest.isFetching} onClick={async()=>{const results=await Promise.all([q.refetch(),latest.refetch()]);if(results.every(r=>!r.isError)){setConflict(false);setError("");}}}>{translate("documents.reviewConfirmation_current_review_status_version_confirm")}</button>}
    </div><div className={styles.confirmationAction}><button className={primaryButton} disabled={disabled||conflict||mutation.isPending||!["READY","READ_READY","REVIEW_REQUIRED"].includes(data.processingStatus)||fields.length===0||(data.canCompleteReview!==undefined&&!data.canCompleteReview)} onClick={async()=>{setError("");try{await mutation.mutateAsync({type:"confirm-review",version});}catch(e){setError(reviewError(e, true));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);}}}>{mutation.isPending?translate("documents.reviewConfirmation_review_status_confirm"):translate("documents.reviewConfirmation_document_review_complete_request")}</button><p>{translate("documents.reviewConfirmation_complete_item_review")}</p></div>
  </section>;
}
