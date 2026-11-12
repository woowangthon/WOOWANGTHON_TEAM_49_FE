"use client";
import { useCase } from "@/features/cases/queries";
import { ApiError } from "@/lib/api/error";
import { useState } from "react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";
import { useReview, useReviewAction } from "../queries";
import type { ExtractedField, ReviewContext } from "../schemas";
import { reviewError } from "../view-models";
import { reviewLabels, statusLabels } from "../../view-models";
import type { DocumentDto } from "../../schemas";
import { groupReviewFields } from "../field-groups";
import styles from "./review-screen.module.css";
export function ReviewConfirmation({context,version,fields,disabled,documentType="PAYSLIP"}:{context:ReviewContext;version:number;fields:ExtractedField[];disabled:boolean;documentType?:DocumentDto["documentType"]}){
  const latest=useCase(context.caseId);const [conflict,setConflict]=useState(false);const q=useReview(context.caseId,context.documentId);const mutation=useReviewAction(context);const [error,setError]=useState("");
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  const data=q.data;
  const groups=groupReviewFields(fields,documentType);
  const remainingDetails=groups.details.filter(field=>data.unconfirmedFieldIds?.includes(field.fieldId)).length;
  return <section className={`${cardStyle} ${styles.confirmation}`} aria-label="문서 전체 검토"><div className={styles.confirmationCopy}><h2>문서 확인을 마무리할까요?</h2>
    <p className="text-body">처리: {statusLabels[data.processingStatus]} · 연결 문서 검토: {reviewLabels[data.reviewStatus]}</p>
    {data.totalFieldCount!==undefined&&data.confirmedFieldCount!==undefined&&<p>확인된 필드 {data.confirmedFieldCount} / {data.totalFieldCount}</p>}
    {remainingDetails>0&&<p className="text-body">세부 항목에도 미확인 값이 {remainingDetails}개 있어요. ‘세부 항목 확인’을 펼쳐 살펴봐 주세요.</p>}
    {data.unconfirmedFieldIds&&data.unconfirmedFieldIds.length>0&&<p className="break-words">미완료 항목: {data.unconfirmedFieldIds.map(id=>fields.find(f=>f.fieldId===id)?.label??`필드 #${id}`).join(", ")}</p>}
    {data.reasonCodes?.length? <p className="break-words">사유: {data.reasonCodes.join(", ")}</p>:null}
    <p className="text-caption text-muted">검토 완료는 원본 진위·법적 검증 완료를 뜻하지 않습니다.</p>
    {error&&<p role="alert">{error}</p>}
    {conflict&&<button className={primaryButton} disabled={q.isFetching||latest.isFetching} onClick={async()=>{const results=await Promise.all([q.refetch(),latest.refetch()]);if(results.every(r=>!r.isError)){setConflict(false);setError("");}}}>최신 검토 상태와 버전 확인</button>}
    </div><div className={styles.confirmationAction}><button className={primaryButton} disabled={disabled||conflict||mutation.isPending||data.processingStatus==="UPLOADED"||data.processingStatus==="PROCESSING"} onClick={async()=>{setError("");try{await mutation.mutateAsync({type:"confirm-review",version});}catch(e){setError(reviewError(e));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);}}}>{mutation.isPending?"검토 상태 확인 중…":"문서 검토 완료 요청"}</button><p>미완료 항목이 있으면 검토 중으로 유지돼요.</p></div>
  </section>;
}
