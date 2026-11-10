import { describe, expect, it } from "vitest";
import { server, testApiUrl } from "@/test/server";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { createAppServices } from "@/lib/app-services";
import { resultsApi } from "./api";
import { caseInputsApi } from "@/features/case-inputs/api";
import { documentApi } from "@/features/documents/api";
async function setup() {
 const management=managementMocks(); const mock=inputMocks(management.getCases);server.use(...mock.handlers,...management.handlers);
 const app=createAppServices();await app.auth.login({email:"worker@example.com",password:"password1234"});return {app,mock};
}
describe("result contracts over MSW",()=>{
 it("retains snapshots through input update, polls to terminal and advances version",async()=>{
  const {app}=await setup(); const api=resultsApi(app.api);const before=await api.results(15);
  await caseInputsApi(app.api).saveConditions(15,{expectedInputVersion:7,answers:[{conditionId:"regular_minutes",value:60}]});
  expect((await documentApi(app.api).recompute(15)).activeJob?.status).toBe("PENDING");
  const during=await api.results(15);expect(during.freshness.overall).toBe("STALE");expect(during.calculation).toEqual(before.calculation);
  expect((await documentApi(app.api).recompute(15)).activeJob?.status).toBe("RUNNING");
  expect((await documentApi(app.api).recompute(15)).latestJob?.status).toBe("PARTIAL");
  const after=await api.results(15);expect(after.freshness.overall).toBe("CURRENT");expect(after.resultVersion).toBe(1);expect(after.calculation?.grossPay).toBeNull();
 });
 it("accepts asynchronous 202 and prevents duplicate work and stale version requests",async()=>{
  await setup();const request=(version:number)=>fetch(`${testApiUrl}/cases/15/recompute`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmed:true,expectedInputVersion:version})});
  expect((await request(6)).status).toBe(409);const accepted=await request(7);expect(accepted.status).toBe(202);expect((await accepted.json()).data.status).toBe("PENDING");expect((await request(7)).status).toBe(409);
 });
 it("serves snapshot history and immutable calculation detail",async()=>{const {app}=await setup();await resultsApi(app.api).results(15);const page=await app.api.requestJson("/cases/15/calculations",v=>v);expect(page).toMatchObject({page:1,total:1});const detail=await app.api.requestJson("/cases/15/calculations/0",v=>v);expect(detail).toMatchObject({version:0,grossPay:null});});
 it("serves the received job detail",async()=>{const {app}=await setup();await caseInputsApi(app.api).saveConditions(15,{expectedInputVersion:7,answers:[{conditionId:"regular_minutes",value:60}]});const status=await documentApi(app.api).recompute(15);const detail=await app.api.requestJson(`/cases/15/recompute-jobs/${status.activeJob!.jobId}`,v=>v);expect(detail).toMatchObject({status:"PENDING",requestedInputVersion:8});});
 it("preserves prior results after failed jobs",async()=>{const {app,mock}=await setup();const before=await resultsApi(app.api).results(15);mock.setJobStatus(15,"FAILED");const after=await resultsApi(app.api).results(15);expect(after.freshness.overall).toBe("FAILED");expect(after.calculation).toEqual(before.calculation);});
});
