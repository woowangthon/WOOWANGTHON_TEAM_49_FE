"use client";
import { translate } from "@/i18n/translate";

import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { useCase } from "@/features/cases/queries";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { ApiError } from "@/lib/api/error";
import { useReviewAction, useFields } from "../queries";
import { updateMetaSchema, valueSchema } from "../schemas";
import type { ExtractedField, FieldPatch, ReviewContext, UpdateMeta } from "../schemas";
import { fieldEditorView, parseFieldValue, reviewError } from "../view-models";
const editorSchema=z.object({text:z.string(),scalar:z.enum(["string","number","boolean"])});
type EditorValues=z.infer<typeof editorSchema>;
function defaults(field:ExtractedField,unknownShared=false):EditorValues {
  return fieldEditorView(field,unknownShared);
}
export function FieldEditor({field,scope,context,version,onClose,onDirty,onSaved,linkedCaseIds}:{field:ExtractedField;scope:"case"|"shared";context:ReviewContext;version:number;onClose:()=>void;onDirty:(dirty:boolean)=>void;onSaved:(meta:UpdateMeta)=>void;linkedCaseIds?:number[]}){
  const id=useId();const mutation=useReviewAction(context);const latestCase=useCase(context.caseId);const latestFields=useFields(context.caseId,context.documentId);
  const [baseVersion,setBaseVersion]=useState(version);const [conflict,setConflict]=useState(false);
  const [prepared,setPrepared]=useState<FieldPatch>();const locked=useRef(false);
  const form=useForm<EditorValues>({resolver:zodResolver(editorSchema),defaultValues:defaults(field,scope==="shared"&&field.hasCaseOverride)});
  const {register,handleSubmit,setError,setFocus,reset,formState:{errors,isSubmitting,isDirty}}=form;
  const scalar=useWatch({control:form.control,name:"scalar"});
  const structured=fieldEditorView(field).kind==="structured";
  const busy=isSubmitting||mutation.isPending;
  const summary=useFormErrorFocus(errors,busy,setFocus,["text","scalar"]);
  useEffect(()=>{onDirty(isDirty||!!prepared);},[isDirty,prepared,onDirty]);
  useEffect(()=>()=>onDirty(false),[onDirty]);
  const save=async(patch:FieldPatch)=>{
    if(locked.current)return;locked.current=true;
    try{const result=await mutation.mutateAsync(scope==="shared"?{type:"shared-field",fieldId:field.fieldId,patch}:{type:"case-field",fieldId:field.fieldId,patch,version:baseVersion});onSaved(updateMetaSchema.parse(result));onClose();}
    catch(error){
      if(error instanceof ApiError&&error.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);
      if(error instanceof ApiError&&error.status===422){for(const item of error.fieldErrors){const name=item.field.split(".").at(-1);if(name==="value")setError("text",{message:item.reason});}}
      setError("root.server",{message:reviewError(error)});setPrepared(undefined);
    }finally{locked.current=false;}
  };
  return <form aria-label={translate("documents.fieldEditor_ariaLabel_form", { value1: scope==="case"?translate("documents.fieldEditor_case_override"):translate("documents.fieldEditor_sharedDefault") })} className="mt-4 min-w-0 space-y-4 rounded-control border border-border p-4" onSubmit={event=>{void handleSubmit(async values=>{
    if(conflict||locked.current)return;
    let value;try{value=structured?valueSchema.parse(JSON.parse(values.text)):parseFieldValue(field,values.text,false,values.scalar);}catch(error){setError("text",{message:error instanceof Error?error.message:translate("documents.fieldEditor_confirm")});return;}
    const patch:FieldPatch={value};
    if(scope==="shared")setPrepared(patch);else await save(patch);
  })(event);}}>
    {scope==="shared"&&<h4 className="text-body font-bold">{translate("documents.fieldEditor_workplace_sharedDefault")}</h4>}
    {scope==="shared"&&<p className="text-caption text-muted">{translate("documents.fieldEditor_override_none_link_case_impact_count_change")}</p>}
    {scope==="shared"&&field.hasCaseOverride&&<p className="text-caption">{translate("documents.fieldEditor_current_case_override_sharedDefault_new_input")}</p>}
    {field.value===null&&field.valueType!=="MONEY_KRW"&&<SelectField label={translate("documents.fieldEditor_input_format")} id={`${id}-scalar`} {...register("scalar")}><option value="string">{translate("documents.fieldEditor_message")}</option><option value="number">{translate("documents.fieldEditor_message2")}</option><option value="boolean">{translate("documents.fieldEditor_message3")}</option></SelectField>}
    {structured?<div><label htmlFor={`${id}-json`}>{translate("documents.fieldEditor_div")}</label><textarea id={`${id}-json`} className="min-h-48 w-full min-w-0 rounded-control border p-3 font-mono" disabled={busy} aria-invalid={!!errors.text} aria-describedby={errors.text?`${id}-json-error`:undefined} {...register("text")} /><p>{translate("documents.fieldEditor_save")}</p>{errors.text&&<p id={`${id}-json-error`} role="alert">{translate("documents.fieldEditor_valid_input")}</p>}</div>:scalar==="boolean"?<SelectField id={`${id}-value`} label={translate("documents.fieldEditor_edit")} disabled={busy} error={errors.text?.message} {...register("text")}><option value="">{translate("documents.fieldEditor_select")}</option><option value="true">{translate("common.yes")}</option><option value="false">{translate("common.no")}</option></SelectField>:<TextField id={`${id}-value`} label={translate("documents.fieldEditor_edit")} inputMode={scalar==="number"?"decimal":undefined} disabled={busy} error={errors.text?.message} {...register("text")} />}
    <p className="text-caption text-muted">{translate("documents.fieldEditor_confirm_select_save_status")}</p>
    {errors.root?.server&&<p ref={summary} tabIndex={-1} role="alert">{errors.root.server.message}</p>}
    {conflict&&<button type="button" className={secondaryButton} disabled={latestCase.isFetching||latestFields.isFetching} onClick={async()=>{
      const [c,f]=await Promise.all([latestCase.refetch(),latestFields.refetch()]);const fresh=f.data?.fields.find(v=>v.fieldId===field.fieldId);
      if(!c.isError&&!f.isError&&c.data&&fresh){reset(defaults(fresh,scope==="shared"&&fresh.hasCaseOverride));setBaseVersion(c.data.inputVersion);setConflict(false);}
    }}>{translate("documents.fieldEditor_current_draft_retry_load")}</button>}
    <div className="flex flex-wrap gap-2"><button type="submit" className={primaryButton} disabled={busy||conflict}>{translate("documents.fieldEditor_edit_save")}</button><button type="button" className={secondaryButton} disabled={busy} onClick={()=>{if(!isDirty||window.confirm(translate("documents.fieldEditor_save_change")))onClose();}}>{translate("documents.fieldEditor_close")}</button></div>
    {prepared&&<ConfirmDialog title={translate("documents.fieldEditor_sharedDefault_change_impact")} busy={mutation.isPending} onClose={()=>setPrepared(undefined)} action={<button type="button" className={primaryButton} disabled={mutation.isPending} onClick={()=>{void save(prepared);}}>{translate("documents.fieldEditor_sharedDefault_save_confirm")}</button>}>
      <p>{translate("documents.fieldEditor_sharedDefault_use_link_case_input_check_update")}</p>
      <p>{linkedCaseIds?translate("documents.fieldEditor_link_case", { value1: linkedCaseIds.map(c=>`#${c}`).join(", ")||translate("documents.fieldEditor_none_2") }):translate("documents.fieldEditor_link_case_list_notProvided")}</p>
      <p>{translate("documents.fieldEditor_impact_case_version_save_response_confirm")}</p>
    </ConfirmDialog>}
  </form>;
}
