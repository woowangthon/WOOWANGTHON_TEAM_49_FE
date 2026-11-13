"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import type { CaseDetailDto } from "@/features/cases/schemas";
import { documentKeys } from "../query-keys";

import { reviewApi } from "./api";
import { reviewKeys } from "./query-keys";
import { reviewConfirmedSchema, reviewSchema, updateMetaSchema, type SharedFieldPatch, type FieldPatch, type ReplacementId, type ReviewContext } from "./schemas";
import type { z } from "zod";
export function useFields(c:number,d:number,enabled=true) {
const {isProcessing} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

  const s=useSessionScope();
  return useQuery({queryKey:reviewKeys.fields(s.generation,c,d),queryFn:({signal})=>reviewApi(s.api).fields(c,d,signal),enabled:s.enabled&&enabled,
    refetchInterval:q=>q.state.error?false:isProcessing(q.state.data?.processingStatus)?2000:false});
}
export function useReview(c:number,d:number,enabled=true) {
  const s=useSessionScope();return useQuery({queryKey:reviewKeys.review(s.generation,c,d),queryFn:({signal})=>reviewApi(s.api).review(c,d,signal),enabled:s.enabled&&enabled});
}
export function usePreview(w:number,d:number) {
  const s=useSessionScope();return useQuery({queryKey:reviewKeys.preview(s.generation,w,d),queryFn:({signal})=>reviewApi(s.api).preview(w,d,signal),enabled:s.enabled});
}
export function useOriginalFile(w:number,d:number) {
  const s=useSessionScope();return useQuery({queryKey:reviewKeys.file(s.generation,w,d),queryFn:({signal})=>reviewApi(s.api).file(w,d,signal),enabled:s.enabled,staleTime:Infinity,gcTime:0});
}
export function useFieldHistory(c:number,d:number,f:number,page:number) {
  const s=useSessionScope();return useQuery({queryKey:reviewKeys.history(s.generation,c,d,f,page),queryFn:({signal})=>reviewApi(s.api).history(c,d,f,page,signal),enabled:s.enabled});
}
export function useReplacement(c:number,r:ReplacementId) {
const {isProcessing} = useLocalized(createLocalizedFeaturesDocumentsViewModels);

  const s=useSessionScope();return useQuery({queryKey:reviewKeys.replacement(s.generation,c,r),queryFn:({signal})=>reviewApi(s.api).replacement(c,r,signal),enabled:s.enabled,
    refetchInterval:q=>q.state.error?false:isProcessing(q.state.data?.processingStatus)?2000:false});
}
export type ReviewAction =
 | {type:"case-field";fieldId:number;patch:FieldPatch;version:number}
 | {type:"shared-field";fieldId:number;patch:SharedFieldPatch}
 | {type:"remove-override";fieldId:number;version:number}
 | {type:"confirm-review";version:number}
 | {type:"replace";file:File;version:number;signal:AbortSignal}
 | {type:"confirm-replacement";replacementId:ReplacementId;version:number};
export function useReviewAction(context:ReviewContext) {
  const s=useSessionScope();
  return useMutation({gcTime:0,mutationFn:async(action:ReviewAction)=>{
    const api=reviewApi(s.api);const {caseId:c,workplaceId:w,documentId:d}=context;
    switch(action.type){
      case "case-field":return api.patchCase(c,d,action.fieldId,action.patch,action.version);
      case "shared-field":return api.patchShared(w,d,action.fieldId,action.patch);
      case "remove-override":return api.removeOverride(c,d,action.fieldId,action.version);
      case "confirm-review":return api.confirmReview(c,d,action.version);
      case "replace":return api.replace(c,d,action.file,action.version,action.signal);
      case "confirm-replacement":return api.confirmReplacement(c,action.replacementId,action.version);
    }
  },onSuccess:(data,action)=>{
    if(s.session.getSnapshot().generation!==s.generation)return;
    if(action.type==="confirm-review"){
      const response=reviewConfirmedSchema.safeParse(data);
      if(response.success)s.queryClient.setQueryData<z.infer<typeof reviewSchema>>(reviewKeys.review(s.generation,context.caseId,context.documentId),old=>old?{...old,...response.data}:old);
    }
    const parsed=updateMetaSchema.safeParse(data);if(!parsed.success)return;
    const meta=parsed.data;
    const updates=[...(meta.caseUpdates??[]),...(meta.inputVersion?[{caseId:context.caseId,inputVersion:meta.inputVersion}]:[])];
    for(const update of updates){
      s.queryClient.setQueryData<CaseDetailDto>(businessKeys.case(s.generation,update.caseId),old=>old&&update.inputVersion>=old.inputVersion?{...old,inputVersion:update.inputVersion}:old);
    }
  },onSettled:async(data,_error,action)=>{
    if(s.session.getSnapshot().generation!==s.generation)return;
    const meta=updateMetaSchema.safeParse(data);
    const affected=meta.success?new Set([context.caseId,...(meta.data.affectedCaseIds??[]),...(meta.data.caseUpdates?.map(u=>u.caseId)??[])]):new Set([context.caseId]);
    const revoked=(key:readonly unknown[])=>{
      const ctx=key[4];return action.type==="confirm-replacement"&&!_error&&key[5]===context.documentId&&typeof ctx==="object"&&ctx!==null&&"kind" in ctx&&"id" in ctx&&ctx.kind==="case"&&ctx.id===context.caseId&&key[3]!=="replacement";
    };
    if(action.type==="confirm-replacement"&&!_error){
      await s.queryClient.cancelQueries({queryKey:documentKeys.root(s.generation),predicate:q=>revoked(q.queryKey)});
      s.queryClient.removeQueries({queryKey:documentKeys.root(s.generation),predicate:q=>revoked(q.queryKey)});
    }
    await Promise.all([
      s.queryClient.invalidateQueries({queryKey:documentKeys.root(s.generation),predicate:q=>!revoked(q.queryKey)&&!["preview","file"].includes(String(q.queryKey[3]))}),
      s.queryClient.invalidateQueries({queryKey:businessKeys.caseLists(s.generation)}),
      ...[...affected].map(c=>s.queryClient.invalidateQueries({queryKey:businessKeys.case(s.generation,c)})),
    ]);
    if(action.type==="confirm-replacement"&&!_error){
      await s.queryClient.cancelQueries({queryKey:reviewKeys.file(s.generation,context.workplaceId,context.documentId)});
      s.queryClient.removeQueries({queryKey:reviewKeys.file(s.generation,context.workplaceId,context.documentId)});
    }
  }});
}
