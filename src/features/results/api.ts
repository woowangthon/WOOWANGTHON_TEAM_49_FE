import type { ApiClient } from "@/lib/api/client";
import { decodeWith } from "@/lib/api/schema";
import { calculationSchema, historySchemas, jobSchema, resultsSchema, type HistoryDto } from "./schemas";
export type ResultEndpoint = "calculations" | "comparisons" | "payslip-validations";
export function resultsApi(api: ApiClient) {
 return {
  results: (c:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/results`,decodeWith(resultsSchema.refine(v=>v.caseId===c)),{signal,expectedStatus:200}),
  execute:(c:number,endpoint:ResultEndpoint|"recompute",version:number)=>api.requestJson(`/cases/${c}/${endpoint}`,decodeWith(jobSchema.refine(v=>v.caseId===undefined||v.caseId===c)),{method:"POST",body:{confirmed:true,expectedInputVersion:version},expectedStatus:202}),
  history:(c:number,endpoint:ResultEndpoint,page:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/${endpoint}?page=${page}&size=20`,decodeWith<HistoryDto>(historySchemas[endpoint]),{signal,expectedStatus:200}),
  calculation:(c:number,id:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/calculations/${id}`,decodeWith(calculationSchema.refine(v=>v.calculationId===id)),{signal,expectedStatus:200}),
  job:(c:number,id:string,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/recompute-jobs/${encodeURIComponent(id)}`,decodeWith(jobSchema.refine(v=>v.jobId===id&&(v.caseId===undefined||v.caseId===c))),{signal,expectedStatus:200}),
 };
}
