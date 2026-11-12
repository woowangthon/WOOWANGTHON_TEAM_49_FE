"use client";
import { useState } from "react";
import { ArrowUpRight, Check, ChevronDown, CircleAlert, ScanText } from "lucide-react";
import type { DocumentDto } from "../../schemas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { useCase } from "@/features/cases/queries";
import { useFields, useReviewAction } from "../queries";
import { updateMetaSchema } from "../schemas";
import type { ExtractedField, ReviewContext, SourceDto, UpdateMeta } from "../schemas";
import { fieldView, reviewError } from "../view-models";
import { groupReviewFields, isExtractionMissing } from "../field-groups";
import { discardChanges } from "../use-unsaved";
import { FieldEditor } from "./field-editor";
import { FieldHistory } from "./field-history";
import styles from "./review-screen.module.css";
export function FieldsPanel({actionsDisabled=false,fields,context,inputVersion,onSource,onDirty,dirty,linkedCaseIds,documentType="PAYSLIP",period}:{actionsDisabled?:boolean;fields:ExtractedField[];context:ReviewContext;inputVersion:number;onSource:(source:SourceDto|null)=>void;onDirty:(value:boolean)=>void;dirty:boolean;linkedCaseIds?:number[];documentType?:DocumentDto["documentType"];period?:{start:string;end:string}}){
  const [editor,setEditor]=useState<{fieldId:number;scope:"case"|"shared"}>();
  const [detailsOpen,setDetailsOpen]=useState(false);
  const {essential,details}=groupReviewFields(fields,documentType);
  const countConfirmed=(items:ExtractedField[])=>items.filter(field=>field.status==="CONFIRMED").length;
  const detailsRemaining=details.length-countConfirmed(details);
  const missing=fields.filter(isExtractionMissing);
  const [history,setHistory]=useState<number>();const [remove,setRemove]=useState<ExtractedField>();
  const [error,setError]=useState("");const [conflict,setConflict]=useState(false);const [receipt,setReceipt]=useState<UpdateMeta>();
  const mutation=useReviewAction(context);const latestCase=useCase(context.caseId);const latestFields=useFields(context.caseId,context.documentId);
  const perform=async(field:ExtractedField,confirmed:boolean)=>{
    if(actionsDisabled||!fieldView(field).canEdit||mutation.isPending||conflict||dirty)return;
    setError("");try{const data=await mutation.mutateAsync({type:"case-field",fieldId:field.fieldId,patch:{confirmed},version:inputVersion});setReceipt(updateMetaSchema.parse(data));}catch(e){setError(reviewError(e));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);}
  };
  const edit=(fieldId:number,scope:"case"|"shared")=>{if(dirty&&!discardChanges())return;setEditor({fieldId,scope});};
  const renderField=(field:ExtractedField)=>{const vm=fieldView(field);const absent=isExtractionMissing(field);return <article id={`review-field-${field.fieldId}`} tabIndex={-1} aria-label={field.label} key={field.fieldId} data-review-field data-missing={absent} data-confirmed={field.status==="CONFIRMED"} className={styles.field}>
      <div className={styles.fieldHeading}><h3>{field.label}</h3><span className={absent?styles.missingBadge:field.status==="CONFIRMED"?styles.confirmedBadge:field.status==="CONFLICTED"?styles.missingBadge:styles.requiredBadge}>{absent?<><CircleAlert size={13} aria-hidden="true" />추출 안 된 값</>:field.status==="CONFIRMED"?<><Check size={13} aria-hidden="true" />{vm.statusLabel}</>:field.status==="CONFLICTED"?"값 상충":"필수 확인"}</span></div>
      <p data-review-value className={styles.fieldValue}>{vm.valueLabel}{field.value!==null&&vm.unitLabel&&<span>{vm.unitLabel}</span>}</p>
      {absent&&<p className={styles.missingHint}>{vm.statusLabel} · {field.status==="UNREADABLE"?"문서의 글자를 읽지 못했어요.":"문서에서 값을 가져오지 못했어요."} 원문을 보고 직접 입력해 주세요.</p>}
      {(field.status==="DEFERRED"||field.status==="NEEDS_RECONFIRMATION")&&<p className={styles.missingHint}>{vm.statusLabel} · 최신 원문과 값을 대조한 뒤 수정하거나 명시적으로 확인해 주세요.</p>}
      {field.status==="CONFLICTED"&&<p className={styles.missingHint}>서로 다른 값이 있어요. 원문과 비교해 적용할 값을 수정해 주세요.</p>}
      <div className={styles.fieldActions}>
        {field.status!=="CONFIRMED"&&<button className={`${primaryButton} ${styles.confirmValue}`} disabled={actionsDisabled||!vm.canEdit||absent||mutation.isPending||conflict||dirty||!!editor} onClick={()=>{void perform(field,true);}}><Check size={15} aria-hidden="true" />값만 확인</button>}

        <button aria-label="이 내역 값 수정" className={`${secondaryButton} ${absent?styles.enterValue:styles.editValue}`} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||(!!editor&&editor.fieldId!==field.fieldId)} onClick={()=>edit(field.fieldId,"case")}>값 수정</button>
        <button className={styles.sourceButton} onClick={()=>onSource(field.source)}>원문 근거 보기<ArrowUpRight size={14} aria-hidden="true" /></button>
      </div>
        <details className={styles.fieldMore}><summary>근거·이력·공유 설정<ChevronDown size={14} aria-hidden="true" /></summary><div className="space-y-2 pt-3"><p className="text-caption">적용값 출처: {vm.scopeLabel} · {field.editedByUser?"사용자가 수정함":"사용자 수정 없음"}</p><p className="text-caption">{vm.confirmedLabel}</p>
      <p className="break-words text-caption">근거: {field.source?`문서 #${field.source.documentId} · `:""}{field.source?.page?`${field.source.page}페이지`:"페이지 미제공"} · {field.source?.text??"근거 문구 미제공"}</p>
{field.status==="CONFIRMED"&&<div>        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||conflict||dirty} onClick={()=>{void perform(field,false);}}>미확인으로 표시</button></div>}<div className="flex flex-wrap gap-2">
        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||(!!editor&&editor.fieldId!==field.fieldId)} onClick={()=>edit(field.fieldId,"shared")}>공유 기본값 수정</button>
        {field.hasCaseOverride&&<button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||dirty} onClick={()=>setRemove(field)}>재정의 제거</button>}
        <button className={secondaryButton} onClick={()=>setHistory(history===field.fieldId?undefined:field.fieldId)}>{history===field.fieldId?"이력 닫기":"수정 이력"}</button>
        </div></div></details>
      {history===field.fieldId&&<FieldHistory caseId={context.caseId} documentId={context.documentId} fieldId={field.fieldId} />}
      {!actionsDisabled&&vm.canEdit&&editor?.fieldId===field.fieldId&&<section aria-label="선택 필드 편집"><h3 className="font-bold">{field.label} 편집 중</h3><FieldEditor key={`${field.fieldId}-${editor.scope}`} field={field} scope={editor.scope} context={context} version={inputVersion} onClose={()=>setEditor(undefined)} onDirty={onDirty} onSaved={setReceipt} linkedCaseIds={linkedCaseIds} /></section>}
    </article>;};
  return <section aria-label="OCR 추출 필드" className={styles.fieldsPanel} data-review-groups>
    <header className={styles.panelHeading}><span className={styles.panelIcon}><ScanText size={21} aria-hidden="true" /></span><div><h2>핵심 내용</h2><p>원문과 같은지 확인해 주세요.</p></div></header>
    <div className={styles.progressArea}><p role="status">전체 {fields.length}개 중 <strong>{countConfirmed(fields)}개 확인 완료</strong></p><progress aria-label="전체 필드 확인 진행률" value={countConfirmed(fields)} max={Math.max(1,fields.length)} />
      {missing.length>0&&<button className={styles.missingShortcut} onClick={()=>{const target=document.getElementById(`review-field-${missing[0].fieldId}`);target?.scrollIntoView?.({block:"center"});target?.focus({preventScroll:true});}}><CircleAlert size={15} aria-hidden="true" /><span>추출 안 된 값 <strong>{missing.length}개</strong></span><ArrowUpRight size={15} aria-hidden="true" /></button>}
    </div>
    {error&&<p role="alert" tabIndex={-1}>{error}</p>}
    {conflict&&<button className={secondaryButton} onClick={async()=>{const result=await Promise.all([latestCase.refetch(),latestFields.refetch()]);if(result.every(v=>!v.isError)){setConflict(false);setError("");}}}>최신 필드와 버전 확인</button>}
    {receipt&&<p role="status" className="break-words text-body">저장했습니다.{(receipt.affectedCaseIds?.length??receipt.caseUpdates?.length??0)>1?" 연결된 다른 사례에도 반영되었습니다.":""}</p>}
    <section aria-label="필수 확인" className={styles.essential}>
      <div className={styles.groupHeading}><h3>필수 확인</h3><span>{countConfirmed(essential)} / {essential.length} 확인</span></div>
      {period&&<div className={styles.period}><p>검토 대상 기간</p><p><strong>{period.start} ~ {period.end}</strong></p><p>사례에 설정한 기간이에요. 문서의 적용 기간과 비교해 주세요.</p></div>}
      {!essential.length&&<p className="py-4 text-body">핵심 항목이 추출되지 않았습니다. 세부 항목과 원문을 확인해 주세요.</p>}
      {essential.map(renderField)}
    </section>
    <section className={styles.details}>
      <button id="review-details-toggle" className={styles.detailsToggle} aria-expanded={detailsOpen} aria-controls="review-detail-fields" disabled={!!editor&&details.some(field=>field.fieldId===editor.fieldId)} onClick={()=>setDetailsOpen(!detailsOpen)}>
        <span><span className="block font-bold">세부 항목 확인 <span className="font-normal">{details.length}개</span></span><span className="mt-1 block text-caption text-muted">{detailsRemaining?`아직 확인하지 않은 항목 ${detailsRemaining}개` : details.length?"세부 항목을 모두 확인했어요":"추출된 세부 항목이 없어요"}</span></span><ChevronDown size={18} aria-hidden="true" className={detailsOpen?styles.chevronOpen:undefined} />
      </button>
      <div id="review-detail-fields" role="region" aria-label="세부 항목 확인" hidden={!detailsOpen} className="review-details-body">
        <p className="text-caption text-muted">수당·공제 내역 등 세부 값이에요. 문서 전체 검토 상태에는 이 항목도 포함돼요.</p>
        {!details.length&&<p className="py-4 text-body">추출된 세부 항목이 없습니다.</p>}
        {details.map(renderField)}
      </div>
      {!!editor&&details.some(field=>field.fieldId===editor.fieldId)&&<p className="px-4 pb-4 text-caption text-muted">편집을 저장하거나 닫으면 세부 항목을 접을 수 있어요.</p>}
    </section>
    <p className={styles.footnote}>값이 없거나 읽을 수 없는 항목은 0원으로 처리하지 않아요.</p>
    {remove&&<ConfirmDialog title="공유 기본값으로 복귀" busy={mutation.isPending} onClose={()=>setRemove(undefined)} action={<button className={primaryButton} disabled={actionsDisabled||mutation.isPending||conflict} onClick={async()=>{try{const result=await mutation.mutateAsync({type:"remove-override",fieldId:remove.fieldId,version:inputVersion});setReceipt(updateMetaSchema.parse(result));setRemove(undefined);}catch(e){setError(reviewError(e));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);setRemove(undefined);}}}>재정의 제거 확인</button>}><p>이 사례의 ‘{remove.label}’ 재정의를 제거하고 공유 기본값을 다시 적용합니다. 다른 사례의 재정의는 변경하지 않습니다.</p></ConfirmDialog>}
  </section>;
}
