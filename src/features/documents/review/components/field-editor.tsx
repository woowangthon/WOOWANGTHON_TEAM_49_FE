"use client";
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
const editorSchema=z.object({text:z.string(),empty:z.boolean(),confirmed:z.boolean(),scalar:z.enum(["string","number","boolean"])});
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
  const empty=useWatch({control:form.control,name:"empty"}),scalar=useWatch({control:form.control,name:"scalar"});
  const structured=fieldEditorView(field).kind==="structured";
  const busy=isSubmitting||mutation.isPending;
  const summary=useFormErrorFocus(errors,busy,setFocus,["text","empty","confirmed","scalar"]);
  useEffect(()=>{onDirty(isDirty||!!prepared);},[isDirty,prepared,onDirty]);
  useEffect(()=>()=>onDirty(false),[onDirty]);
  const save=async(patch:FieldPatch)=>{
    if(locked.current)return;locked.current=true;
    try{const result=await mutation.mutateAsync(scope==="shared"?{type:"shared-field",fieldId:field.fieldId,patch}:{type:"case-field",fieldId:field.fieldId,patch,version:baseVersion});onSaved(updateMetaSchema.parse(result));onClose();}
    catch(error){
      if(error instanceof ApiError&&error.errorCode==="INPUT_VERSION_CONFLICT")setConflict(true);
      if(error instanceof ApiError&&error.status===422){for(const item of error.fieldErrors){const name=item.field.split(".").at(-1);if(name==="value")setError("text",{message:item.reason});else if(name==="confirmed")setError("confirmed",{message:item.reason});}}
      setError("root.server",{message:reviewError(error)});setPrepared(undefined);
    }finally{locked.current=false;}
  };
  return <form aria-label={`${scope==="case"?"내역 재정의":"공유 기본값"} 편집`} className="mt-4 min-w-0 space-y-4 rounded-control border border-border p-4" onSubmit={event=>{void handleSubmit(async values=>{
    if(conflict||locked.current)return;
    let value;try{value=structured?valueSchema.parse(JSON.parse(values.text)):parseFieldValue(field,values.text,values.empty,values.scalar);}catch(error){setError("text",{message:error instanceof Error?error.message:"값을 확인해 주세요."});return;}
    if(value===null&&values.confirmed){setError("confirmed",{message:"값 없음은 확인할 수 없습니다."});return;}
    const patch:FieldPatch={value,...(values.confirmed?{confirmed:true}:{})};
    if(scope==="shared")setPrepared(patch);else await save(patch);
  })(event);}}>
    <h4 className="text-body font-bold">{scope==="case"?"이 내역에만 적용할 값":"근무지 공유 기본값"}</h4>
    <p className="text-caption text-muted">{scope==="shared"?"재정의가 없는 연결 내역에 영향을 줄 수 있습니다. 다른 내역의 재정의를 변경하지 않습니다.":"공유 기본값과 다른 내역의 값은 유지됩니다."}</p>
    {scope==="shared"&&field.hasCaseOverride&&<p className="text-caption">현재 보이는 값은 이 내역의 재정의입니다. 공유 기본값을 대신 채우지 않았습니다. 새 공유값을 직접 입력해 주세요.</p>}
    {field.value===null&&field.valueType!=="MONEY_KRW"&&<SelectField label="입력값 형식" id={`${id}-scalar`} {...register("scalar")}><option value="string">문자</option><option value="number">숫자</option><option value="boolean">예/아니요</option></SelectField>}
    {structured?<div><label htmlFor={`${id}-json`}>구조형 값 (JSON)</label><textarea id={`${id}-json`} className="min-h-48 w-full min-w-0 rounded-control border p-3 font-mono" disabled={busy} aria-invalid={!!errors.text} aria-describedby={errors.text?`${id}-json-error`:undefined} {...register("text")} /><p>배열·객체 구조와 null, 0을 유지하여 저장합니다.</p>{errors.text&&<p id={`${id}-json-error`} role="alert">올바른 JSON 값을 입력해 주세요.</p>}</div>:scalar==="boolean"?<SelectField id={`${id}-value`} label="수정값" disabled={empty||busy} error={errors.text?.message} {...register("text")}><option value="">선택해 주세요</option><option value="true">예</option><option value="false">아니요</option></SelectField>:<TextField id={`${id}-value`} label="수정값" inputMode={scalar==="number"?"decimal":undefined} disabled={empty||busy} error={errors.text?.message} {...register("text")} />}
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" disabled={busy||structured} {...register("empty",{onChange:event=>{if(event.target.checked)form.setValue("confirmed",false);}})} /><span>값 없음 (null)</span></label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" disabled={busy||empty} {...register("confirmed")} /><span>수정한 값을 함께 확인</span></label>
    <p className="text-caption text-muted">확인을 선택하지 않고 값을 저장하면 미확인 상태로 돌아갑니다. 미확인은 0이 아닙니다.</p>
    {errors.confirmed&&<p role="alert">{errors.confirmed.message}</p>}{errors.root?.server&&<p ref={summary} tabIndex={-1} role="alert">{errors.root.server.message}</p>}
    {conflict&&<button type="button" className={secondaryButton} disabled={latestCase.isFetching||latestFields.isFetching} onClick={async()=>{
      const [c,f]=await Promise.all([latestCase.refetch(),latestFields.refetch()]);const fresh=f.data?.fields.find(v=>v.fieldId===field.fieldId);
      if(!c.isError&&!f.isError&&c.data&&fresh){reset(defaults(fresh,scope==="shared"&&fresh.hasCaseOverride));setBaseVersion(c.data.inputVersion);setConflict(false);}
    }}>최신 값으로 초안 다시 불러오기</button>}
    <div className="flex flex-wrap gap-2"><button type="submit" className={primaryButton} disabled={busy||conflict}>수정값 저장</button><button type="button" className={secondaryButton} disabled={busy} onClick={()=>{if(!isDirty||window.confirm("저장하지 않은 변경을 버릴까요?"))onClose();}}>편집 닫기</button></div>
    {prepared&&<ConfirmDialog title="공유 기본값 변경 영향" busy={mutation.isPending} onClose={()=>setPrepared(undefined)} action={<button type="button" className={primaryButton} disabled={mutation.isPending} onClick={()=>{void save(prepared);}}>공유 기본값 저장 확인</button>}>
      <p>공유 기본값을 사용하는 연결 내역의 입력과 검사가 갱신될 수 있습니다. Case별 재정의는 유지됩니다.</p>
      <p>{linkedCaseIds?`연결 내역: ${linkedCaseIds.map(c=>`#${c}`).join(", ")||"없음"}`:"연결 내역 목록은 제공되지 않았습니다."}</p>
      <p>실제 영향받은 내역과 버전은 저장 후 서버 응답으로 확인합니다.</p>
    </ConfirmDialog>}
  </form>;
}
