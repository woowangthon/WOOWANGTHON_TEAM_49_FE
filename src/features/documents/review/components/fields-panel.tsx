"use client";
import { useState } from "react";
import { CaseFocusNavigation } from "@/features/cases/components/case-focus-navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { useCase } from "@/features/cases/queries";
import { useFields, useReviewAction } from "../queries";
import { updateMetaSchema } from "../schemas";
import type { ExtractedField, ReviewContext, SourceDto, UpdateMeta } from "../schemas";
import { fieldView, reviewError } from "../view-models";
import { discardChanges } from "../use-unsaved";
import { FieldEditor } from "./field-editor";
import { FieldHistory } from "./field-history";
export function FieldsPanel({actionsDisabled=false,fields,context,inputVersion,onSource,onDirty,dirty,linkedCaseIds}:{actionsDisabled?:boolean;fields:ExtractedField[];context:ReviewContext;inputVersion:number;onSource:(source:SourceDto|null)=>void;onDirty:(value:boolean)=>void;dirty:boolean;linkedCaseIds?:number[]}){
  const [editor,setEditor]=useState<{fieldId:number;scope:"case"|"shared"}>();
  const [page,setPage]=useState(1);
  const activePage=Math.min(page,Math.max(1,fields.length));
  const editingField=fields.find(f=>f.fieldId===editor?.fieldId);
  const [history,setHistory]=useState<number>();const [remove,setRemove]=useState<ExtractedField>();
  const [error,setError]=useState("");const [conflict,setConflict]=useState(false);const [receipt,setReceipt]=useState<UpdateMeta>();
  const mutation=useReviewAction(context);const latestCase=useCase(context.caseId);const latestFields=useFields(context.caseId,context.documentId);
  const perform=async(field:ExtractedField,confirmed:boolean)=>{
    if(actionsDisabled||!fieldView(field).canEdit||mutation.isPending||conflict||dirty)return;
    setError("");try{const data=await mutation.mutateAsync({type:"case-field",fieldId:field.fieldId,patch:{confirmed},version:inputVersion});setReceipt(updateMetaSchema.parse(data));}catch(e){setError(reviewError(e));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);}
  };
  const edit=(fieldId:number,scope:"case"|"shared")=>{if(dirty&&!discardChanges())return;setEditor({fieldId,scope});};
  return <section aria-label="OCR 추출 필드" className="min-w-0 space-y-4"><h2 className="text-title font-bold">추출 필드 확인·수정</h2>
    <p className="text-caption text-muted">원문과 비교해 이 값을 확인해 주세요. 값 없음은 0이 아닙니다.</p>
    <details><summary className="min-h-11 cursor-pointer py-3">검토 필요 {fields.filter(f=>f.status!=="CONFIRMED").length}개 · 상충 {fields.filter(f=>f.status==="CONFLICTED").length}개 · 전체 {fields.length}개</summary><ul className="flex flex-wrap gap-2">{fields.map((f,index)=>f.status!=="CONFIRMED"&&<li key={f.fieldId}><button className={secondaryButton} disabled={!!editor || dirty || mutation.isPending} onClick={()=>{setEditor(undefined);setHistory(undefined);setPage(index+1);requestAnimationFrame(()=>document.getElementById(`review-field-${f.fieldId}`)?.focus());}}>{f.label} · {fieldView(f).statusLabel}</button></li>)}</ul></details>
    {!fields.length&&<p className="text-body">추출된 필드가 없습니다. 원문과 문서 검토 상태를 확인해 주세요.</p>}
    {error&&<p role="alert" tabIndex={-1}>{error}</p>}
    {conflict&&<button className={secondaryButton} onClick={async()=>{const result=await Promise.all([latestCase.refetch(),latestFields.refetch()]);if(result.every(v=>!v.isError)){setConflict(false);setError("");}}}>최신 필드와 버전 확인</button>}
    {receipt&&<p role="status" className="break-words text-body">저장했습니다. 서버가 반환한 영향 내역: {(receipt.affectedCaseIds??receipt.caseUpdates?.map(u=>u.caseId))?.map(c=>`#${c}`).join(", ")??"미제공"}{receipt.caseUpdates?.length?` · 갱신 버전 ${receipt.caseUpdates.map(u=>`#${u.caseId}: ${u.inputVersion}`).join(", ")}`:""}</p>}
    {fields.slice(activePage-1,activePage).map(field=>{const vm=fieldView(field);return <article id={`review-field-${field.fieldId}`} tabIndex={-1} aria-label={field.label} key={field.fieldId} className="min-w-0 space-y-2 border-b border-border py-4">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="break-words text-body font-bold">{field.label}</h3><span className="text-caption">{vm.statusLabel}</span></div>
      <p className="break-all text-body font-bold">{vm.valueLabel}{field.value!==null&&<span className="ml-2 text-caption font-normal">{vm.unitLabel}</span>}</p>
      <p className="text-caption text-muted">{vm.scopeLabel}</p>
      {field.status==="DEFERRED"&&<p>보류된 값입니다. 원문을 검토한 뒤 수정하거나 명시적으로 확인해 주세요.</p>}
      {field.status==="NEEDS_RECONFIRMATION"&&<p>재확인이 필요한 값입니다. 최신 원문과 값을 대조한 뒤 확인해 주세요.</p>}
      <div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={()=>onSource(field.source)}>원문 근거 보기</button>
        {field.status!=="CONFIRMED"&&<button className={primaryButton} disabled={actionsDisabled||!vm.canEdit||field.value===null||mutation.isPending||conflict||dirty} onClick={()=>{void perform(field,true);}}>값만 확인</button>}

        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending} onClick={()=>edit(field.fieldId,"case")}>이 내역 값 수정</button>
        <details className="w-full"><summary className="cursor-pointer text-caption font-bold">근거·이력·공유 설정</summary>      <p className="text-caption">적용값 출처: {vm.scopeLabel} · {field.editedByUser?"사용자가 수정함":"사용자 수정 없음"}</p><p className="text-caption">{vm.confirmedLabel}</p>
      <p className="break-words text-caption">근거: {field.source?`문서 #${field.source.documentId} · `:""}{field.source?.page?`${field.source.page}페이지`:"페이지 미제공"} · {field.source?.text??"근거 문구 미제공"}</p>
{field.status==="CONFIRMED"&&<div>        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||conflict||dirty} onClick={()=>{void perform(field,false);}}>미확인으로 표시</button></div>}<div className="flex flex-wrap gap-2">
        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending} onClick={()=>edit(field.fieldId,"shared")}>공유 기본값 수정</button>
        {field.hasCaseOverride&&<button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||dirty} onClick={()=>setRemove(field)}>재정의 제거</button>}
        <button className={secondaryButton} onClick={()=>setHistory(history===field.fieldId?undefined:field.fieldId)}>{history===field.fieldId?"이력 닫기":"수정 이력"}</button>
        </div></details>
      </div>

    </article>;})}
    {history!==undefined&&<FieldHistory caseId={context.caseId} documentId={context.documentId} fieldId={history} />}
    {editor && <p className="text-caption text-muted">편집을 저장하거나 닫은 뒤 다음 필드를 확인해 주세요.</p>}
    <CaseFocusNavigation label="필드" index={activePage-1} count={fields.length} onChange={index=>{setPage(index+1);setEditor(undefined);setHistory(undefined);}} busy={!!editor || dirty || mutation.isPending} />
    {!actionsDisabled&&editor&&editingField&&fieldView(editingField).canEdit&&<section aria-label="선택 필드 편집"><h3 className="font-bold">{editingField.label} 편집 중</h3><FieldEditor key={`${editingField.fieldId}-${editor.scope}`} field={editingField} scope={editor.scope} context={context} version={inputVersion} onClose={()=>setEditor(undefined)} onDirty={onDirty} onSaved={setReceipt} linkedCaseIds={linkedCaseIds} /></section>}
    {remove&&<ConfirmDialog title="공유 기본값으로 복귀" busy={mutation.isPending} onClose={()=>setRemove(undefined)} action={<button className={primaryButton} disabled={actionsDisabled||mutation.isPending||conflict} onClick={async()=>{try{const result=await mutation.mutateAsync({type:"remove-override",fieldId:remove.fieldId,version:inputVersion});setReceipt(updateMetaSchema.parse(result));setRemove(undefined);}catch(e){setError(reviewError(e));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);setRemove(undefined);}}}>재정의 제거 확인</button>}><p>이 내역의 ‘{remove.label}’ 재정의를 제거하고 공유 기본값을 다시 적용합니다. 다른 내역의 재정의는 변경하지 않습니다.</p></ConfirmDialog>}
  </section>;
}
