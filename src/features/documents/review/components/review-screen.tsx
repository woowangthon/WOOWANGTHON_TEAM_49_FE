"use client";
import { jobText } from "@/features/documents/api";
import { useSearchParams } from "next/navigation";
import { safeChatReturn } from "@/features/results/snapshot-link";
import Link from "next/link";
import { useRef, useState } from "react";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useDocuments, useDocumentStatus, useDocumentAction, useRecomputeStatus } from "../../queries";
import { recomputeActive } from "../../api";
import type { DocumentDto } from "../../schemas";
import { documentTypeIssue, isProcessing, statusLabels } from "../../view-models";
import { DocumentTypeResolution } from "../../components/document-type-resolution";
import { useFields } from "../queries";
import type { ReplacementId, SourceDto } from "../schemas";
import { recomputeJobLabel, reviewError, reviewStateView } from "../view-models";
import { discardChanges, useUnsavedChanges } from "../use-unsaved";
import { OriginalViewer } from "./original-viewer";
import { FieldsPanel } from "./fields-panel";
import { ReplacementPanel } from "./replacement-panel";
import { ReviewConfirmation } from "./review-confirmation";
export function ReviewScreen({id,initialDocumentId,initialReplacementId}:{id:number;initialDocumentId?:number;initialReplacementId?:ReplacementId}){
  const back=safeChatReturn(useSearchParams().get("returnTo"));
  const c=useCase(id);const removal=useCaseRemoval(id);const documents=useDocuments({kind:"case",id},{page:1,size:100});
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(initialDocumentId);const [replacement,setReplacement]=useState(initialReplacementId);
  const [editDirty,setEditDirty]=useState(false);const [fileDirty,setFileDirty]=useState(false);
  const dirty=editDirty||fileDirty;useUnsavedChanges(dirty);
  const changeDocument=(documentId:number)=>{
    if(dirty&&!discardChanges())return;setEditDirty(false);setFileDirty(false);setSelected(documentId);setReplacement(undefined);
    window.history.replaceState(null,"",`/cases/${id}/review?documentId=${documentId}`);
  };
  if(removal.pending||removal.removed)return <p role="status">삭제 중이거나 삭제된 내역입니다.</p>;
  if(c.isPending||documents.isPending)return <QueryFeedback pending />;
  if(c.isError||documents.isError)return <QueryFeedback error={c.error??documents.error} retry={()=>{void c.refetch();void documents.refetch();}} />;
  const dto=documents.data.items.find(d=>d.documentId===(selected??documents.data.items[0]?.documentId));
  return <div className="min-w-0 space-y-6">{back&&<Link href={back} className={secondaryButton}>원래 채팅으로 돌아가기</Link>}<CaseStageHeader stage="review" title="문서 원문·추출값 검토" description="원문과 추출된 내용을 나란히 살펴보세요. 다른 값은 수정하고, 확인한 항목을 표시할 수 있어요." action={<Link href={`/cases/${id}/upload`} className={secondaryButton}>자료 등록·관리</Link>} />
    {dirty&&<p role="status" className="rounded-control bg-warning-soft p-4 text-body">저장하지 않은 변경이 있습니다. 문서를 바꾸거나 이동하기 전에 저장해 주세요.</p>}
    <details data-case-document-picker className="min-w-0 border-b border-border pb-3"><summary className="min-h-11 cursor-pointer break-all py-3 font-bold">현재 문서: {dto?.fileName??"선택 없음"} · 문서 변경 ({documents.data.items.length})</summary><label className="block py-3 text-body">문서 검색<input className="mt-2 block min-h-11 w-full rounded-control border border-border px-3" type="search" value={search} onChange={e=>setSearch(e.target.value)} /></label><nav aria-label="검토할 문서 선택" className="max-h-64 overflow-y-auto">{documents.data.items.filter(d=>d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(d=><button key={d.documentId} className="block min-h-11 w-full break-all border-b border-border px-3 py-2 text-left text-body focus-visible:outline-2" aria-current={dto?.documentId===d.documentId?"page":undefined} onClick={()=>changeDocument(d.documentId)}>{d.fileName} · {statusLabels[d.processingStatus]}{dto?.documentId===d.documentId?" · 선택됨":""}</button>)}{!documents.data.items.some(d=>d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&<p role="status">검색 결과가 없습니다.</p>}</nav><p className="text-caption text-muted">현재 불러온 문서 내 검색</p></details>
    {!dto?<section className={cardStyle}><h2 className="text-title font-bold">검토할 연결 문서가 없습니다</h2><p>선택한 문서가 해제되었거나 아직 자료가 없습니다. 자료 등록 화면에서 연결 상태를 확인해 주세요.</p></section>:<ReviewDocument key={dto.documentId} dto={dto} caseId={id} version={c.data.inputVersion} dirty={editDirty} onDirty={setEditDirty} onFileDirty={setFileDirty} replacementId={replacement} onCreated={r=>{setReplacement(r);window.history.replaceState(null,"",`/cases/${id}/review?documentId=${dto.documentId}&replacementId=${encodeURIComponent(r)}`);}} onReset={()=>{setReplacement(undefined);window.history.replaceState(null,"",`/cases/${id}/review?documentId=${dto.documentId}`);}} onConfirmed={changeDocument} />}
  </div>;
}
function ReviewDocument({dto,caseId,version,dirty,onDirty,onFileDirty,replacementId,onCreated,onReset,onConfirmed}:{dto:DocumentDto;caseId:number;version:number;dirty:boolean;onDirty:(dirty:boolean)=>void;onFileDirty:(dirty:boolean)=>void;replacementId?:ReplacementId;onCreated:(r:ReplacementId)=>void;onReset:()=>void;onConfirmed:(d:number)=>void}){
  const retry=useDocumentAction();const [retryError,setRetryError]=useState("");
  const status=useDocumentStatus({kind:"case",id:caseId},dto);const processing=status.data?.processingStatus??dto.processingStatus;
  const typeIssue=isProcessing(processing)?undefined:documentTypeIssue(dto,status.data?status.data.errorCode:dto.errorCode);
  const fields=useFields(caseId,dto.documentId,!isProcessing(processing));const recompute=useRecomputeStatus(caseId);
  const [source,setSource]=useState<SourceDto|null>();const [tab,setTab]=useState<"original"|"fields">("fields");
  const sourceTrigger=useRef<HTMLElement|null>(null);
  const context={caseId,documentId:dto.documentId,workplaceId:dto.workplaceId};
  return <>
    <p className="text-body">문서 처리: {statusLabels[processing]} · 사용자 검토: {reviewStateView(processing, fields.data?.reviewStatus??status.data?.reviewStatus??dto.reviewStatus).reviewLabel}</p>
    {status.isError&&<QueryFeedback error={status.error} retry={()=>{void status.refetch();}} />}
    {recompute.isError?<QueryFeedback error={recompute.error} retry={()=>{void recompute.refetch();}} />:<p hidden={!!recompute.data && !recomputeActive(recompute.data) && recompute.data.latestJob?.status !== "FAILED"} role="status" className="text-body text-muted">{!recompute.data?"서버 갱신 상태를 불러오는 중…":recomputeActive(recompute.data)?"입력 변경에 따른 서버 결과 갱신 중입니다. 과거 결과는 유지됩니다.":`서버 갱신: ${recomputeJobLabel(jobText(recompute.data.latestJob?.status??recompute.data.activeJob?.status))}. 작업 종료가 모든 계산의 완료를 뜻하지는 않습니다.`}</p>}
    {typeIssue&&<div className={cardStyle}><DocumentTypeResolution key={typeIssue.code} dto={dto} issue={typeIssue} disabled={dirty} /></div>}
    {processing==="FAILED"&&<div className={`${cardStyle} space-y-3`}><p>문서 처리에 실패했습니다. 원문 확인이나 교체는 계속 사용할 수 있습니다.</p>{retryError&&<p role="alert">{retryError}</p>}<button className={secondaryButton} disabled={retry.isPending||dirty} onClick={async()=>{setRetryError("");try{await retry.mutateAsync({type:"retry",caseId,documentId:dto.documentId});}catch(error){setRetryError(reviewError(error));}}}>문서 재처리</button></div>}
    <div onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="Home"?"original":event.key==="End"?"fields":tab==="original"?"fields":"original";setTab(next);document.getElementById(`${next}-tab`)?.focus();}} role="tablist" aria-label="원문과 필드 보기" className="review-tabs flex flex-wrap gap-2"><button id="original-tab" role="tab" tabIndex={tab==="original"?0:-1} aria-selected={tab==="original"} aria-controls="original-panel" className={secondaryButton} onClick={()=>setTab("original")}>원문</button><button id="fields-tab" role="tab" tabIndex={tab==="fields"?0:-1} aria-selected={tab==="fields"} aria-controls="fields-panel" className={secondaryButton} onClick={()=>setTab("fields")}>추출 필드</button></div>
    <div className="review-comparison grid min-w-0 items-start gap-6">
      <div id="original-panel" tabIndex={-1} role="tabpanel" aria-labelledby="original-tab" className={`min-w-0 ${tab==="original"?"block":"review-inactive"}`}><button className={`${secondaryButton} mb-3 review-return-button`} onClick={()=>{setTab("fields");requestAnimationFrame(()=>sourceTrigger.current?.focus());}}>추출 필드로 돌아가기</button><OriginalViewer workplaceId={dto.workplaceId} documentId={dto.documentId} source={source} /></div>
      <div id="fields-panel" role="tabpanel" aria-labelledby="fields-tab" className={`min-w-0 ${tab==="fields"?"block":"review-inactive"}`}>
        {isProcessing(processing)?<p role="status" className={cardStyle}>문서를 처리 중입니다. 원문은 볼 수 있으며 추출 필드는 처리 후 확인할 수 있습니다.</p>:fields.isPending?<QueryFeedback pending />:fields.isError?<QueryFeedback error={fields.error} retry={()=>{void fields.refetch();}} />:<FieldsPanel actionsDisabled={!reviewStateView(fields.data?.processingStatus??"",fields.data?.reviewStatus??"").canAct} fields={fields.data.fields} context={context} inputVersion={version} onSource={s=>{sourceTrigger.current=document.activeElement as HTMLElement;setSource(s);setTab("original");requestAnimationFrame(()=>document.getElementById("original-panel")?.focus());}} dirty={dirty} onDirty={onDirty} linkedCaseIds={dto.linkedCaseIds} />}
      </div>
    </div>
    {!isProcessing(processing)&&fields.data&&<ReviewConfirmation context={context} version={version} fields={fields.data.fields} disabled={dirty||!reviewStateView(fields.data?.processingStatus??"",fields.data?.reviewStatus??"").canAct} />}
    <Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>계산 조건 확인으로 이동</Link>
    <details className={cardStyle} open={!!replacementId}><summary className="cursor-pointer font-bold">문서 교체 관리</summary><ReplacementPanel context={context} version={version} replacementId={replacementId} onCreated={onCreated} onReset={onReset} onConfirmed={onConfirmed} onDirty={onFileDirty} disabled={dirty} /></details>
  </>;
}
