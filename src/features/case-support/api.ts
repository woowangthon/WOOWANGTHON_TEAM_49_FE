import { decodeWith } from "@/lib/api/schema";
import type { ApiClient } from "@/lib/api/client";
import { questionsSchema,reportSchema,reportsSchema,inquirySchema,centersSchema } from "./schemas";
export const supportApi=(api:ApiClient)=>({
 // Conditional minimal request: P0 names Inquiry but does not define its fields.
 inquiry:(c:number)=>api.requestJson(`/cases/${c}/company-inquiry`,decodeWith(inquirySchema),{method:"POST",body:{},expectedStatus:200}),
 centers:(region:string,category:string,page:number,signal?:AbortSignal)=>{
  const params=new URLSearchParams({page:String(page),size:"20"});
  if(region.trim())params.set("region",region.trim());
  if(category==="WAGE")params.set("category",category);
  return api.requestJson(`/consultation-centers?${params}`,decodeWith(centersSchema),{signal,expectedStatus:200});
 },
 questions:(c:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/questions`,decodeWith(questionsSchema),{signal,expectedStatus:200}),
 reports:(c:number,signal?:AbortSignal,page=1)=>api.requestJson(`/cases/${c}/reports?page=${page}&size=20`,decodeWith(reportsSchema),{signal,expectedStatus:200}),
 report:(c:number,r:number,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/reports/${r}`,decodeWith(reportSchema),{signal,expectedStatus:200}),
 create:(c:number,ids:number[],key:string)=>api.requestJson(`/cases/${c}/reports`,decodeWith(reportSchema),{method:"POST",expectedStatus:202,headers:{"Idempotency-Key":key},body:{includeOriginalDocuments:ids.length>0,documentIds:ids,useLatestAvailableResults:true,acknowledgeOutdatedResults:false}}),
});
