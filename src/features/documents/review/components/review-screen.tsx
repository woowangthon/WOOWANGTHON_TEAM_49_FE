"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useDocuments, useDocumentStatus, useDocumentAction, useRecomputeStatus } from "../../queries";
import { recomputeActive } from "../../api";
import type { DocumentDto } from "../../schemas";
import { isProcessing, reviewLabels, statusLabels } from "../../view-models";
import { useFields } from "../queries";
import type { ReplacementId, SourceDto } from "../schemas";
import { recomputeJobLabel, reviewError } from "../view-models";
import { discardChanges, useUnsavedChanges } from "../use-unsaved";
import { OriginalViewer } from "./original-viewer";
import { FieldsPanel } from "./fields-panel";
import { ReplacementPanel } from "./replacement-panel";
import { ReviewConfirmation } from "./review-confirmation";
export function ReviewScreen({id,initialDocumentId,initialReplacementId}:{id:number;initialDocumentId?:number;initialReplacementId?:ReplacementId}){
  const c=useCase(id);const removal=useCaseRemoval(id);const documents=useDocuments({kind:"case",id},{page:1,size:100});
  const [selected,setSelected]=useState(initialDocumentId);const [replacement,setReplacement]=useState(initialReplacementId);
  const [editDirty,setEditDirty]=useState(false);const [fileDirty,setFileDirty]=useState(false);
  const dirty=editDirty||fileDirty;useUnsavedChanges(dirty);
  const changeDocument=(documentId:number)=>{
    if(dirty&&!discardChanges())return;setEditDirty(false);setFileDirty(false);setSelected(documentId);setReplacement(undefined);
    window.history.replaceState(null,"",`/cases/${id}/review?documentId=${documentId}`);
  };
  if(removal.pending||removal.removed)return <p role="status">삭제 중이거나 삭제된 사례입니다.</p>;
  if(c.isPending||documents.isPending)return <QueryFeedback pending />;
  if(c.isError||documents.isError)return <QueryFeedback error={c.error??documents.error} retry={()=>{void c.refetch();void documents.refetch();}} />;
  const dto=documents.data.items.find(d=>d.documentId===(selected??documents.data.items[0]?.documentId));
  return <div className="min-w-0 space-y-6"><PageHeading title="문서 원문·추출값 검토" description={`${c.data.workplace.name} · ${c.data.periodStart} ~ ${c.data.periodEnd}`} action={<Link href={`/cases/${id}/upload`} className={secondaryButton}>자료 등록·관리</Link>} />
    {dirty&&<p role="status" className="rounded-control bg-warning-soft p-4 text-body">저장하지 않은 변경이 있습니다. 문서를 바꾸거나 이동하기 전에 저장해 주세요.</p>}
    <nav aria-label="검토할 문서 선택" className="flex min-w-0 flex-wrap gap-2">{documents.data.items.map(d=><button key={d.documentId} className={`${secondaryButton} max-w-full break-all`} aria-current={dto?.documentId===d.documentId?"page":undefined} onClick={()=>changeDocument(d.documentId)}>{d.fileName}</button>)}</nav>
    {!dto?<section className={cardStyle}><h2 className="text-title font-bold">검토할 연결 문서가 없습니다</h2><p>선택한 문서가 해제되었거나 아직 자료가 없습니다. 자료 등록 화면에서 연결 상태를 확인해 주세요.</p></section>:<ReviewDocument key={dto.documentId} dto={dto} caseId={id} version={c.data.inputVersion} dirty={editDirty} onDirty={setEditDirty} onFileDirty={setFileDirty} replacementId={replacement} onCreated={r=>{setReplacement(r);window.history.replaceState(null,"",`/cases/${id}/review?documentId=${dto.documentId}&replacementId=${encodeURIComponent(r)}`);}} onReset={()=>{setReplacement(undefined);window.history.replaceState(null,"",`/cases/${id}/review?documentId=${dto.documentId}`);}} onConfirmed={changeDocument} />}
  </div>;
}
function ReviewDocument({dto,caseId,version,dirty,onDirty,onFileDirty,replacementId,onCreated,onReset,onConfirmed}:{dto:DocumentDto;caseId:number;version:number;dirty:boolean;onDirty:(dirty:boolean)=>void;onFileDirty:(dirty:boolean)=>void;replacementId?:ReplacementId;onCreated:(r:ReplacementId)=>void;onReset:()=>void;onConfirmed:(d:number)=>void}){
  const retry=useDocumentAction();const [retryError,setRetryError]=useState("");
  const status=useDocumentStatus({kind:"case",id:caseId},dto);const processing=status.data?.processingStatus??dto.processingStatus;
  const fields=useFields(caseId,dto.documentId,!isProcessing(processing));const recompute=useRecomputeStatus(caseId);
  const [source,setSource]=useState<SourceDto|null>();const [tab,setTab]=useState<"original"|"fields">("fields");
  const context={caseId,documentId:dto.documentId,workplaceId:dto.workplaceId};
  return <>
    <p className="text-body">문서 처리: {statusLabels[processing]} · 사용자 검토: {(fields.data?.reviewStatus??status.data?.reviewStatus??dto.reviewStatus)?reviewLabels[(fields.data?.reviewStatus??status.data?.reviewStatus??dto.reviewStatus)!]:"미제공"}</p>
    {status.isError&&<QueryFeedback error={status.error} retry={()=>{void status.refetch();}} />}
    {recompute.isError?<QueryFeedback error={recompute.error} retry={()=>{void recompute.refetch();}} />:<p role="status" className="text-body text-muted">{!recompute.data?"서버 갱신 상태를 불러오는 중…":recomputeActive(recompute.data)?"입력 변경에 따른 서버 결과 갱신 중입니다. 과거 결과는 유지됩니다.":`서버 갱신: ${recomputeJobLabel(recompute.data.latestJob?.status??recompute.data.activeJob?.status)}. 작업 종료가 모든 계산의 완료를 뜻하지는 않습니다.`}</p>}
    {processing==="FAILED"&&<div className={`${cardStyle} space-y-3`}><p>문서 처리에 실패했습니다. 원문 확인이나 교체는 계속 사용할 수 있습니다.</p>{retryError&&<p role="alert">{retryError}</p>}<button className={secondaryButton} disabled={retry.isPending||dirty} onClick={async()=>{setRetryError("");try{await retry.mutateAsync({type:"retry",caseId,documentId:dto.documentId});}catch(error){setRetryError(reviewError(error));}}}>문서 재처리</button></div>}
    <div onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="Home"?"original":event.key==="End"?"fields":tab==="original"?"fields":"original";setTab(next);document.getElementById(`${next}-tab`)?.focus();}} role="tablist" aria-label="원문과 필드 보기" className="flex flex-wrap gap-2 xl:hidden"><button id="original-tab" role="tab" tabIndex={tab==="original"?0:-1} aria-selected={tab==="original"} aria-controls="original-panel" className={secondaryButton} onClick={()=>setTab("original")}>원문</button><button id="fields-tab" role="tab" tabIndex={tab==="fields"?0:-1} aria-selected={tab==="fields"} aria-controls="fields-panel" className={secondaryButton} onClick={()=>setTab("fields")}>추출 필드</button></div>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
      <div id="original-panel" role="tabpanel" aria-labelledby="original-tab" className={`min-w-0 ${tab==="original"?"block":"hidden xl:block"}`}><OriginalViewer workplaceId={dto.workplaceId} documentId={dto.documentId} source={source} /></div>
      <div id="fields-panel" role="tabpanel" aria-labelledby="fields-tab" className={`min-w-0 ${tab==="fields"?"block":"hidden xl:block"}`}>
        {isProcessing(processing)?<p role="status" className={cardStyle}>문서를 처리 중입니다. 원문은 볼 수 있으며 추출 필드는 처리 후 확인할 수 있습니다.</p>:fields.isPending?<QueryFeedback pending />:fields.isError?<QueryFeedback error={fields.error} retry={()=>{void fields.refetch();}} />:<FieldsPanel fields={fields.data.fields} context={context} inputVersion={version} onSource={s=>{setSource(s);setTab("original");}} dirty={dirty} onDirty={onDirty} linkedCaseIds={dto.linkedCaseIds} />}
      </div>
    </div>
    {!isProcessing(processing)&&fields.data&&<ReviewConfirmation context={context} version={version} fields={fields.data.fields} disabled={dirty} />}
    <ReplacementPanel context={context} version={version} replacementId={replacementId} onCreated={onCreated} onReset={onReset} onConfirmed={onConfirmed} onDirty={onFileDirty} disabled={dirty} />
  </>;
}
