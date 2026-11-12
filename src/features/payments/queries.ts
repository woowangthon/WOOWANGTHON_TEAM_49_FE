"use client";

import { useMutation,useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { documentKeys } from "@/features/documents/query-keys";
import { businessKeys } from "@/lib/query/business-keys";
import { paymentsApi } from "./api";
export function usePayments(w:number,page=1,c?:number) {
 const s=useSessionScope();const api=paymentsApi(s.api);
 const transactions=useQuery({queryKey:[...businessKeys.workplace(s.generation,w),"payments",page],queryFn:({signal})=>api.list(w,page,signal),enabled:s.enabled});
 const allocations=useQuery({queryKey:[...businessKeys.case(s.generation,c??0),"deposits"],queryFn:({signal})=>api.allocations(c!,signal),enabled:s.enabled&&!!c});
 const action=useMutation({gcTime:0,mutationFn:(run:()=>Promise<unknown>)=>run(),onSuccess:data=>{
 if(s.session.getSnapshot().generation!==s.generation||!c||!data||typeof data!=="object")return;
 const meta=data as {recompute?:{scheduled?:boolean;jobId?:string}};
 if(meta.recompute?.scheduled&&meta.recompute.jobId)s.queryClient.setQueryData(documentKeys.recomputeHint(s.generation,c),{jobId:meta.recompute.jobId,receivedAt:Date.now()});
 },onSettled:async()=>{
 if(s.session.getSnapshot().generation!==s.generation)return;
 const ids=new Set<number>(c?[c]:[]);
 for(const [,value] of s.queryClient.getQueriesData<{caseId?:number;workplaceId?:number}>({queryKey:businessKeys.cases(s.generation)}))if(value?.workplaceId===w&&typeof value.caseId==="number")ids.add(value.caseId);
 await Promise.all([s.queryClient.invalidateQueries({queryKey:businessKeys.workplace(s.generation,w)}),s.queryClient.invalidateQueries({queryKey:businessKeys.caseLists(s.generation)}),...Array.from(ids,id=>s.queryClient.invalidateQueries({queryKey:businessKeys.case(s.generation,id)}))]);
 }});
 return {api,transactions,allocations,action};
}
