import {it,expect} from "vitest";
import {z} from "zod";
import {conditionSchema} from "@/features/case-inputs/schemas";
import {questionsSchema,reportSchema} from "@/features/case-support/schemas";
import {messageSchema,sourceSchema} from "@/features/chats/api";
import {previewSchema} from "@/features/documents/review/schemas";
import {createApiClient} from "@/lib/api/client";
import {createMemorySession} from "@/features/auth/session";
import {decodeWith} from "@/lib/api/schema";
import {consumeChat} from "@/features/chats/stream";
// Independent synthetic fixtures transcribed from API_REFERENCE DTO tables and P0 VersionRef.
it("accepts nullable contract values without manufacturing defaults",()=>{
 expect(conditionSchema.parse({conditionId:"regular_minutes",question:"Minutes",type:"NUMBER",options:null,requiredFor:["WAGE_CALCULATION"],value:120,status:"ANSWERED",source:"USER_INPUT"}).options).toBeNull();
 expect(questionsSchema.parse({questions:[{questionId:1,type:"MISSING_CONDITION",question:"Question",reason:"Reason",relatedItemId:null}]}).questions[0].relatedItemId).toBeNull();
 const ref={snapshotId:3,version:2,inputVersion:4,createdAt:null,freshness:"CURRENT"};
 expect(reportSchema.parse({reportId:1,version:1,status:"READY",basedOnInputVersion:4,referencedSnapshots:{calculation:ref},selectedDocumentIds:[],createdAt:"2026-11-12"}).referencedSnapshots.calculation).toEqual(ref);
 expect(sourceSchema.parse({caseId:1,documentId:null,page:null,fieldId:null}).documentId).toBeNull();
 const m=messageSchema.parse({messageId:1,role:"USER",content:"Synthetic",status:"COMPLETED",scope:{scopeType:"CASE",caseId:1},runId:null,sourceMayBeOutdated:false});
 expect(Object.hasOwn(m,"sources")).toBe(false);
 expect(previewSchema.parse({documentId:1,mediaType:"application/pdf",pageCount:null,coordinateSystem:null,rotationDegrees:null,supportsHighlight:false}).pageCount).toBeNull();
});
it("preserves HTTP 200 and structured DTO failures without response values",async()=>{
 const api=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session:createMemorySession(),fetch:async()=>Response.json({code:200,message:"ok",data:{items:null}})});
 await expect(api.requestJson("/cases/123/questions",decodeWith(z.object({items:z.array(z.string())})))).rejects.toMatchObject({status:200,diagnostic:{phase:"dto",endpointTemplate:"/cases/{id}/questions",issues:[{path:"items",expectedType:"array",actualType:"null"}]}});
});
it.each([400,401,403,404,409,422,429,500,502])("retains HTTP %i",async(status)=>{
 const api=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session:createMemorySession(),fetch:async()=>new Response("",{status})});
 await expect(api.requestJson("/cases",v=>v)).rejects.toMatchObject({status});
});
it("distinguishes network and SSE failures",async()=>{
 const api=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session:createMemorySession(),fetch:async()=>{throw new TypeError("offline");}});
 await expect(api.requestJson("/cases",v=>v)).rejects.toMatchObject({kind:"network"});
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode("event: content_delta\ndata: {bad}\n\n"));c.close();}});
 await expect(consumeChat(stream,()=>{})).rejects.toMatchObject({status:200,diagnostic:{phase:"sse"}});
});

it.each([
 [new Response("not json",{status:200,headers:{"content-type":"text/plain"}}),"media-type"],
 [new Response("{",{status:200,headers:{"content-type":"application/json"}}),"json"],
 [Response.json({code:200,message:1,data:null}),"envelope"],
])("distinguishes response reader failures",async(response,phase)=>{
 const api=createApiClient({baseUrl:"http://127.0.0.1:8000/api/v1",session:createMemorySession(),fetch:async()=>response});
 await expect(api.requestJson("/cases",v=>v)).rejects.toMatchObject({status:200,diagnostic:{phase}});
});

it("preserves uninterpretable P0 results and an explicit view failure",async()=>{
 const {resultsSchema,resultsView}=await import("@/features/results/schemas");
 const wire=resultsSchema.parse({caseId:1,currentInputVersion:1,resultVersion:1,summary:{},freshness:{overall:"UNRECOGNIZED"},versions:{},items:[],calculation:{backendSpecific:true},comparison:null,payslipValidation:null,depositComparison:null});
 const view=resultsView(wire);
 expect(view.wire).toEqual(wire);
 expect(view.interpretation).toBe("interpretation-error");
 expect(view.interpretationDiagnostic).toMatchObject({phase:"view"});
});
