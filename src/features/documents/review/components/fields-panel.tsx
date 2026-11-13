"use client";
import {useMessageState} from '@/i18n/use-message-state';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, CircleAlert, ScanText } from "lucide-react";
import type { DocumentDto } from "../../schemas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { useCase } from "@/features/cases/queries";
import { useFields, useReview, useReviewAction } from "../queries";
import { updateMetaSchema } from "../schemas";
import type { ExtractedField, FieldPatch, ReviewResolution, ReviewContext, SourceDto, UpdateMeta } from "../schemas";

import { groupReviewFields, hasMissingFieldValue, isExtractionMissing } from "../field-groups";
import { discardChanges } from "../use-unsaved";
import { FieldEditor } from "./field-editor";
import { FieldHistory } from "./field-history";
import styles from "./review-screen.module.css";
const reasonKeys={REQUIRED:"documents.reviewPolicy_reason_REQUIRED",MISSING:"documents.reviewPolicy_reason_MISSING",UNREADABLE:"documents.reviewPolicy_reason_UNREADABLE",CONFLICTED:"documents.reviewPolicy_reason_CONFLICTED",RECONFIRMATION:"documents.reviewPolicy_reason_RECONFIRMATION"} as const;
const resolutionKeys={NONE:"documents.reviewPolicy_NONE",NOT_IN_DOCUMENT:"documents.reviewPolicy_NOT_IN_DOCUMENT",UNKNOWN:"documents.reviewPolicy_UNKNOWN"} as const;
export function FieldsPanel({actionsDisabled=false,fields,context,inputVersion,onSource,onDirty,dirty,linkedCaseIds,documentType="PAYSLIP",period}:{actionsDisabled?:boolean;fields:ExtractedField[];context:ReviewContext;inputVersion:number;onSource:(source:SourceDto|null)=>void;onDirty:(value:boolean)=>void;dirty:boolean;linkedCaseIds?:number[];documentType?:DocumentDto["documentType"];period?:{start:string;end:string}}){
const {fieldView, reviewError} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate} = useTranslation();

  const fieldList=useRef<HTMLDivElement>(null);
  const [editor,setEditor]=useState<{fieldId:number;scope:"case"|"shared"}>();
  const [detailsOpen,setDetailsOpen]=useState(false);
  const {essential,details}=groupReviewFields(fields,documentType);
  const countConfirmed=(items:ExtractedField[])=>items.filter(field=>field.status==="CONFIRMED").length;
  const detailsRemaining=details.length-countConfirmed(details);
  const missing=essential.filter(field=>isExtractionMissing(field)&&!field.reviewResolved);
  const summary=useReview(context.caseId,context.documentId).data;
  const resolved=summary?.resolvedRequiredCount??countConfirmed(essential);
  const required=summary?.requiredReviewCount??essential.length;
  const [resolution,setResolution]=useState<{field:ExtractedField;value:ReviewResolution}>();
  const [history,setHistory]=useState<number>();const [remove,setRemove]=useState<ExtractedField>();
  const [error,setError]=useMessageState("");const [conflict,setConflict]=useState(false);const [receipt,setReceipt]=useState<UpdateMeta>();
  const mutation=useReviewAction(context);const latestCase=useCase(context.caseId);const latestFields=useFields(context.caseId,context.documentId);
  const perform=async(field:ExtractedField,patch:FieldPatch)=>{
    if(actionsDisabled||!fieldView(field).canEdit||mutation.isPending||conflict||dirty)return;
    setError("");try{const data=await mutation.mutateAsync({type:"case-field",fieldId:field.fieldId,patch,version:inputVersion});setReceipt(updateMetaSchema.parse(data));}catch(e){setError(reviewError(e, true));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);}
  };
  const edit=(fieldId:number,scope:"case"|"shared")=>{if(dirty&&!discardChanges(translate))return;setEditor({fieldId,scope});};
  const renderField=(field:ExtractedField)=>{const vm=fieldView(field);const absent=hasMissingFieldValue(field);return <article id={`review-field-${field.fieldId}`} tabIndex={-1} aria-label={field.label} key={field.fieldId} data-review-field data-missing={absent} data-confirmed={field.status==="CONFIRMED"} className={styles.field}>
      <div className={styles.fieldHeading}><h3>{field.label}</h3><span className={absent?styles.missingBadge:field.status==="CONFIRMED"?styles.confirmedBadge:field.status==="CONFLICTED"?styles.missingBadge:styles.requiredBadge}>{absent?<><CircleAlert size={13} aria-hidden="true" />{translate("documents.fieldsPanel_extraction")}</>:field.status==="CONFIRMED"?<><Check size={13} aria-hidden="true" />{vm.statusLabel}</>:field.status==="CONFLICTED"?translate("documents.fieldsPanel_span2"):field.requiresUserReview===false?vm.statusLabel:translate("documents.fieldsPanel_count_confirm")}</span></div>
      {field.reviewReason&&<p className="text-caption">{translate(reasonKeys[field.reviewReason])}</p>}
      {field.analysisValueOrigin==="SYSTEM_EXTRACTED_UNVERIFIED"&&<p className="text-caption text-muted">{translate("documents.reviewPolicy_automatic")}</p>}
      {field.reviewResolution&&field.reviewResolution!=="NONE"&&<p role="status">{translate(resolutionKeys[field.reviewResolution])}</p>}
      {!absent&&<p data-review-value className={styles.fieldValue}>{vm.valueLabel}{field.value!==null&&vm.unitLabel&&<span>{vm.unitLabel}</span>}</p>}
      {absent&&<p className={styles.missingHint}>{translate("documents.fieldsPanel_original_input")}</p>}
      {(field.status==="DEFERRED"||field.status==="NEEDS_RECONFIRMATION")&&<p className={styles.missingHint}>{translate("documents.fieldsPanel_current_original_comparison_edit_confirm", { value1: vm.statusLabel })}</p>}
      {field.status==="CONFLICTED"&&<p className={styles.missingHint}>{translate("documents.fieldsPanel_original_comparison_applicable_edit")}</p>}
      <div className={styles.fieldActions}>
        {field.status!=="CONFIRMED"&&<button className={`${primaryButton} ${styles.confirmValue}`} disabled={actionsDisabled||!vm.canEdit||isExtractionMissing(field)||mutation.isPending||conflict||dirty||!!editor} onClick={()=>{void perform(field,{confirmed:true});}}><Check size={15} aria-hidden="true" />{translate("documents.fieldsPanel_confirm")}</button>}

        {field.reviewResolution!==undefined&&field.value===null&&["MISSING","UNREADABLE"].includes(field.reviewReason??"")&&field.status!=="CONFLICTED"&&field.status!=="NEEDS_RECONFIRMATION"&&(["NOT_IN_DOCUMENT","UNKNOWN","NONE"] as const).filter(value=>value==="NONE"?field.reviewResolution!=="NONE":field.reviewResolution==="NONE").map(value=><button key={value} className={secondaryButton} disabled={actionsDisabled||mutation.isPending||conflict||dirty||!!editor} onClick={()=>setResolution({field,value})}>{translate(resolutionKeys[value])}</button>)}
        <button aria-label={translate("documents.fieldsPanel_case_edit")} className={`${secondaryButton} ${absent?styles.enterValue:styles.editValue}`} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||(!!editor&&editor.fieldId!==field.fieldId)} onClick={()=>edit(field.fieldId,"case")}>{translate("documents.fieldsPanel_edit")}</button>
        <button className={styles.sourceButton} onClick={()=>onSource(field.source)}>{translate("documents.fieldsPanel_original_evidence")}<ArrowUpRight size={14} aria-hidden="true" /></button>
      </div>
        <details className={styles.fieldMore}><summary>{translate("documents.fieldsPanel_evidence_history_settings")}<ChevronDown size={14} aria-hidden="true" /></summary><div className="space-y-2 pt-3"><p className="text-caption">{translate("documents.fieldsPanel_applicable_source", { value1: vm.scopeLabel, value2: field.editedByUser?translate("documents.fieldsPanel_user_edit"):translate("documents.fieldsPanel_user_edit_none") })}</p><p className="text-caption">{vm.confirmedLabel}</p>
      <p className="break-words text-caption">{translate("documents.fieldsPanel_evidence", { value1: field.source?translate("documents.fieldsPanel_document", { value1: field.source.documentId }):"", value2: field.source?.page?translate("documents.fieldsPanel_page", { value1: field.source.page }):translate("documents.fieldsPanel_page_notProvided"), value3: field.source?.text??translate("documents.replacementPanel_evidence_notProvided") })}</p>
{field.status==="CONFIRMED"&&<div>        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||conflict||dirty} onClick={()=>{void perform(field,{confirmed:false});}}>{translate("documents.fieldsPanel_confirm_2")}</button></div>}<div className="flex flex-wrap gap-2">
        <button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||(!!editor&&editor.fieldId!==field.fieldId)} onClick={()=>edit(field.fieldId,"shared")}>{translate("documents.fieldsPanel_sharedDefault_edit")}</button>
        {field.hasCaseOverride&&<button className={secondaryButton} disabled={actionsDisabled||!vm.canEdit||mutation.isPending||dirty} onClick={()=>setRemove(field)}>{translate("documents.fieldsPanel_override")}</button>}
        <button className={secondaryButton} onClick={()=>setHistory(history===field.fieldId?undefined:field.fieldId)}>{history===field.fieldId?translate("documents.fieldsPanel_history_close"):translate("documents.fieldHistory_editHistory")}</button>
        </div></div></details>
      {history===field.fieldId&&<FieldHistory caseId={context.caseId} documentId={context.documentId} fieldId={field.fieldId} />}
      {!actionsDisabled&&vm.canEdit&&editor?.fieldId===field.fieldId&&<section aria-label={translate("documents.fieldsPanel_select_field")}><FieldEditor key={`${field.fieldId}-${editor.scope}`} field={field} scope={editor.scope} context={context} version={inputVersion} onClose={()=>setEditor(undefined)} onDirty={onDirty} onSaved={setReceipt} linkedCaseIds={linkedCaseIds} /></section>}
    </article>;};
  return <section data-ui="documents-fieldsPanel_ariaLabel_section2" aria-label={translate("documents.fieldsPanel_extraction_field")} className={styles.fieldsPanel} data-review-groups>
    <header className={styles.panelHeading}><span className={styles.panelIcon}><ScanText size={21} aria-hidden="true" /></span><div><h2>{translate("documents.fieldsPanel_content")}</h2><p>{translate("documents.fieldsPanel_original_confirm")}</p></div></header>
    <div className={styles.progressArea}><p role="status">{translate("documents.reviewPolicy_progress",{value1:resolved,value2:required})}</p><progress aria-label={translate("documents.reviewPolicy_progressLabel")} value={resolved} max={Math.max(1,required)} />
      {missing.length>0&&<button className={styles.missingShortcut} onClick={()=>{const target=document.getElementById(`review-field-${missing[0].fieldId}`);const list=fieldList.current;
        if(target&&list&&list.scrollHeight>list.clientHeight){const rect=target.getBoundingClientRect();const bounds=list.getBoundingClientRect();list.scrollTo({top:list.scrollTop+rect.top-bounds.top-(list.clientHeight-rect.height)/2});}
        else target?.scrollIntoView?.({block:"center"});target?.focus({preventScroll:true});}}><CircleAlert size={15} aria-hidden="true" /><span>{translate("documents.fieldsPanel_extraction_2")}<strong>{translate("documents.documentList_h23", { value1: missing.length })}</strong></span><ArrowUpRight size={15} aria-hidden="true" /></button>}
    </div>
    <div ref={fieldList} className={styles.fieldList} role="region" aria-label={translate("documents.fieldsPanel_content_field_list")} tabIndex={0}>
    {error&&<p role="alert" tabIndex={-1}>{error}</p>}
    {conflict&&<button className={secondaryButton} onClick={async()=>{const result=await Promise.all([latestCase.refetch(),latestFields.refetch()]);if(result.every(v=>!v.isError)){setConflict(false);setError("");}}}>{translate("documents.fieldsPanel_current_field_version_confirm")}</button>}
    {receipt&&<p role="status" className="break-words text-body">{translate("documents.fieldsPanel_save", { value1: (receipt.affectedCaseIds?.length??receipt.caseUpdates?.length??0)>1?translate("documents.fieldsPanel_link"):"" })}</p>}
    <section aria-label={translate("documents.fieldsPanel_count_confirm")} className={styles.essential}>
      <div className={styles.groupHeading}><h3>{translate("documents.fieldsPanel_count_confirm")}</h3><span>{translate("documents.fieldsPanel_confirm_3", { value1: resolved, value2: required })}</span></div>
      {period&&<div className={styles.period}><p>{translate("documents.fieldsPanel_review_period")}</p><p><strong>{period.start} ~ {period.end}</strong></p><p>{translate("documents.fieldsPanel_settings_period_document_applicable_comparison")}</p></div>}
      {!essential.length&&<p className="py-4 text-body">{translate("documents.fieldsPanel_item_extraction_original_confirm")}</p>}
      {essential.map(renderField)}
    </section>
    <section className={styles.details}>
      <button id="review-details-toggle" className={styles.detailsToggle} aria-expanded={detailsOpen} aria-controls="review-detail-fields" disabled={!!editor&&details.some(field=>field.fieldId===editor.fieldId)} onClick={()=>setDetailsOpen(!detailsOpen)}>
        <span><span className="block font-bold">{translate("documents.fieldsPanel_item_confirm")}<span className="font-normal">{translate("documents.documentList_h23", { value1: details.length })}</span></span><span className="mt-1 block text-caption text-muted">{detailsRemaining?translate("documents.fieldsPanel_confirm_item", { value1: detailsRemaining }) : details.length?translate("documents.fieldsPanel_item_confirm_2"):translate("documents.fieldsPanel_extraction_item_empty")}</span></span><ChevronDown size={18} aria-hidden="true" className={detailsOpen?styles.chevronOpen:undefined} />
      </button>
      <div id="review-detail-fields" role="region" aria-label={translate("documents.fieldsPanel_item_confirm_3")} hidden={!detailsOpen} className="review-details-body">
        <p className="text-caption text-muted">{translate("documents.fieldsPanel_allowance_deduction_case_document_all_review_status")}</p>
        {!details.length&&<p className="py-4 text-body">{translate("documents.fieldsPanel_extraction_item_empty_2")}</p>}
        {details.map(renderField)}
      </div>
      {!!editor&&details.some(field=>field.fieldId===editor.fieldId)&&<p className="px-4 pb-4 text-caption text-muted">{translate("documents.fieldsPanel_save_item_count")}</p>}
    </section>
    <p className={styles.footnote}>{translate("documents.fieldsPanel_none_count_item_processing")}</p>
    </div>
    {resolution&&<ConfirmDialog title={translate(resolutionKeys[resolution.value])} busy={mutation.isPending} onClose={()=>setResolution(undefined)} action={<button className={primaryButton} disabled={mutation.isPending||actionsDisabled||conflict} onClick={async()=>{await perform(resolution.field,{reviewResolution:resolution.value});setResolution(undefined);}}>{translate(resolutionKeys[resolution.value])}</button>}><p>{resolution.field.label}</p><p>{translate("documents.reviewPolicy_resolutionHelp")}</p></ConfirmDialog>}
    {remove&&<ConfirmDialog title={translate("documents.fieldsPanel_sharedDefault")} busy={mutation.isPending} onClose={()=>setRemove(undefined)} action={<button className={primaryButton} disabled={actionsDisabled||mutation.isPending||conflict} onClick={async()=>{try{const result=await mutation.mutateAsync({type:"remove-override",fieldId:remove.fieldId,version:inputVersion});setReceipt(updateMetaSchema.parse(result));setRemove(undefined);}catch(e){setError(reviewError(e, true));if(e instanceof ApiError&&e.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);setRemove(undefined);}}}>{translate("documents.fieldsPanel_override_confirm")}</button>}><p>{translate("documents.fieldsPanel_override_sharedDefault_retry_applicable_change", { value1: remove.label })}</p></ConfirmDialog>}
  </section>;
}
