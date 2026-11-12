"use client";
import { jobText } from "@/features/documents/api";
import { useSearchParams } from "next/navigation";
import { safeChatReturn } from "@/features/results/snapshot-link";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, ChevronDown, FileText, ScanLine } from "lucide-react";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useDocuments, useDocumentStatus, useDocumentAction, useRecomputeStatus } from "../../queries";
import { recomputeActive } from "../../api";
import type { DocumentDto } from "../../schemas";
import { documentTypeIssue, processingErrorMessage, isProcessing, statusLabels } from "../../view-models";
import { DocumentTypeResolution } from "../../components/document-type-resolution";
import { useFields } from "../queries";
import type { SourceDto } from "../schemas";
import { recomputeJobLabel, reviewError, reviewStateView } from "../view-models";
import { discardChanges, useUnsavedChanges } from "../use-unsaved";
import { OriginalViewer } from "./original-viewer";
import { FieldsPanel } from "./fields-panel";
import { CaseNextStep } from "@/features/cases/components/case-next-step";
import { ReviewConfirmation } from "./review-confirmation";
import styles from "./review-screen.module.css";
export function ReviewScreen({id,initialDocumentId}:{id:number;initialDocumentId?:number}){
  const back=safeChatReturn(useSearchParams().get("returnTo"));
  const c=useCase(id);const removal=useCaseRemoval(id);const documents=useDocuments({kind:"case",id},{page:1,size:100});
  const [selected,setSelected]=useState(initialDocumentId);
  const [editDirty,setEditDirty]=useState(false);
  const dirty=editDirty;useUnsavedChanges(dirty);
  const changeDocument=(documentId:number)=>{
    if(dirty&&!discardChanges())return;setEditDirty(false);setSelected(documentId);
    window.history.replaceState(null,"",`/cases/${id}/review?documentId=${documentId}`);
  };
  if(removal.pending||removal.removed)return <p role="status">삭제 중이거나 삭제된 사례입니다.</p>;
  if(c.isPending||documents.isPending)return <QueryFeedback pending />;
  if(c.isError||documents.isError)return <QueryFeedback error={c.error??documents.error} retry={()=>{void c.refetch();void documents.refetch();}} />;
  const dto=documents.data.items.find(d=>d.documentId===(selected??documents.data.items[0]?.documentId));
  return <div className={styles.screen}>{back&&<Link href={back} className={secondaryButton}>원래 채팅으로 돌아가기</Link>}<CaseStageHeader stage="review" title="문서 내용 확인" description="핵심 값과 추출 안 된 값을 먼저 확인해 주세요." action={<Link href={`/cases/${id}/upload`} className={secondaryButton}>자료 등록·관리</Link>} />
    {dirty&&<p role="status" className="rounded-control bg-warning-soft p-4 text-body">저장하지 않은 변경이 있습니다. 문서를 바꾸거나 이동하기 전에 저장해 주세요.</p>}
    <details data-case-document-picker className={styles.documentPicker}><summary><span className={styles.fileIcon}><FileText size={21} aria-hidden="true" /></span><span className={styles.fileName}><small>현재 문서</small>{dto?.fileName??"선택 없음"}</span><span className={styles.documentCount}>문서 변경 ({documents.data.items.length})</span><ChevronDown size={17} aria-hidden="true" /></summary><nav aria-label="검토할 문서 선택" className="max-h-64 overflow-y-auto">{documents.data.items.map(d=><button key={d.documentId} className="block min-h-11 w-full break-all border-b border-border px-3 py-2 text-left text-body focus-visible:outline-2" aria-current={dto?.documentId===d.documentId?"page":undefined} onClick={()=>changeDocument(d.documentId)}>{d.fileName} · {statusLabels[d.processingStatus]}{dto?.documentId===d.documentId?" · 선택됨":""}</button>)}</nav></details>
    {!dto?<section className={cardStyle}><h2 className="text-title font-bold">검토할 연결 문서가 없습니다</h2><p>선택한 문서가 해제되었거나 아직 자료가 없습니다. 자료 등록 화면에서 연결 상태를 확인해 주세요.</p></section>:<ReviewDocument key={dto.documentId} dto={dto} caseId={id} version={c.data.inputVersion} period={{start:c.data.periodStart,end:c.data.periodEnd}} dirty={editDirty} onDirty={setEditDirty} />}
  </div>;
}
function ReviewDocument({dto,caseId,version,period,dirty,onDirty}:{dto:DocumentDto;caseId:number;version:number;period:{start:string;end:string};dirty:boolean;onDirty:(dirty:boolean)=>void}){
  const retry=useDocumentAction();const [retryError,setRetryError]=useState("");
  const status=useDocumentStatus({kind:"case",id:caseId},dto);const processing=status.data?.processingStatus??dto.processingStatus;
  const typeIssue=isProcessing(processing)?undefined:documentTypeIssue(dto,status.data?status.data.errorCode:dto.errorCode);
  const fields=useFields(caseId,dto.documentId,!isProcessing(processing));const recompute=useRecomputeStatus(caseId);
  const [source,setSource]=useState<SourceDto|null>();const [tab,setTab]=useState<"original"|"fields">("fields");
  const [sourceRequest,setSourceRequest]=useState(0);
  const sourceTrigger=useRef<HTMLElement|null>(null);
  const context={caseId,documentId:dto.documentId,workplaceId:dto.workplaceId};
  return <>
    <p className={styles.documentStatus}><span><ScanLine size={14} aria-hidden="true" />문서 처리: {statusLabels[processing]}</span>{" · "}<span><CheckCircle2 size={14} aria-hidden="true" />사용자 검토: {reviewStateView(processing,fields.data?.reviewStatus??status.data?.reviewStatus??dto.reviewStatus).reviewLabel}</span></p>
    {status.isError&&<QueryFeedback error={status.error} retry={()=>{void status.refetch();}} />}
    {recompute.isError?<QueryFeedback error={recompute.error} retry={()=>{void recompute.refetch();}} />:<p hidden={!!recompute.data && !recomputeActive(recompute.data) && recompute.data.latestJob?.status !== "FAILED"} role="status" className="text-body text-muted">{!recompute.data?"서버 갱신 상태를 불러오는 중…":recomputeActive(recompute.data)?"입력 변경에 따른 서버 결과 갱신 중입니다. 과거 결과는 유지됩니다.":`서버 갱신: ${recomputeJobLabel(jobText(recompute.data.latestJob?.status??recompute.data.activeJob?.status))}. 작업 종료가 모든 계산의 완료를 뜻하지는 않습니다.`}</p>}
    {typeIssue&&<div className={cardStyle}><DocumentTypeResolution key={typeIssue.code} dto={dto} issue={typeIssue} disabled={dirty} /></div>}
    {processing==="FAILED"&&<div className={`${cardStyle} space-y-3`}><p>{processingErrorMessage(status.data?.errorCode??dto.errorCode)}</p><p>문서 처리에 실패했습니다. 원문은 계속 확인할 수 있습니다.</p>{retryError&&<p role="alert">{retryError}</p>}<button className={secondaryButton} disabled={retry.isPending||dirty} onClick={async()=>{setRetryError("");try{await retry.mutateAsync({type:"retry",caseId,documentId:dto.documentId});}catch(error){setRetryError(reviewError(error));}}}>문서 재처리</button></div>}
    <div onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="Home"?"original":event.key==="End"?"fields":tab==="original"?"fields":"original";setTab(next);document.getElementById(`${next}-tab`)?.focus();}} role="tablist" aria-label="원문과 필드 보기" className={`review-tabs ${styles.tabs}`}><button id="original-tab" role="tab" tabIndex={tab==="original"?0:-1} aria-selected={tab==="original"} aria-controls="original-panel" onClick={()=>setTab("original")}>원문</button><button id="fields-tab" role="tab" tabIndex={tab==="fields"?0:-1} aria-selected={tab==="fields"} aria-controls="fields-panel" onClick={()=>setTab("fields")}>추출 필드</button></div>
    <div className={`review-comparison grid min-w-0 ${styles.comparison}`}>
      <div id="original-panel" tabIndex={-1} role="tabpanel" aria-labelledby="original-tab" className={`${styles.original} ${tab==="original"?"block":"review-inactive"}`}><button className={`${secondaryButton} mb-3 review-return-button`} onClick={()=>{setTab("fields");requestAnimationFrame(()=>sourceTrigger.current?.focus());}}>추출 필드로 돌아가기</button><OriginalViewer workplaceId={dto.workplaceId} documentId={dto.documentId} source={source} sourceRequest={sourceRequest} /></div>
      <div id="fields-panel" role="tabpanel" aria-labelledby="fields-tab" className={`${styles.fields} ${tab==="fields"?"block":"review-inactive"}`}>
        {isProcessing(processing)?<p role="status" className={cardStyle}>문서를 처리 중입니다. 원문은 볼 수 있으며 추출 필드는 처리 후 확인할 수 있습니다.</p>:fields.isPending?<QueryFeedback pending />:fields.isError?<QueryFeedback error={fields.error} retry={()=>{void fields.refetch();}} />:<FieldsPanel actionsDisabled={!reviewStateView(fields.data.processingStatus,fields.data.reviewStatus).canAct} fields={fields.data.fields} documentType={dto.documentType} period={period} context={context} inputVersion={version} onSource={s=>{sourceTrigger.current=document.activeElement as HTMLElement;setSource(s?{...s}:s);setSourceRequest(v=>v+1);setTab("original");requestAnimationFrame(()=>document.getElementById("original-panel")?.focus({preventScroll:true}));}} dirty={dirty} onDirty={onDirty} linkedCaseIds={dto.linkedCaseIds} />}
      </div>
    </div>
    {!isProcessing(processing)&&fields.data&&<ReviewConfirmation context={context} version={version} fields={fields.data.fields} documentType={dto.documentType} disabled={dirty||!reviewStateView(fields.data.processingStatus,fields.data.reviewStatus).canAct} />}
    <CaseNextStep title="문서 내용을 확인했다면" description="이제 근무 조건과 계산에 필요한 정보를 확인해 보세요." href={`/cases/${caseId}/conditions`} label="계산 조건 확인하기" ariaLabel="문서 검토 다음 단계" />
  </>;
}
