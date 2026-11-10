"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { businessKeys } from "@/lib/query/business-keys";
import { documentKeys } from "@/features/documents/query-keys";
import { resultsApi } from "./api";
export function useResults(c: number) {
 const s = useSessionScope(); const removal = useCaseRemoval(c);
 return useQuery({ queryKey: [...businessKeys.case(s.generation, c), "results"], queryFn: ({ signal }) => resultsApi(s.api).results(c, signal), enabled: s.enabled && !removal.pending && !removal.removed });
}

// P0: execution receipt only, never a synchronous calculation snapshot.
export function useResultExecution(c: number) {
 const s=useSessionScope();
 return useMutation({gcTime:0, mutationFn: async (a:{endpoint:"recompute"|"calculations"|"comparisons"|"payslip-validations";version:number}) => {
  return s.api.requestJson(`/cases/${c}/${a.endpoint}`, value => {
   if (!value || typeof value!=="object" || !("jobId" in value) || typeof value.jobId!=="string") throw new Error("작업 접수 계약을 확인할 수 없습니다.");
   return {jobId:value.jobId};
  }, {method:"POST",body:{confirmed:true,expectedInputVersion:a.version}});
 }, onSettled:async()=> {if(s.session.getSnapshot().generation!==s.generation)return; await s.queryClient.invalidateQueries({queryKey:businessKeys.case(s.generation,c)});},
 onSuccess: data=> { if(s.session.getSnapshot().generation!==s.generation)return; s.queryClient.setQueryData(documentKeys.recomputeHint(s.generation,c),{jobId:data.jobId,receivedAt:Date.now()}); }
 });
}

export function useResultHistory(c:number, endpoint:"calculations"|"comparisons"|"payslip-validations", calculationId?:number) {
 const s=useSessionScope(); const removal=useCaseRemoval(c);
 return useQuery({queryKey:[...businessKeys.case(s.generation,c),"results",endpoint,calculationId ?? "history"],enabled:s.enabled&&!removal.pending&&!removal.removed,
 queryFn:({signal})=>s.api.requestJson(`/cases/${c}/${endpoint}${calculationId===undefined ? "" : `/${calculationId}`}`,value=>value,{signal})});
}

export function useResultJob(c:number,jobId?:string,status?:string) {
 const s=useSessionScope();const removal=useCaseRemoval(c);
 return useQuery({queryKey:[...businessKeys.case(s.generation,c),"results","job",jobId,status],enabled:s.enabled&&!removal.pending&&!removal.removed&&!!jobId,
 queryFn:({signal})=>s.api.requestJson(`/cases/${c}/recompute-jobs/${encodeURIComponent(jobId!)}`,value=>value,{signal})});
}
