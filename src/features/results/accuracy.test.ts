import {createTranslation} from '@/i18n/translate';
import { describe, expect, it } from "vitest";
import { http } from "msw";
import { server, testApiUrl, apiResponse } from "@/test/server";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { documentMocks } from "@/mocks/shared/document-handlers";
import { reviewMocks } from "@/mocks/shared/review-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { createAppServices } from "@/lib/app-services";
import { caseInputsApi } from "@/features/case-inputs/api";
import { reviewApi } from "@/features/documents/review/api";
import { documentApi } from "@/features/documents/api";
import { resultsApi } from "./api";
import { calculationSchema, comparisonSchema, historySchemas, jobSchema, resultsSchema, validationSchema } from "./schemas";
import {createLocalizedFeaturesResultsViewModels} from './view-models';
import {createLocalizedLibFormat} from '@/lib/format';

const {toResultsViewModel} = createLocalizedFeaturesResultsViewModels(createTranslation('ko'));
const {formatQuantity} = createLocalizedLibFormat(createTranslation('ko'));
async function setup() {
 const m=managementMocks();const docs=documentMocks(m.getCases());const review=reviewMocks(m.getCases(),docs.getDocuments());
 const mock=inputMocks(m.getCases,testApiUrl,c=>docs.getLinks().filter(l=>l.caseId===c).map(l=>({documentId:l.documentId,fields:review.fields(c,l.documentId)})));
 server.use(...mock.handlers,...review.handlers,...docs.handlers,...m.handlers);
 const app=createAppServices();await app.auth.login({email:"worker@example.com",password:"password1234"});
 return {app,mock,review,inputs:caseInputsApi(app.api),results:resultsApi(app.api),status:documentApi(app.api)};
}
async function finish(s:Awaited<ReturnType<typeof setup>>) {await s.status.recompute(15);await s.status.recompute(15);await s.status.recompute(15);return s.results.results(15);}
describe("result accuracy",()=>{
 it.each(["caseId","summary","freshness","versions","items","calculation","comparison","payslipValidation"])("rejects missing P0 %s",async key=>{const s=await setup();const dto=await s.results.results(15);const invalid={...dto};delete invalid[key];server.use(http.get(`${testApiUrl}/cases/15/results`,()=>apiResponse(invalid)));await expect(s.results.results(15)).rejects.toMatchObject({kind:"protocol"});});
 it("validates nullable and optional inner contracts without filling values",async()=>{const s=await setup();const dto=await s.results.results(15);expect(resultsSchema.safeParse(dto).success).toBe(true);expect(resultsSchema.safeParse({...dto,items:[{...dto.items[0],unit:"KRW",calculatedValue:1.5}]}).success).toBe(false);const calculation={...dto.calculation!,items:[{}]};expect(calculationSchema.parse(calculation).items).toEqual([{}]);expect(calculationSchema.safeParse({...calculation,grossPay:"0"}).success).toBe(false);expect(calculationSchema.safeParse({...calculation,grossPay:0.5}).success).toBe(false);expect(calculationSchema.safeParse({...calculation,items:[{amount:0,status:"UNKNOWN"}]}).success).toBe(false);expect(calculationSchema.safeParse({...calculation,status:"BROKEN"}).success).toBe(false);expect(comparisonSchema.safeParse({...dto.comparison,items:[{comparisonBasis:{semanticMatch:"yes"}}]}).success).toBe(false);expect(validationSchema.safeParse({...dto.payslipValidation,netPay:{difference:"0"}}).success).toBe(false);expect(jobSchema.safeParse({jobId:"j",status:"BROKEN"}).success).toBe(false);expect(historySchemas.calculations.safeParse({items:[calculation],page:1,size:20,total:1}).success).toBe(true);});
 it.each([[undefined,"미제공"],[null,"미확정"],[0,"0 원"],[1234567890,"1,234,567,890 원"]] as const)("formats money %s",(value,label)=>expect(formatQuantity(value,"KRW")).toBe(label));
 it("formats minute and hour quantities without converting or comparing",()=>{expect(formatQuantity(90,"MINUTE")).toBe("90 분");expect(formatQuantity(1.5,"HOUR")).toBe("1.5 시간");expect(formatQuantity(12000,"KRW_PER_HOUR")).toBe("12,000 원/시간");});
 it("changes each validation independently from manual input, preserves zero and immutable old versions",async()=>{
  const s=await setup();const empty=await s.results.results(15);expect(empty.payslipValidation?.netPay.status).toBe("INSUFFICIENT_INFORMATION");
  const saved=await s.inputs.create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{grossPay:0,totalDeductions:0,netPay:0,paymentItems:[0],deductionItems:null}});
  const pending=await s.results.results(15);expect(pending.freshness.overall).toBe("STALE");expect(pending.payslipValidation).toEqual(empty.payslipValidation);
  await s.status.recompute(15);await s.status.recompute(15);expect((await s.results.results(15)).freshness.overall).toBe("UPDATING");await s.status.recompute(15);
  const current=await s.results.results(15);expect(current.payslipValidation?.paymentTotal).toMatchObject({status:"MATCH",difference:0});expect(current.payslipValidation?.deductionTotal.status).toBe("INSUFFICIENT_INFORMATION");expect(current.payslipValidation?.netPay).toMatchObject({status:"MATCH",stated:0});
  const page=await s.app.api.requestJson("/cases/15/payslip-validations",v=>historySchemas["payslip-validations"].parse(v));expect(page.items[1]).toEqual(empty.payslipValidation);
  await s.inputs.update(15,saved.recordId!,{recordType:"PAYSLIP",source:"USER_INPUT",data:{grossPay:300,totalDeductions:20,netPay:270,paymentItems:[100,200],deductionItems:[10]}});
  const changed=await finish(s);expect(changed.payslipValidation?.deductionTotal).toMatchObject({status:"DIFFERENCE",difference:-10});expect(changed.payslipValidation?.netPay).toMatchObject({status:"DIFFERENCE",difference:10});
 });
 it("gates comparison on matching basis and echoes only confirmed base inputs",async()=>{
  const s=await setup();await s.inputs.create(15,{recordType:"CONTRACT",source:"USER_INPUT",data:{hourlyWage:12000,monthlyBasePay:2000000}});await s.inputs.create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{hourlyWage:11000}});
  let dto=await finish(s);expect(dto.comparison?.items[0]).toMatchObject({status:"REVIEW_REQUIRED",difference:null,comparisonBasis:{semanticMatch:false}});expect(dto.calculation?.calculatedSubtotal).toBeNull();
  await s.inputs.saveConditions(15,{expectedInputVersion:dto.currentInputVersion,answers:[{conditionId:"comparison_basis_confirmed",value:true},{conditionId:"base_scope_confirmed",value:true},{conditionId:"regular_minutes",value:10000}]});dto=await finish(s);expect(dto.comparison?.items[0]).toMatchObject({status:"DIFFERENCE",difference:1000});expect(dto.calculation).toMatchObject({status:"PARTIAL",calculatedSubtotal:2000000,grossPay:null});
 });
 it("uses confirmed document fields and their actual sources after external version change",async()=>{
  const s=await setup();const before=await s.results.results(15);expect(before.items.find(v=>v.id==="field-101-501")?.status).toBe("REVIEW_REQUIRED");
  await reviewApi(s.app.api).patchCase(15,101,501,{value:987654,confirmed:true},7);
  expect((await s.results.results(15)).freshness.overall).toBe("STALE");const after=await finish(s);expect(after.payslipValidation?.paymentTotal.statedTotal).toBe(987654);expect(after.items.find(v=>v.id==="field-101-501")).toMatchObject({documentValue:987654,confirmedAt:expect.any(String),sources:[{documentId:101,fieldId:501,page:1}]});expect(before.items.find(v=>v.id==="field-101-501")?.documentValue).toBe(2300000);
 });
 it("does not promote failed or superseded jobs and exposes old job identity",async()=>{const s=await setup();const before=await s.results.results(15);await s.inputs.saveConditions(15,{expectedInputVersion:7,answers:[{conditionId:"regular_minutes",value:60}]});const old=(await s.status.recompute(15)).activeJob!.jobId!;await s.inputs.saveConditions(15,{expectedInputVersion:8,answers:[{conditionId:"regular_minutes",value:90}]});expect(await s.app.api.requestJson(`/cases/15/recompute-jobs/${old}`,v=>jobSchema.parse(v))).toMatchObject({status:"SUPERSEDED"});s.mock.setJobStatus(15,"FAILED");expect((await s.results.results(15)).freshness.overall).toBe("FAILED");expect((await s.results.results(15)).calculation).toEqual(before.calculation);});
 it("rejects a synchronous 200 execution receipt instead of treating it as acceptance",async()=>{const s=await setup();server.use(http.post(`${testApiUrl}/cases/15/recompute`,()=>apiResponse({jobId:"job",status:"PENDING"},200)));await expect(s.results.execute(15,"recompute",7)).rejects.toMatchObject({kind:"protocol"});});
 it("trusts server CURRENT even when result input version is older",async()=>{const s=await setup();const dto=await s.results.results(15);dto.currentInputVersion+=10;expect(toResultsViewModel(dto).title).toContain("최신");});
 it("rejects unready manual calculation and lets a complete independent payslip job succeed",async()=>{const s=await setup();await expect(s.results.execute(15,"calculations",7)).rejects.toMatchObject({status:409});await s.inputs.create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{grossPay:300,totalDeductions:20,netPay:270,paymentItems:[100,200],deductionItems:[20]}});const before=await finish(s);const receipt=await s.results.execute(15,"payslip-validations",before.currentInputVersion);expect(receipt.status).toBe("PENDING");await s.status.recompute(15);await s.status.recompute(15);const terminal=await s.status.recompute(15);expect(terminal.latestJob?.status).toBe("SUCCEEDED");const after=await s.results.results(15);expect(after.calculation).toEqual(before.calculation);expect(after.versions.calculation).toEqual(before.versions.calculation);expect(after.payslipValidation?.version).toBeGreaterThan(before.payslipValidation!.version);});

});
