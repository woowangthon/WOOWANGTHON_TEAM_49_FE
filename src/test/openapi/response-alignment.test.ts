// @vitest-environment jsdom
import { File as NodeFile } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import { createOpenApiContract } from './contract';
import { managementMocks } from '@/mocks/shared/management-handlers';
import { documentMocks } from '@/mocks/shared/document-handlers';
import { createDevelopmentScenario, demoAccount, clearMockSession } from '@/mocks/development';
import { server, testApiUrl } from '@/test/server';
import { workplaceSchema } from '@/features/workplaces/schemas';
import { caseWireSchema } from '@/features/cases/schemas';
import { documentSchema } from '@/features/documents/schemas';
import { recomputeSchema } from '@/features/documents/api';
import { resultsSchema, resultItemSchema, resultsView } from '@/features/results/schemas';
import { pageSchema } from '@/lib/api/schema';

const contract = createOpenApiContract();
describe('A10/M01 independent P0 responses', () => {
 it.each(['shared','development'])('validates actual %s statuses and envelopes', async mode => {
  vi.stubGlobal("File",NodeFile);
  clearMockSession();
  if (mode === 'development') server.use(...createDevelopmentScenario(testApiUrl).handlers);
  else { const m=managementMocks(); server.use(...m.handlers,...documentMocks(m.getCases()).handlers); }
  const login=await fetch(testApiUrl+'/auth/login',{method:'POST',body:JSON.stringify(demoAccount)});
  const token=(await login.json()).data.accessToken;
  const paths=['/workplaces','/workplaces/3','/cases','/workplaces/3/cases','/cases/15','/documents','/workplaces/3/documents','/cases/15/documents','/cases/15/documents/101','/workplaces/3/documents/101','/cases/15/recompute-status',...(mode==='development'?['/cases/15/results']:[])];
  for(const path of paths){
   const response=await fetch(testApiUrl+path,{headers:{Authorization:'Bearer '+token}});
   const body=await response.json();
   expect(response.status,path).toBe(200);
   expect(contract.response({method:'GET',url:testApiUrl+path},response.status,body),path).toMatchObject({valid:true,coverage:'concrete'});
  }
  for(const path of ['/cases?page=999&size=20','/documents?page=999&size=20','/cases/99999']){
   const response=await fetch(testApiUrl+path,{headers:{Authorization:'Bearer '+token}});
   const body=await response.json();
   expect(response.status).toBe(path.endsWith('99999')?404:200);
   expect(contract.response({method:'GET',url:testApiUrl+path},response.status,body)).toMatchObject({valid:true});
   if(response.status===200)expect(body.data.items).toEqual([]);
  }
  const multipart='--a10\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nPAYSLIP\r\n--a10\r\nContent-Disposition: form-data; name="file"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--a10--\r\n';
  const uploaded=await fetch(testApiUrl+'/cases/15/documents',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/form-data; boundary=a10'},body:multipart});
  const receipt=await uploaded.json();
  expect(uploaded.status,JSON.stringify(receipt)).toBe(202);
  expect(contract.response({method:'POST',url:testApiUrl+'/cases/15/documents'},uploaded.status,receipt)).toMatchObject({valid:true});
  for(const path of ['/documents','/cases/15/documents',`/cases/15/documents/${receipt.data.documentId}`,'/cases/15/recompute-status']){
   const response=await fetch(testApiUrl+path,{headers:{Authorization:'Bearer '+token}});
   expect(contract.response({method:'GET',url:testApiUrl+path},response.status,await response.json()),path).toMatchObject({valid:true});
  }
 });
 it('accepts free objects, nulls and unconstrained response strings/integers',()=>{
  const workplace={workplaceId:0,name:'',industry:null,region:null,employmentStatus:'CURRENT',caseCount:-1,createdAt:'',updatedAt:'opaque'};
  const c={caseId:0,workplaceId:-1,workplace:{name:[]},payType:'HOURLY',periodStart:'',periodEnd:'x',scheduledPayDate:null,status:'CREATED',currentStep:'UPLOAD',documentCount:-1,latestCalculationId:null,inputVersion:0,attentionRequired:false,attentionCount:0,updatedAt:''};
  const d={documentId:0,workplaceId:0,documentType:'CONTRACT',fileName:'',processingStatus:'READ_READY',reviewStatus:'NOT_STARTED',progress:-1,linkId:null,linkedCaseIds:[0],uploadedAt:'',errorCode:null,aiMetadata:{nested:[null]},workplaceName:null};
  const r={caseId:0,currentInputVersion:0,activeJob:{status:[]},latestJob:{},results:{}};
  const item={id:'',title:'',status:'MATCH',calculatedValue:null,documentValue:0,difference:-1,unit:null,periodStart:'',periodEnd:'x',formula:{inputs:1},rule:{},comparisonBasis:{},sources:[{}],confirmedAt:null,nextAction:null};
  const results={caseId:0,currentInputVersion:0,resultVersion:0,summary:{},freshness:{},versions:{},items:[item],calculation:{},comparison:null,payslipValidation:{},depositComparison:null};
  for(const [name,schema,value] of [['WorkplaceDTO',workplaceSchema,workplace],['CaseDTO',caseWireSchema,c],['DocumentDTO',documentSchema,d],['RecomputeDTO',recomputeSchema,r],['ResultItem',resultItemSchema,item],['ResultsDTO',resultsSchema,results]] as const){
   expect(contract.component(name,value),name).toMatchObject({valid:true});
   expect(schema.safeParse(value).success,name).toBe(true);
   for(const key of Object.keys(value)){
    if(name==='DocumentDTO'&&key==='workplaceName')continue;
    const missing={...value}; delete (missing as Record<string,unknown>)[key];
    expect(contract.component(name,missing).valid,name+'.'+key).toBe(false);
    expect(schema.safeParse(missing).success,name+'.'+key).toBe(false);
   }
  }
  expect(resultItemSchema.safeParse({...item,difference:0.5}).success).toBe(false);
  expect(resultsSchema.safeParse({...results,resultVersion:null}).success).toBe(false);
  expect(recomputeSchema.safeParse({...r,results:{calculation:null}}).success).toBe(false);
  expect(pageSchema(documentSchema).safeParse({items:[],page:0,size:101,total:-1}).success).toBe(true);
  expect(contract.request({method:'GET',url:testApiUrl+'/documents?page=0&size=101'}).valid).toBe(false);
  const view=resultsView(resultsSchema.parse(results));
  expect(view.wire).toEqual(results);
  expect(view.items[0]).toMatchObject({documentValue:0,calculatedValue:null});
  expect(view.summary.counts.match).toBeNull();
  expect(view.calculation).toBeNull();
 });
});
