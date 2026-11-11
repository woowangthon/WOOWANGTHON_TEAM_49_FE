import { describe,it,expect } from "vitest";
import { server,testApiUrl } from "@/test/server";
import { paymentMocks } from "@/mocks/shared/payment-handlers";
import { createOpenApiContract } from "@/test/openapi/contract";
import { transactionCreate,transactionPatch,allocationCreate,allocationPatch } from "./schemas";
import type { CaseDetailDto } from "@/features/cases/schemas";
const body={paymentMethod:"CASH",transactionDate:"2026-11-10",amount:100,source:"USER_INPUT",confirmationStatus:"USER_REPORTED"};
describe("payment contracts",()=>{
 it.each([0,100])("explicit amount %s accepted",amount=>expect(transactionCreate.safeParse({...body,amount}).success).toBe(true));
 it.each([null,-1,1.5,undefined])("invalid amount %s rejected",amount=>expect(transactionCreate.safeParse({...body,amount}).success).toBe(false));
 it.each(["BANK_TRANSFER","CASH"])("method %s",paymentMethod=>expect(transactionCreate.safeParse({...body,paymentMethod}).success).toBe(true));
 it("shared transaction allocations and deletion policy",async()=>{
 const cases=[{caseId:15,workplaceId:3,inputVersion:1},{caseId:16,workplaceId:3,inputVersion:1}] as CaseDetailDto[];
 const mocks=paymentMocks(()=>cases,testApiUrl,c=>({inputVersion:++c.inputVersion}));server.use(...mocks.handlers);
 const send=(path:string,method="GET",data?:unknown)=>fetch(testApiUrl+path,{method,headers:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
 const created=await send('/workplaces/3/payment-transactions','POST',body);expect(created.status).toBe(201);const t=(await created.json()).data;
 const allocate=(c:number,amount:number)=>send(`/cases/${c}/deposits`,'POST',{transactionId:t.transactionId,allocatedAmount:amount,expectedInputVersion:cases.find(v=>v.caseId===c)!.inputVersion});
 expect((await allocate(15,60)).status).toBe(201);expect((await allocate(15,1)).status).toBe(409);expect((await allocate(16,41)).status).toBe(409);expect((await allocate(16,40)).status).toBe(201);
 const detail=await send(`/workplaces/3/payment-transactions/${t.transactionId}`);expect((await detail.json()).data.remainingUnallocated).toBe(0);
 expect((await send(`/workplaces/3/payment-transactions/${t.transactionId}`,'PATCH',{amount:99})).status).toBe(409);
 expect((await send(`/workplaces/3/payment-transactions/${t.transactionId}`,'DELETE')).status).toBe(409);
 const removed=await send(`/workplaces/3/payment-transactions/${t.transactionId}?confirm=true`,'DELETE');expect(removed.status).toBe(204);expect(await removed.text()).toBe('');expect(mocks.allocations).toHaveLength(0);
 });
});

const contract=createOpenApiContract();
describe("independent payment request boundaries",()=>{
 it.each([0,1_000_000_000_000,-1,1.5,1_000_000_000_001,null])("amount %s agrees with P0",amount=>{
  for(const [name,schema,value] of [
   ["TransactionCreate",transactionCreate,{...body,amount}],
   ["TransactionPatch",transactionPatch,{amount}],
   ["AllocationCreate",allocationCreate,{transactionId:1,allocatedAmount:amount}],
   ["AllocationPatch",allocationPatch,{allocatedAmount:amount}],
  ] as const) expect(schema.safeParse(value).success).toBe(contract.component(name,value).valid);
 });
 it.each([{}, {amount:null,sender:null,memo:null,confirmationStatus:null,bankReference:null}, {sender:"a".repeat(200),memo:"a".repeat(1000)}, {source:"USER_INPUT"}, {sender:"a".repeat(201)}, {memo:"a".repeat(1001)}, {sourceDocumentId:1}])("patch validates and Mock enforces %j",async value=>{
  const mocks=paymentMocks(()=>[],testApiUrl,()=>({}));server.use(...mocks.handlers);
  await fetch(testApiUrl+"/workplaces/3/payment-transactions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const request={method:"PATCH",url:testApiUrl+"/workplaces/3/payment-transactions/1",body:value};
  const result=contract.request(request);
  expect(transactionPatch.safeParse(value).success).toBe(result.valid);
  const response=await fetch(request.url,{method:request.method,headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  expect(response.status).toBe(result.valid?200:422);
 });
});

describe("raw Mock request rejection",()=>{
 it.each([-1,1.5,1_000_000_000_001,null])("rejects invalid amount %s with 422",async amount=>{
  const mocks=paymentMocks(()=>[{caseId:15,workplaceId:3,inputVersion:1}] as CaseDetailDto[],testApiUrl,()=>({}));server.use(...mocks.handlers);
  for(const [path,method,value] of [
   ["/workplaces/3/payment-transactions","POST",{...body,amount}],
   ["/cases/15/deposits","POST",{transactionId:1,allocatedAmount:amount}],
   ["/cases/15/deposits/1","PATCH",{allocatedAmount:amount}],
  ] as const){
   expect(contract.request({url:testApiUrl+path,method,body:value}).valid).toBe(false);
   expect((await fetch(testApiUrl+path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(value)})).status).toBe(422);
  }
 });
});
