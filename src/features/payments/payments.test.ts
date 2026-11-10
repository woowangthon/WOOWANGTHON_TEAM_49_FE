import { describe,it,expect } from "vitest";
import { server,testApiUrl } from "@/test/server";
import { paymentMocks } from "@/mocks/shared/payment-handlers";
import { transactionInput } from "./schemas";
import type { CaseDetailDto } from "@/features/cases/schemas";
const body={paymentMethod:"CASH",transactionDate:"2026-11-10",amount:100,source:"USER_INPUT",confirmationStatus:"USER_REPORTED"};
describe("payment contracts",()=>{
 it.each([0,100])("explicit amount %s accepted",amount=>expect(transactionInput.safeParse({...body,amount}).success).toBe(true));
 it.each([null,-1,1.5,undefined])("invalid amount %s rejected",amount=>expect(transactionInput.safeParse({...body,amount}).success).toBe(false));
 it.each(["BANK_TRANSFER","CASH"])("method %s",paymentMethod=>expect(transactionInput.safeParse({...body,paymentMethod}).success).toBe(true));
 it("shared transaction allocations and deletion policy",async()=>{
 const cases=[{caseId:15,workplaceId:3,inputVersion:1},{caseId:16,workplaceId:3,inputVersion:1}] as CaseDetailDto[];
 const mocks=paymentMocks(()=>cases,testApiUrl,c=>({inputVersion:++c.inputVersion}));server.use(...mocks.handlers);
 const send=(path:string,method="GET",data?:unknown)=>fetch(testApiUrl+path,{method,headers:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
 const created=await send('/workplaces/3/payment-transactions','POST',body);expect(created.status).toBe(201);const t=(await created.json()).data;
 const allocate=(c:number,amount:number)=>send(`/cases/${c}/deposits`,'POST',{transactionId:t.transactionId,allocatedAmount:amount,expectedInputVersion:cases.find(v=>v.caseId===c)!.inputVersion});
 expect((await allocate(15,60)).status).toBe(201);expect((await allocate(15,1)).status).toBe(409);expect((await allocate(16,41)).status).toBe(409);expect((await allocate(16,40)).status).toBe(201);
 const detail=await send(`/workplaces/3/payment-transactions/${t.transactionId}`);expect((await detail.json()).data.remainingUnallocated).toBe(0);
 expect((await send(`/workplaces/3/payment-transactions/${t.transactionId}`,'PATCH',{...body,amount:99})).status).toBe(409);
 expect((await send(`/workplaces/3/payment-transactions/${t.transactionId}`,'DELETE')).status).toBe(409);
 const removed=await send(`/workplaces/3/payment-transactions/${t.transactionId}?confirm=true`,'DELETE');expect(removed.status).toBe(204);expect(await removed.text()).toBe('');expect(mocks.allocations).toHaveLength(0);
 });
});
