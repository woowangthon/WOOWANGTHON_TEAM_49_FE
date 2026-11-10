import type { ApiClient } from "@/lib/api/client";
import { questionsSchema,reportSchema,reportsSchema } from "./schemas";
export const supportApi=(api:ApiClient)=>({
 questions:(c:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/questions`,v=>questionsSchema.parse(v),{signal,expectedStatus:200}),
 reports:(c:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/reports`,v=>reportsSchema.parse(v),{signal,expectedStatus:200}),
 report:(c:number,r:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/reports/${r}`,v=>reportSchema.parse(v),{signal,expectedStatus:200}),
 create:(c:number,ids:number[],key:string)=>api.requestJson(`/cases/${c}/reports`,v=>reportSchema.parse(v),{method:"POST",expectedStatus:202,headers:{"Idempotency-Key":key},body:{includeOriginalDocuments:ids.length>0,documentIds:ids,useLatestAvailableResults:true,acknowledgeOutdatedResults:false}}),
});
