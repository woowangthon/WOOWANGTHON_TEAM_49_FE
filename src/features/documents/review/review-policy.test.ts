import {afterEach, describe, expect, it} from "vitest";
import {managementMocks} from "@/test/management-handlers";
import {documentMocks} from "@/test/document-handlers";
import {reviewMocks, legacyReviewMocks} from "@/test/review-handlers";
import {server} from "@/test/server";
import {createAppServices} from "@/lib/app-services";
import {reviewApi} from "./api";
import {groupReviewFields} from "./field-groups";

const apps: ReturnType<typeof createAppServices>[]=[];
afterEach(()=>apps.splice(0).forEach(app=>{app.session.clear();app.queryClient.clear();}));
async function setup(legacy=false){
 const m=managementMocks();const d=documentMocks(m.getCases());
 const mocks=(legacy?legacyReviewMocks:reviewMocks)(m.getCases(),d.getDocuments());
 server.use(...mocks.handlers,...d.handlers,...m.handlers);
 const app=createAppServices();apps.push(app);
 await app.auth.login({email:"worker@example.com",password:"password1234"});
 return {mocks,api:reviewApi(app.api)};
}
describe("server required review policy",()=>{
 it.each(["UNKNOWN","NOT_IN_DOCUMENT"] as const)("resolves %s without a value, then restores pending with NONE",async resolution=>{
  const {api,mocks}=await setup();
  mocks.originals.get(101)![2].status="UNCONFIRMED";
  expect((await api.review(15,101)).pendingRequiredFieldIds).toEqual([501,502]);
  expect((await api.confirmReview(15,101,7)).reviewStatus).toBe("IN_PROGRESS");
  await api.patchCase(15,101,501,{confirmed:true},7);
  const saved=await api.patchCase(15,101,502,{reviewResolution:resolution},8);
  expect(saved).toMatchObject({value:null,status:"MISSING",reviewResolved:true,usableForAnalysis:false,analysisValueOrigin:"NONE"});
  expect(await api.review(15,101)).toMatchObject({pendingRequiredFieldIds:[],optionalUnconfirmedFieldIds:[503],canCompleteReview:true,resolvedRequiredCount:2});
  expect((await api.confirmReview(15,101,9)).reviewStatus).toBe("CONFIRMED");
  const optional=(await api.fields(15,101)).fields[2];
  expect(optional).toMatchObject({status:"UNCONFIRMED",value:0,usableForAnalysis:true,analysisValueOrigin:"SYSTEM_EXTRACTED_UNVERIFIED"});
  await api.patchCase(15,101,503,{value:100,confirmed:true},9);
  expect((await api.review(15,101)).reviewStatus).toBe("CONFIRMED");
  await api.patchCase(15,101,502,{reviewResolution:"NONE"},10);
  expect(await api.review(15,101)).toMatchObject({pendingRequiredFieldIds:[502],canCompleteReview:false});
  expect(mocks.requests.filter(r=>r.body?.reviewResolution).every(r=>!Object.hasOwn(r.body!,"value")&&!Object.hasOwn(r.body!,"confirmed"))).toBe(true);
 });
 it("groups unknown keys by server policy and rejects missing resolution on conflicts",async()=>{
  const {api,mocks}=await setup();mocks.originals.get(101)![2].status="CONFLICTED";
  const fields=(await api.fields(15,101)).fields;
  expect(groupReviewFields(fields,"PAYSLIP").essential.map(f=>f.fieldId)).toContain(503);
  await expect(api.patchCase(15,101,503,{reviewResolution:"UNKNOWN"},7)).rejects.toMatchObject({status:422});
  await expect(api.patchCase(15,101,501,{confirmed:true},1)).rejects.toMatchObject({status:409});
 });
 it("preserves legacy data without inferring new policy success",async()=>{
  const {api}=await setup(true);const summary=await api.review(15,101);
  expect(summary.canCompleteReview).toBeUndefined();
  expect((await api.fields(15,101)).fields[0].requiresUserReview).toBeUndefined();
 });
});

it.each(["UNKNOWN","NOT_IN_DOCUMENT","NONE"] as const)("preserves resolution-only origin for %s and rejects errors",async resolution=>{
 const {api}=await setup();
 const {http}=await import("msw");const {testApiUrl,apiResponse}=await import("@/test/server");
 const {caseFieldUpdatedSchema,caseResolutionUpdatedSchema}=await import("./schemas");
 const recompute={scheduled:true,jobId:"resolution-job",affectedChecks:["PAYSLIP_VALIDATION"]};
 const data={fieldId:502,previousValue:null,value:null,status:"MISSING",editedByUser:false,hasCaseOverride:false,effectiveValueOrigin:"SHARED_DEFAULT",affectedCaseIds:[15],caseUpdates:{"15":{inputVersion:8,recompute}},inputVersion:8,recompute,requiresUserReview:true,reviewReason:"MISSING",reviewResolution:resolution,reviewResolved:resolution!=="NONE",usableForAnalysis:false,analysisValueOrigin:"NONE"};
 expect(caseFieldUpdatedSchema.safeParse(data).success).toBe(false);
 expect(caseResolutionUpdatedSchema.safeParse(data).success).toBe(true);
 const path=`${testApiUrl}/cases/:c/documents/:d/fields/:f`;
 for(const hasCaseOverride of [false,true]){
 server.use(http.patch(path,()=>apiResponse({...data,hasCaseOverride,effectiveValueOrigin:hasCaseOverride?"CASE_OVERRIDE":"SHARED_DEFAULT"})));
 expect(await api.patchCase(15,101,502,{reviewResolution:resolution},7)).toMatchObject({reviewResolution:resolution,hasCaseOverride});
 }
 for(const status of [500,409,422]){
 server.use(http.patch(path,()=>apiResponse({errorCode:status===409?"INPUT_VERSION_CONFLICT":"VALIDATION_ERROR"},status)));
 await expect(api.patchCase(15,101,502,{reviewResolution:resolution},7)).rejects.toMatchObject({status});
 }
 for(const invalid of [{...data,recompute:{scheduled:"yes"}},{...data,status:"INVALID"},{...data,hasCaseOverride:true},{...data,reviewResolution:undefined}]){
 server.use(http.patch(path,()=>apiResponse(invalid)));
 await expect(api.patchCase(15,101,502,{reviewResolution:resolution},7)).rejects.toBeInstanceOf(Error);
 }
});
