"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { businessKeys } from "@/lib/query/business-keys";
import { documentKeys } from "@/features/documents/query-keys";
import { documentApi } from "@/features/documents/api";
import type { CalculationDto, HistoryDto } from "./schemas";
import { resultsApi } from "./api";
export function useResults(c: number, fresh=false) {
 const s = useSessionScope(); const removal = useCaseRemoval(c);
 return useQuery({ queryKey: [...businessKeys.case(s.generation, c), "results"], staleTime:fresh?0:30_000, queryFn: ({ signal }) => resultsApi(s.api).results(c, signal), enabled: s.enabled && !removal.pending && !removal.removed });
}

// P0: execution receipt only, never a synchronous calculation snapshot.
export function useResultExecution(c: number) {
 const s=useSessionScope();
 return useMutation({gcTime:0, mutationFn: async (a:{endpoint:"recompute"|"calculations"|"comparisons"|"payslip-validations";version:number}) => {
  return resultsApi(s.api).execute(c,a.endpoint,a.version);
 }, onSettled:async()=> {if(s.session.getSnapshot().generation!==s.generation)return; await s.queryClient.invalidateQueries({queryKey:businessKeys.case(s.generation,c)});},
 onSuccess: data=> { if(s.session.getSnapshot().generation!==s.generation)return; s.queryClient.setQueryData(documentKeys.recomputeHint(s.generation,c),{jobId:data.jobId,receivedAt:Date.now()}); }
 });
}

export function useResultHistory(c:number, endpoint:"calculations"|"comparisons"|"payslip-validations", calculationId?:number, page=1, enabled=true) {
 const s=useSessionScope(); const removal=useCaseRemoval(c);
 return useQuery<CalculationDto|HistoryDto>({queryKey:[...businessKeys.case(s.generation,c),"results",endpoint,calculationId ?? "history",page],enabled:enabled&&s.enabled&&!removal.pending&&!removal.removed,
 queryFn:({signal})=>calculationId===undefined?resultsApi(s.api).history(c,endpoint,page,signal):resultsApi(s.api).calculation(c,calculationId,signal)});
}

export function useResultJob(c:number,jobId?:string,status?:string) {
 const s=useSessionScope();const removal=useCaseRemoval(c);
 return useQuery({queryKey:[...businessKeys.case(s.generation,c),"results","job",jobId,status],enabled:s.enabled&&!removal.pending&&!removal.removed&&!!jobId,
 queryFn:({signal})=>resultsApi(s.api).job(c,jobId!,signal)});
}

export function useSourceDocument(c:number,d:number) {
 const s=useSessionScope();const removal=useCaseRemoval(c);
 return useQuery({queryKey:[...businessKeys.case(s.generation,c),"results","source",d],enabled:s.enabled&&!removal.pending&&!removal.removed,queryFn:({signal})=>documentApi(s.api).detail(c,d,signal),retry:false});
}
