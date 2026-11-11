import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createOpenApiContract} from './contract';
import {uploadSchema} from '@/features/documents/schemas';
import {resultsSchema,resultsView} from '@/features/results/schemas';
const html=readFileSync('src/test/fixtures/v01-v05-v06-api-reference.html','utf8');
function example(id:string){const section=html.split(`<a id="api-${id}">`)[1].split('<a id="api-')[0];const json=section.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)![1];return JSON.parse(json.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&#x27;',"'").replaceAll('&amp;','&'));}
describe('P0 V01/V05/V06 transport and request contracts',()=>{
 const p0=createOpenApiContract();
 it('validates clientMessageId limits independently',()=>{expect(p0.component('MessageCreate',{content:'질문',clientMessageId:'same-question'}).valid).toBe(true);expect(p0.component('MessageCreate',{content:'질문',clientMessageId:''}).valid).toBe(false);expect(p0.component('MessageCreate',{content:'질문',clientMessageId:'x'.repeat(129)}).valid).toBe(false);});
 it('does not claim free JSON response internals are verified',()=>{for(const [id,url,status,method] of [['025','/api/v1/workplaces/1/documents',202,'POST'],['026','/api/v1/cases/1/documents',202,'POST'],['058','/api/v1/cases/1/results',200,'GET']] as const){expect(p0.response({method,url},status,example(id))).toMatchObject({valid:true,coverage:id==='058'?'concrete':'free-json'});}});
});
describe('HTML supplementary presentation examples (not P0 inner DTO guarantees)',()=>{
 it.each(['025','026'])('accepts API-%s and safely handles absent or malformed candidates',id=>{const data=example(id).data;expect(uploadSchema.parse(data).duplicateCandidateIds).toEqual([]);expect(uploadSchema.parse({...data,duplicateCandidateIds:[17,29]}).duplicateCandidateIds).toEqual([17,29]);for(const candidate of [undefined,null,['bad']])expect(uploadSchema.parse({...data,duplicateCandidateIds:candidate}).documentId).toBe(data.documentId);});
 it('preserves raw results, valid partial counts and stale snapshots',()=>{const data=example('058').data;data.result={amount:'2300000',status:'partial'};data.summary.counts={match:0,difference:2};data.calculation={...data.calculation,grossPay:null,items:null};data.freshness.overall='UPDATING';const wire=resultsSchema.parse(data);const view=resultsView(wire);expect(view.wire).toEqual(data);expect(view.summary.counts).toEqual({match:0,difference:2,insufficientInformation:null,reviewRequired:null});expect(view.calculation).toBeNull();expect(view.freshness.overall).toBe('UPDATING');expect(view.versions).toEqual(data.versions);expect(view.result).toEqual(data.result);});
});
