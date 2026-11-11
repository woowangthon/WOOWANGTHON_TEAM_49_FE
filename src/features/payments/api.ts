import { protocolError } from "@/lib/api/response";
import { depositComparisonSchema,duplicateSchema } from "./comparison-schemas";
import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema } from "@/lib/api/schema";
import { transaction, allocation, transactionCreate, transactionPatch, allocationCreate, allocationPatch, type TransactionCreate, type TransactionPatch, type AllocationCreate, type AllocationPatch } from "./schemas";
export function paymentsApi(api:ApiClient) {
 const t=(w:number)=>`/workplaces/${w}/payment-transactions`, a=(c:number)=>`/cases/${c}/deposits`;
 return {
 duplicates:(w:number)=>api.requestJson(`${t(w)}/duplicate-candidates`,decodeWith(duplicateSchema),{expectedStatus:200}),
 comparison:(c:number)=>api.requestJson(`/cases/${c}/deposit-comparison`,decodeWith(depositComparisonSchema.nullable()),{expectedStatus:200}),
 history:(c:number,page=1,signal?:AbortSignal)=>api.requestJson(`/cases/${c}/deposit-comparisons?page=${page}&size=20`,decodeWith(pageSchema(depositComparisonSchema)),{signal,expectedStatus:200}),
 list:(w:number,page=1,signal?:AbortSignal)=>api.requestJson(`${t(w)}?page=${page}&size=20`,decodeWith(pageSchema(transaction)),{signal,expectedStatus:200}),
 detail:(w:number,id:number)=>api.requestJson(`${t(w)}/${id}`,decodeWith(transaction),{expectedStatus:200}),
 create:(w:number,body:TransactionCreate)=>api.requestJson(t(w),decodeWith(transaction),{expectedStatus:201,method:"POST",body:transactionCreate.parse(body)}),
 update:(w:number,id:number,body:TransactionPatch)=>api.requestJson(`${t(w)}/${id}`,decodeWith(transaction),{expectedStatus:200,method:"PATCH",body:transactionPatch.parse({paymentMethod:body.paymentMethod,transactionDate:body.transactionDate,amount:body.amount,sender:body.sender,memo:body.memo,confirmationStatus:body.confirmationStatus,bankReference:body.bankReference})}),
 remove:(w:number,id:number,confirm=false)=>api.requestNoContent(`${t(w)}/${id}${confirm?"?confirm=true":""}`,{method:"DELETE"}),
 allocations:async(c:number,signal?:AbortSignal)=>{
  const items: ReturnType<typeof allocation.parse>[]=[];
  let page=1;
  while(true){
   signal?.throwIfAborted();
   const result=await api.requestJson(`${a(c)}?page=${page}&size=20`,decodeWith(pageSchema(allocation)),{signal,expectedStatus:200});
   if(result.page!==page || (result.items.length===0 && items.length<result.total))throw protocolError();
   items.push(...result.items);
   if(items.length>=result.total)return {...result,items};
   page++;
  }
 },
 allocate:(c:number,body:AllocationCreate)=>api.requestJson(a(c),decodeWith(allocation),{expectedStatus:201,method:"POST",body:allocationCreate.parse(body)}),
 updateAllocation:(c:number,id:number,body:AllocationPatch)=>api.requestJson(`${a(c)}/${id}`,decodeWith(allocation),{expectedStatus:200,method:"PATCH",body:allocationPatch.parse(body)}),
 release:(c:number,id:number)=>api.requestNoContent(`${a(c)}/${id}`,{method:"DELETE"}),
 };
}
