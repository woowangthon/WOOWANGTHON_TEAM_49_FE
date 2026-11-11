import { expect, it } from "vitest";
import { createMemorySession } from "@/features/auth/session";
import { createApiClient } from "@/lib/api/client";
import { createOpenApiContract } from "@/test/openapi/contract";
import { documentApi } from "../api";
import { reviewApi } from "./api";
import { historyListSchema, reviewSchema, reviewConfirmedSchema } from "./schemas";

it("checks real serialized A07 requests and response statuses against P0", async()=>{
 const contract=createOpenApiContract("contracts/openapi.json");
 const session=createMemorySession();session.start("test");
 let count=0;
 const client=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session,fetch:async(input,init)=>{
  const url=String(input),method=init?.method??"GET";
  const request={url,method,body:init?.body===undefined?undefined:JSON.parse(String(init.body))};
  expect(contract.request(request)).toMatchObject({valid:true,errors:[]});count++;
  const status=url.includes("document-links")?204:url.endsWith("retry")?202:200;
  const data=url.includes("history")?{items:[]}:url.endsWith("confirm")?{documentId:101,reviewStatus:"IN_PROGRESS",unconfirmedFieldIds:[501]}:url.includes("field-overrides")?{fieldId:501,effectiveValueOrigin:"SHARED_DEFAULT"}:{documentId:101,processingStatus:"PROCESSING"};
  const body={code:status,message:"test",data};
  expect(contract.response(request,status,status===204?undefined:body).valid).toBe(true);
  return status===204?new Response(null,{status}):Response.json(body,{status});
 }});
 const docs=documentApi(client),review=reviewApi(client);
 await docs.unlink(15,777,1);await docs.retry(15,101);
 await review.removeOverride(15,101,501,1);await review.confirmReview(15,101,1);
 await review.history(15,101,501,2);
 expect(count).toBe(5);
});

it("parses HTML history separately without fabricated actor or server pagination",()=>{
 const data=historyListSchema.parse({items:[{historyId:1,scope:"CASE_OVERRIDE",previous:{value:null,status:"MISSING"},new:{value:0,status:"CONFIRMED"},createdAt:"2026-11-09T00:00:00Z"}]});
 expect(data.items[0]).toMatchObject({previousValue:null,newValue:0});
 expect(data.items[0]).not.toHaveProperty("changedBy");
 expect(historyListSchema.parse({items:[]})).toEqual({items:[]});
 expect(historyListSchema.safeParse({}).success).toBe(false);
});

it("separates HTML review confirmation and lookup; rejects incomplete supplements",()=>{
 const confirm={documentId:101,reviewStatus:"IN_PROGRESS",unconfirmedFieldIds:[1]};
 expect(reviewConfirmedSchema.parse(confirm)).toEqual(confirm);
 expect(reviewSchema.safeParse(confirm).success).toBe(false);
 expect(reviewSchema.parse({...confirm,processingStatus:"READ_READY"})).not.toHaveProperty("caseId");
 expect(reviewConfirmedSchema.safeParse({documentId:101}).success).toBe(false);
});

it("keeps library queries declared and propagates 409 without a version body",async()=>{
 const contract=createOpenApiContract("contracts/openapi.json");
 const session=createMemorySession();session.start("test");
 const client=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session,fetch:async(input,init)=>{
  expect(contract.request({url:String(input),method:init?.method??"GET",body:init?.body}).valid).toBe(true);
  return Response.json({code:409,message:"conflict",data:{errorCode:"DOCUMENT_STILL_PROCESSING"}},{status:409});
 }});
 await expect(documentApi(client).list({kind:"library"},{page:1,size:20,processingStatus:"FAILED",documentType:"PAYSLIP"})).rejects.toMatchObject({status:409});
 for(const version of [1,99]) await expect(reviewApi(client).confirmReview(15,101,version)).rejects.toMatchObject({status:409});
});
