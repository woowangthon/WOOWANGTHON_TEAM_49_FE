import { depositComparisonSchema,duplicateSchema } from "./comparison-schemas";
﻿import type { ApiClient } from "@/lib/api/client";
import { decodeWith, pageSchema } from "@/lib/api/schema";
import { transaction, allocation, type TransactionInput } from "./schemas";
export function paymentsApi(api:ApiClient) {
 const t=(w:number)=>`/workplaces/${w}/payment-transactions`, a=(c:number)=>`/cases/${c}/deposits`;
 return {
 duplicates:(w:number)=>api.requestJson(`${t(w)}/duplicate-candidates`,decodeWith(duplicateSchema)),
 comparison:(c:number)=>api.requestJson(`/cases/${c}/deposit-comparison`,decodeWith(depositComparisonSchema.nullable())),
 history:(c:number,page=1)=>api.requestJson(`/cases/${c}/deposit-comparisons?page=${page}&size=20`,decodeWith(pageSchema(depositComparisonSchema))),
 list:(w:number,page=1)=>api.requestJson(`${t(w)}?page=${page}&size=20`,decodeWith(pageSchema(transaction))),
 detail:(w:number,id:number)=>api.requestJson(`${t(w)}/${id}`,decodeWith(transaction)),
 create:(w:number,body:TransactionInput)=>api.requestJson(t(w),decodeWith(transaction),{method:"POST",body}),
 update:(w:number,id:number,body:TransactionInput)=>api.requestJson(`${t(w)}/${id}`,decodeWith(transaction),{method:"PATCH",body}),
 remove:(w:number,id:number,confirm=false)=>api.requestNoContent(`${t(w)}/${id}${confirm?"?confirm=true":""}`,{method:"DELETE"}),
 allocations:(c:number)=>api.requestJson(a(c),decodeWith(pageSchema(allocation))),
 allocate:(c:number,body:{transactionId:number;allocatedAmount:number;expectedInputVersion:number})=>api.requestJson(a(c),decodeWith(allocation),{method:"POST",body}),
 updateAllocation:(c:number,id:number,body:{allocatedAmount:number;expectedInputVersion:number})=>api.requestJson(`${a(c)}/${id}`,decodeWith(allocation),{method:"PATCH",body}),
 release:(c:number,id:number)=>api.requestNoContent(`${a(c)}/${id}`,{method:"DELETE"}),
 };
}
