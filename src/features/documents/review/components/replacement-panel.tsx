"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { useCase } from "@/features/cases/queries";
import { validateFile, validateImageDimensions } from "../../file-validation";
import { isProcessing, statusLabels } from "../../view-models";
import { useReplacement, useReviewAction } from "../queries";
import { replacementCreatedSchema, type ReplacementId, type ReviewContext, type SourceDto } from "../schemas";
import { reviewError } from "../view-models";
import { OriginalViewer } from "./original-viewer";
export function ReplacementPanel({context,version,replacementId,onCreated,onConfirmed,onDirty,disabled,onReset}:{context:ReviewContext;version:number;replacementId?:ReplacementId;onCreated:(id:ReplacementId)=>void;onReset?:()=>void;onConfirmed:(documentId:number)=>void;onDirty:(value:boolean)=>void;disabled:boolean}){
  const id=useId();const [file,setFile]=useState<File>();const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);const locked=useRef(false);const mutation=useReviewAction(context);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{onDirty(!!file||busy);},[file,busy,onDirty]);useEffect(()=>()=>onDirty(false),[onDirty]);
  if(replacementId!==undefined)return <ReplacementCandidate context={context} replacementId={replacementId} onConfirmed={onConfirmed} disabled={disabled} onReset={onReset} />;
  return <section className={`${cardStyle} space-y-4`} aria-label="안전한 원본 교체"><h2 className="text-title font-bold">원본 교체 · 1단계 새 파일 등록</h2>
    <p className="text-body">새 원문의 처리와 추출 필드를 확인하고 별도로 확정하기 전까지 기존 연결과 공유 원본을 유지합니다. 다른 내역의 연결은 교체하지 않습니다.</p>
    <label htmlFor={`${id}-file`} className="block text-body font-bold">교체할 새 파일</label><input id={`${id}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy||disabled} className="block min-w-0 w-full text-body file:min-h-11 file:mr-2" onChange={e=>{const chosen=e.target.files?.[0];const invalid=chosen?validateFile(chosen):undefined;setError(invalid??"");setFile(invalid?undefined:chosen);}} />
    <p className="text-caption text-muted">PDF·JPEG·PNG, 20MiB 이하. PDF 50페이지, 이미지 각 축 10000px 이하. 실제 형식·손상·암호화 여부는 서버에서 검사합니다.</p>
    {error&&<p role="alert">{error}</p>}
    {busy&&<p role="status">교체 파일 요청 중… 기존 원본 연결은 유지됩니다.</p>}
    <div className="flex flex-wrap gap-2"><button className={primaryButton} disabled={busy||!file||disabled} onClick={async()=>{
      if(!file||locked.current)return;locked.current=true;setBusy(true);setError("");controller.current=new AbortController();
      try{const invalid=validateFile(file)??await validateImageDimensions(file);if(invalid){setError(invalid);return;}controller.current.signal.throwIfAborted();
        const data=await mutation.mutateAsync({type:"replace",file,version,signal:controller.current.signal});const receipt=replacementCreatedSchema.parse(data);setFile(undefined);onCreated(receipt.replacementId);
      }catch(e){setError(reviewError(e));}finally{locked.current=false;setBusy(false);}
    }}>새 원본 교체 요청</button>{busy&&<button className={secondaryButton} onClick={()=>controller.current?.abort()}>요청 대기 중단</button>}</div>
    <p className="text-caption text-muted">요청 대기 중단은 서버 처리를 취소하지 않습니다. 접수 여부를 먼저 확인한 후 재시도해 주세요.</p>
  </section>;
}
function ReplacementCandidate({context,replacementId,onConfirmed,disabled,onReset}:{context:ReviewContext;replacementId:ReplacementId;onConfirmed:(documentId:number)=>void;disabled:boolean;onReset?:()=>void}){
  const confirmLock=useRef(false);const [compareOriginal,setCompareOriginal]=useState(false);
  const q=useReplacement(context.caseId,replacementId);const mutation=useReviewAction(context);const latest=useCase(context.caseId);
  const [source,setSource]=useState<SourceDto|null>();const [originalReady,setOriginalReady]=useState(false);const [confirmVersion,setConfirmVersion]=useState<number>();const [checked,setChecked]=useState(false);const [dialog,setDialog]=useState(false);
  const [error,setError]=useState("");const [conflict,setConflict]=useState(false);
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  const data=q.data;
  if(String(data.replacementId)!==String(replacementId)||data.documentId===context.documentId)return <p role="alert">교체 요청과 새 원본 식별 정보가 일치하지 않습니다. 확정을 중단했습니다.</p>;
  const candidateId=data.documentId;
  const canConfirm=originalReady&&candidateId!==undefined&&["READ_READY","READY","REVIEW_REQUIRED"].includes(data.processingStatus??"")&&data.status==="CANDIDATE"&&data.original?.documentId===context.documentId&&data.candidate?.workplaceId===context.workplaceId&&data.fields!==undefined&&data.fields.every(f=>f.fieldId!==undefined&&f.key!==undefined&&f.label!==undefined&&f.value!==undefined&&f.status!==undefined);
  return <section className={`${cardStyle} space-y-5`} aria-label="교체 원본 확인"><h2 className="text-title font-bold">원본 교체 · 2단계 새 원문과 필드 확인</h2>
    <p className="text-body">교체 요청 #{replacementId} · 새 문서 #{data.documentId} · {data.processingStatus?statusLabels[data.processingStatus]:"후보 정보 대기"}</p>
    <p className="text-body">확정 전에는 기존 내역 연결을 유지합니다. 확정은 이 내역의 연결만 새 원본으로 바꾸고 다른 내역과 기존 원본을 보존합니다.</p>
    {q.isFetching&&isProcessing(data.processingStatus)&&<p role="status">새 원본 처리 상태 확인 중…</p>}
    <details onToggle={e=>setCompareOriginal(e.currentTarget.open)}><summary>기존 원문 비교</summary>{compareOriginal&&<OriginalViewer workplaceId={context.workplaceId} documentId={context.documentId} />}</details>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">{candidateId===undefined?<p role="status">교체 후보 원문이 아직 제공되지 않았습니다.</p>:<OriginalViewer workplaceId={context.workplaceId} documentId={candidateId} source={source} onReady={setOriginalReady} />}
      <section className="min-w-0 space-y-3" aria-label="교체 후보 추출 필드"><h3 className="text-title font-bold">새 원본의 추출 필드</h3>
        {data.fields===undefined?<p>새 필드가 아직 제공되지 않았습니다. 확인할 수 있을 때까지 확정할 수 없습니다.</p>:!data.fields.length?<p>추출 필드가 없습니다. 원문을 직접 확인해 주세요.</p>:data.fields.map((field,index)=>{const vm={valueLabel:field.value===undefined?"값 미제공":typeof field.value==="string"?field.value:JSON.stringify(field.value),statusLabel:field.status??"정보 미제공"};return <article aria-label={field.label} className="rounded-control border border-border p-4" key={field.fieldId??index}><h4 className="break-words font-bold">{field.label??field.key??"정보 미제공"}</h4><p className="break-all">{vm.valueLabel} · {vm.statusLabel}</p><p className="break-words">{field.source?.text??"근거 문구 미제공"}</p><button className={`mt-2 ${secondaryButton}`} onClick={()=>setSource(field.source??null)}>새 원문 근거 보기</button></article>;})}
      </section>
    </div>
    {data.processingStatus==="FAILED"&&<p role="alert">교체 후보 처리에 실패했습니다. 기존 연결은 유지됩니다. 후보의 별도 재처리 API는 제공되지 않아 새 파일로 교체를 다시 요청할 수 있습니다.</p>}
    {onReset&&<div className="space-y-2"><p className="text-caption text-muted">다른 파일로 다시 요청해도 현재 교체 후보의 서버 처리를 취소하거나 원본을 자동 삭제하지 않습니다.</p><button className={secondaryButton} disabled={mutation.isPending} onClick={onReset}>다른 파일로 새 교체 요청</button></div>}
    <p className="text-caption text-muted">기존 재정의는 대응하는 key/type에 한해 서버가 이관합니다. 확정 후 적용된 필드의 출처와 확인 상태를 다시 검토하세요.</p>
    <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} disabled={!canConfirm||mutation.isPending} onChange={e=>setChecked(e.target.checked)} /><span>새 원문과 추출 필드를 대조했으며 이 내역의 연결 교체를 확정합니다.</span></label>
    {error&&<p role="alert">{error}</p>}
    {conflict&&<button className={secondaryButton} disabled={q.isFetching||latest.isFetching} onClick={async()=>{const results=await Promise.all([q.refetch(),latest.refetch()]);if(results.every(r=>!r.isError)){setConflict(false);setChecked(false);setError("");}}}>최신 교체 상태와 버전 다시 확인</button>}
    <button className={primaryButton} disabled={!checked||!canConfirm||conflict||mutation.isPending||disabled||!latest.data} onClick={()=>{setConfirmVersion(latest.data?.inputVersion);setDialog(true);}}>원본 교체 확정</button>
    {dialog&&<ConfirmDialog title="이 내역의 원본 연결 교체" busy={mutation.isPending} onClose={()=>setDialog(false)} action={<button className={primaryButton} disabled={mutation.isPending||!latest.data} onClick={async()=>{
      if(confirmVersion===undefined||candidateId===undefined||confirmLock.current)return;confirmLock.current=true;
      try{await mutation.mutateAsync({type:"confirm-replacement",replacementId,version:confirmVersion});setDialog(false);onConfirmed(candidateId);}
      catch(e){setError(reviewError(e));setConflict(true);setChecked(false);setDialog(false);}finally{confirmLock.current=false;}
    }}>새 원본으로 연결 교체 확인</button>}><p>이 내역의 기존 연결을 문서 #{data.documentId}로 교체합니다. 다른 내역과 공유 원본은 유지됩니다.</p></ConfirmDialog>}
  </section>;
}
