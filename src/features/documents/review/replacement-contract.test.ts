import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { replacementCreatedSchema, replacementWireSchema, replacementSchema, replacementConfirmedSchema, rawFieldSchema } from "./schemas";
import { createOpenApiContract } from "@/test/openapi/contract";

describe("replacement OpenAPI transport (independent of FE schemas)",()=>{
 const api=createOpenApiContract("docs/references/openapi.json");
 it("validates the actual case-scoped integer path and Execute body",()=>{
  for(const id of ["replacement-1","replacement-x","1.5"]){
   for(const method of ["GET","POST"]){
    expect(api.request({method,url:`/api/v1/cases/15/document-replacements/${id}${method==="POST"?"/confirm":""}`}).valid).toBe(false);
   }
  }
  const get={method:"GET",url:"/api/v1/cases/15/document-replacements/1"};
  const confirm={method:"POST",url:get.url+"/confirm"};
  expect(api.request(get).valid).toBe(true);
  expect(api.request({...confirm,body:{confirmed:true,expectedInputVersion:7}}).valid).toBe(true);
  expect(api.request({...confirm,body:{expectedInputVersion:0}}).valid).toBe(false);
  expect(api.request({...confirm,body:{confirmed:"true"}}).valid).toBe(false);
  expect(api.response(get,200,{code:200,message:"ok",data:{}})).toMatchObject({valid:true,coverage:"free-json"});
  expect(api.response(get,202,{}).valid).toBe(false);
  const upload={method:"POST",url:"/api/v1/cases/15/documents/101/replace"};
  expect(api.request({...upload,contentType:"multipart/form-data",body:{file:"binary",expectedInputVersion:7}}).valid).toBe(true);
  expect(api.response(upload,202,{code:202,message:"ok",data:{}}).valid).toBe(true);
  expect(api.response(upload,200,{}).valid).toBe(false);
 });
});

describe("HTML supplemental parsing only; not live server verification",()=>{
 it("parses every API-027/028/029 success example directly from HTML",()=>{
  const html=readFileSync("docs/references/API_REFERENCE.html","utf8");
  for(const [number,schema] of [["027",replacementCreatedSchema],["028",replacementWireSchema],["029",replacementConfirmedSchema]] as const){
   const section=html.split(`id="api-${number}"`)[1].split('id="api-')[0];
   const examples=[...section.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(m=>m[1].replace(/<[^>]*>/g,"").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")).filter(s=>s.trim().startsWith("{")).map(s=>JSON.parse(s)).filter(v=>"data" in v);
   expect(examples.length).toBeGreaterThan(0);
   examples.forEach(v=>expect(schema.safeParse(v.data).success).toBe(true));
  }
 });
 it("accepts absent candidate and partial fields without inventing FieldDTO metadata",()=>{
  expect(replacementSchema.parse({replacementId:1,status:"CANDIDATE",candidate:null,fields:[{value:null}]})).toMatchObject({documentId:undefined,processingStatus:undefined,fields:[{value:null}]});
  expect(rawFieldSchema.parse({key:"gross",value:"2300000",valueType:"TEXT"}).value).toBe("2300000");
  expect(rawFieldSchema.parse({value:{items:[null,0]}}).value).toEqual({items:[null,0]});
  expect(replacementCreatedSchema.safeParse({replacementId:"replacement-1"}).success).toBe(false);
 });
});
