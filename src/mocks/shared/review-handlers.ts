import { caseDocumentResponse as replacementDocument } from "./document-handlers";
import { http, HttpResponse } from "msw";
import type { CaseDetailDto } from "@/features/cases/schemas";
import type { ExtractedField, FieldValue } from "@/features/documents/review/schemas";
import type { DocumentDto } from "@/features/documents/schemas";
import { apiResponse } from "./response";
export const testPng=Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jSnkAAAAASUVORK5CYII="),c=>c.charCodeAt(0));
export function reviewMocks(cases:CaseDetailDto[],documents:DocumentDto[], testApiUrl = "http://127.0.0.1:8000/api/v1", development = false, onReplace?: (c:number, old:number, next:number)=>void,onInputChanged?: (c:number)=>{jobId:string|null|undefined}, legacy = false){
  const originals=new Map<number,ExtractedField[]>();
  const baseFields=(documentId:number):ExtractedField[]=>[
    {fieldId:501,key:"grossPay",label:"지급총액",value:2300000,valueType:"MONEY_KRW",status:"UNCONFIRMED",editedByUser:false,effectiveValueOrigin:"SHARED_DEFAULT",hasCaseOverride:false,confirmedAt:null,source:{documentId,page:1,text:"지급총액 2,300,000원",boundingBox:[0.1,0.2,0.3,0.1],coordinateSystem:"RELATIVE_0_1"}},
    {fieldId:502,key:"deductions",label:"공제액",value:null,valueType:"MONEY_KRW",status:"MISSING",editedByUser:false,effectiveValueOrigin:"SHARED_DEFAULT",hasCaseOverride:false,confirmedAt:null,source:{documentId,page:null,text:null,boundingBox:null,coordinateSystem:"RELATIVE_0_1"}},
    {fieldId:503,key:"bonus",label:"추가 지급액",value:0,valueType:"MONEY_KRW",status:"CONFIRMED",editedByUser:false,effectiveValueOrigin:"SHARED_DEFAULT",hasCaseOverride:false,confirmedAt:"2026-11-09T00:00:00+00:00",source:null},
  ];
  const initialFields=baseFields(101);
  if(development)initialFields.push(...Array.from({length:10},(_,i)=>({...initialFields[0],fieldId:504+i,key:`reviewSample${i+1}`,label:`검토 예시 ${i+1}`,value:i===9?null:i,status:i===9?"CONFLICTED" as const:"UNCONFIRMED" as const})));
  if(development)initialFields.push(
    {...initialFields[0],fieldId:520,key:"structuredDeferred",label:"보류·재확인 세부 내역",value:{items:[0,null,{label:"기본급"}]},valueType:"JSON",status:"DEFERRED"},
    {...initialFields[0],fieldId:521,key:"structuredReconfirm",label:"보류·재확인 세부 내역",value:[0,false,null,{amount:100}],valueType:"JSON",status:"NEEDS_RECONFIRMATION"});
  originals.set(101,initialFields);
  const overrides=new Map<string,ExtractedField>();const requests:{method:string;path:string;body?:Record<string,unknown>;authorization:string|null}[]=[];
  const histories:{historyId:number;fieldId:number;previousValue:FieldValue;newValue:FieldValue;changedAt:string;changedBy:string;scope:string}[]=Array.from({length:21},(_,i)=>({historyId:i+1,fieldId:501,previousValue:i===0?null:0,newValue:0,changedAt:"2026-11-09T00:00:00+00:00",changedBy:"USER",scope:"CASE_OVERRIDE"}));
  const historyContexts=new Map<number,string>();
  const reviewStates=new Map<string,string>();let replacementConflict=false;let replacementProcessing=true;
  const replacements=new Map<number,{replacementId:number;documentId:number;oldDocumentId:number;confirmed?:boolean;originalLinkRetained:boolean;processingStatus:"PROCESSING"|"READY";fields:ExtractedField[]}>();
  const key=(c:number,d:number,f:number)=>`${c}:${d}:${f}`;
  const sharedFields=(d:number)=>{if(!originals.has(d))originals.set(d,baseFields(d));return originals.get(d)!;};
  const withPolicy=(f:ExtractedField):ExtractedField=>{
    if(legacy)return f;
    const reviewReason=f.status==="CONFLICTED"?"CONFLICTED":f.status==="NEEDS_RECONFIRMATION"||f.status==="DEFERRED"?"RECONFIRMATION":f.status==="UNREADABLE"?"UNREADABLE":f.value===null?"MISSING":f.key==="grossPay"||f.key==="deductions"?"REQUIRED":null;
    const reviewResolution=f.reviewResolution??"NONE";
    return {...f,requiresUserReview:reviewReason!==null,reviewReason,reviewResolution,reviewResolved:f.status==="CONFIRMED"||reviewResolution!=="NONE",usableForAnalysis:f.value!==null&&reviewResolution==="NONE"&&!['CONFLICTED','NEEDS_RECONFIRMATION','DEFERRED'].includes(f.status),analysisValueOrigin:f.value===null||reviewResolution!=="NONE"?"NONE":f.status==="CONFIRMED"?"USER_CONFIRMED":"SYSTEM_EXTRACTED_UNVERIFIED"};
  };
  const fields=(c:number,d:number)=>sharedFields(d).map(f=>withPolicy(overrides.get(key(c,d,f.fieldId))??f));
  const record=(request:Request,body?:Record<string,unknown>)=>!development&&requests.push({method:request.method,path:new URL(request.url).pathname+new URL(request.url).search,body,authorization:request.headers.get("Authorization")});
  const current=(c:number)=>cases.find(v=>v.caseId===c)!;
  const error=(code:string,status=409)=>apiResponse({errorCode:code},status);
  const bump=(ids:number[])=>Object.fromEntries(ids.map(caseId=>{const inputVersion=++current(caseId).inputVersion;return [String(caseId),{inputVersion,recompute:{scheduled:true,jobId:onInputChanged?.(caseId).jobId ?? "review-job",affectedChecks:["PAYSLIP_VALIDATION"]}}];}));
  const review=(c:number,d:number)=>{const fs=fields(c,d);const unconfirmedFieldIds=fs.filter(f=>f.status!=="CONFIRMED").map(f=>f.fieldId);const pendingRequiredFieldIds=fs.filter(f=>f.requiresUserReview&&!f.reviewResolved).map(f=>f.fieldId);const policy=legacy?{}:{requiredReviewCount:fs.filter(f=>f.requiresUserReview).length,resolvedRequiredCount:fs.filter(f=>f.requiresUserReview&&f.reviewResolved).length,pendingRequiredFieldIds,optionalUnconfirmedFieldIds:fs.filter(f=>!f.requiresUserReview&&f.status!=="CONFIRMED").map(f=>f.fieldId),canCompleteReview:fs.length>0&&pendingRequiredFieldIds.length===0};return {...policy,documentId:d,caseId:c,processingStatus:"READY",reviewStatus:reviewStates.get(`${c}:${d}`)??"NOT_STARTED",confirmedFieldCount:fs.length-unconfirmedFieldIds.length,totalFieldCount:fs.length,unconfirmedFieldIds};};
  const patch=async(request:Request,c:number|undefined,d:number,fid:number)=>{
    const body=await request.json() as Record<string,unknown>;record(request,body);
    if(!c&&Object.hasOwn(body,"expectedInputVersion"))return error("CASE_VERSION_NOT_APPLICABLE",422);
    if(body.confirmed===false)return error("CANDIDATE_CONFIRMATION_INVALID",422);
    if(c&&body.expectedInputVersion!==undefined&&body.expectedInputVersion!==current(c).inputVersion)return error("INPUT_VERSION_CONFLICT");
    const shared=sharedFields(d).find(f=>f.fieldId===fid)!;const old=c?(overrides.get(key(c,d,fid))??shared):shared;
    if(body.reviewResolution!==undefined&&(!c||Object.hasOwn(body,"value")||Object.hasOwn(body,"confirmed")||!["NONE","NOT_IN_DOCUMENT","UNKNOWN"].includes(String(body.reviewResolution))||(body.reviewResolution!=="NONE"&&(old.value!==null||!["MISSING","UNREADABLE"].includes(withPolicy(old).reviewReason??"")))))return error("INVALID_REVIEW_RESOLUTION",422);
    const previousValue=old.value;
    const value=Object.hasOwn(body,"value")?body.value as FieldValue:old.value;
    if(value===null&&body.confirmed===true)return error("INVALID_FIELD_VALUE",422);
    const status=value===null?"MISSING":body.confirmed===true?"CONFIRMED":body.confirmed===false||Object.hasOwn(body,"value")?"UNCONFIRMED":old.status;
    const updated:ExtractedField={...old,reviewResolution:body.reviewResolution as ExtractedField["reviewResolution"]??(Object.hasOwn(body,"value")?"NONE":old.reviewResolution),value,status,editedByUser:Object.hasOwn(body,"value")||old.editedByUser,confirmedAt:status==="CONFIRMED"?"2026-11-09T00:00:00+00:00":null,effectiveValueOrigin:body.reviewResolution!==undefined?old.effectiveValueOrigin:c?"CASE_OVERRIDE":"SHARED_DEFAULT",hasCaseOverride:body.reviewResolution!==undefined?old.hasCaseOverride:!!c};
    if(c)overrides.set(key(c,d,fid),updated);else Object.assign(shared,updated);
    const affected=c?[c]:(development?(documents.find(v=>v.documentId===d)?.linkedCaseIds??[]):[15,16]).filter(id=>!overrides.has(key(id,d,fid)));const caseUpdates=bump(affected);
    affected.forEach(id=>{if(legacy||review(id,d).pendingRequiredFieldIds?.length||reviewStates.get(`${id}:${d}`)!=="CONFIRMED")reviewStates.set(`${id}:${d}`,"IN_PROGRESS");});
    historyContexts.set(histories.length+1,`${c??"shared"}:${d}`);
    histories.unshift({historyId:histories.length+1,fieldId:fid,previousValue,newValue:value,changedAt:"2026-11-09T00:00:00+00:00",changedBy:"USER",scope:c?"CASE_OVERRIDE":"SHARED_DEFAULT"});
    return apiResponse({...withPolicy(updated),previousValue,affectedCaseIds:affected,caseUpdates,...(c?{inputVersion:current(c).inputVersion,recompute:caseUpdates[String(c)].recompute}:{})});
  };
  const handlers=[
    http.get(`${testApiUrl}/workplaces/:w/documents/:d/preview`,({request,params})=>{record(request);return apiResponse({documentId:Number(params.d),mediaType:"image/png",pageCount:1,previewUrl:"https://must-not-follow.invalid/private-original",coordinateSystem:"RELATIVE_0_1",rotationDegrees:0,supportsHighlight:true});}),
    http.get(`${testApiUrl}/workplaces/:w/documents/:d/file`,({request})=>{record(request);return new HttpResponse(testPng,{headers:{"Content-Type":"image/png"}});}),
    http.get(`${testApiUrl}/cases/:c/documents/:d/fields`,({request,params})=>{record(request);return apiResponse({documentId:Number(params.d),caseId:Number(params.c),processingStatus:"READY",reviewStatus:review(Number(params.c),Number(params.d)).reviewStatus,fields:fields(Number(params.c),Number(params.d))});}),
    http.patch(`${testApiUrl}/cases/:c/documents/:d/fields/:f`,({request,params})=>patch(request,Number(params.c),Number(params.d),Number(params.f))),
    http.patch(`${testApiUrl}/workplaces/:w/documents/:d/fields/:f`,({request,params})=>patch(request,undefined,Number(params.d),Number(params.f))),
    http.delete(`${testApiUrl}/cases/:c/documents/:d/field-overrides/:f`,async({request,params})=>{record(request);const c=Number(params.c),d=Number(params.d),f=Number(params.f);overrides.delete(key(c,d,f));if(development)reviewStates.set(`${c}:${d}`,"IN_PROGRESS");const caseUpdates=bump([c]);return apiResponse({fieldId:f,effectiveValueOrigin:"SHARED_DEFAULT",inputVersion:current(c).inputVersion,caseUpdates,affectedCaseIds:[c]});}),
    http.get(`${testApiUrl}/cases/:c/documents/:d/fields/:f/history`,({request,params})=>{record(request);const items=histories.filter(h=>h.fieldId===Number(params.f)&&(!development||[`${params.c}:${params.d}`,`shared:${params.d}`].includes(historyContexts.get(h.historyId)??"")));return apiResponse({items:[...items].sort((a,b)=>a.historyId-b.historyId).map(h=>({historyId:h.historyId,scope:h.scope,previous:{value:h.previousValue,status:"UNCONFIRMED"},new:{value:h.newValue,status:"UNCONFIRMED"},createdAt:h.changedAt}))});}),
    http.get(`${testApiUrl}/cases/:c/documents/:d/review`,({request,params})=>{record(request);return apiResponse(review(Number(params.c),Number(params.d)));}),
    http.post(`${testApiUrl}/cases/:c/documents/:d/review/confirm`,async({request,params})=>{record(request);const c=Number(params.c),d=Number(params.d);const data=review(c,d);reviewStates.set(`${c}:${d}`,(legacy?data.unconfirmedFieldIds.length:!data.canCompleteReview)?"IN_PROGRESS":"CONFIRMED");const doc=documents.find(doc=>doc.documentId===d);if(doc)doc.reviewStatus=reviewStates.get(`${c}:${d}`) as DocumentDto["reviewStatus"];return apiResponse({...data,reviewStatus:reviewStates.get(`${c}:${d}`)});}),
    http.post(`${testApiUrl}/cases/:c/documents/:d/replace`,async({request,params})=>{const form=await request.formData();record(request,{fileName:(form.get("file") as File).name,expectedInputVersion:Number(form.get("expectedInputVersion"))});const c=Number(params.c);if(Number(form.get("expectedInputVersion"))!==current(c).inputVersion)return error("INPUT_VERSION_CONFLICT");const replacementId=replacements.size+1;const documentId=901+replacements.size;originals.set(documentId,baseFields(documentId));replacements.set(replacementId,{replacementId,documentId,oldDocumentId:Number(params.d),originalLinkRetained:true,processingStatus:"PROCESSING",fields:baseFields(documentId)});return apiResponse({replacementId,documentId,originalLinkRetained:true},202);}),
    http.get(`${testApiUrl}/cases/:c/document-replacements/:r`,({request,params})=>{record(request);const r=replacements.get(Number(params.r));if(!r)return error("RESOURCE_NOT_FOUND",404);if(!replacementProcessing||(development&&r.processingStatus==="PROCESSING"))r.processingStatus="READY";return apiResponse({replacementId:r.replacementId,status:r.confirmed?"CONFIRMED":"CANDIDATE",original:replacementDocument(documents.find(d=>d.documentId===r.oldDocumentId)!,1),candidate:replacementDocument({...documents.find(d=>d.documentId===r.oldDocumentId)!,documentId:r.documentId,processingStatus:r.processingStatus},null),fields:r.fields});}),
    http.post(`${testApiUrl}/cases/:c/document-replacements/:r/confirm`,async({request,params})=>{const body=await request.json() as Record<string,unknown>;record(request,body);const c=Number(params.c);if(body.expectedInputVersion!==current(c).inputVersion)return error("INPUT_VERSION_CONFLICT");if(replacementConflict)return error("REPLACEMENT_OVERRIDE_CONFLICT");const r=replacements.get(Number(params.r));if(!r)return error("RESOURCE_NOT_FOUND",404);if(r.confirmed)return apiResponse({replacementId:r.replacementId,status:"CONFIRMED",documentId:r.documentId,inputVersion:current(c).inputVersion});if(r.processingStatus!=="READY")return error("DOCUMENT_STILL_PROCESSING");const old=documents.find(d=>d.documentId===r.oldDocumentId)!;old.linkedCaseIds=old.linkedCaseIds?.filter(id=>id!==c);documents.push({...old,documentId:r.documentId,fileName:"교체된 원본.png",linkedCaseIds:[c]});if(development){for(const f of fields(c,r.oldDocumentId)){if(f.hasCaseOverride)overrides.set(key(c,r.documentId,f.fieldId),{...f,source:{documentId:r.documentId,page:1,text:"Mock: carried forward override"}});}onReplace?.(c,r.oldDocumentId,r.documentId);}
r.confirmed=true;const caseUpdates=bump([c]);return apiResponse({status:"CONFIRMED",replacementId:r.replacementId,documentId:r.documentId,inputVersion:current(c).inputVersion,caseUpdates});}),
  ];
  return {handlers,requests,fields,reviewStates,originals,overrides,replacements,histories,setReplacementReady:()=>{replacementProcessing=false;},setReplacementConflict:(value:boolean)=>{replacementConflict=value;}};
}

// Explicit migration fixture; development uses the new policy.
export const legacyReviewMocks = (...args: Parameters<typeof reviewMocks>) => reviewMocks(args[0],args[1],args[2],args[3],args[4],args[5],true);
