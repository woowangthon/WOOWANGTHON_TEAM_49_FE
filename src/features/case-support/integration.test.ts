import { beforeEach, expect, it } from "vitest";
import { server, testApiUrl } from "@/test/server";
import { supportMocks } from "@/mocks/shared/support-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { createApiClient } from "@/lib/api/client";
import { createMemorySession } from "@/features/auth/session";
import { supportApi } from "./api";
import { reportSchema } from "./schemas";
import { execFileSync } from "node:child_process";
let setup:ReturnType<typeof make>;
function make() {
  const management=managementMocks({baseUrl:testApiUrl,count:2});
  const inputs=inputMocks(management.getCases,testApiUrl);
  for(const c of management.getCases()){inputs.getResult(c.caseId);inputs.notifyInputChange(c.caseId);inputs.setJobStatus(c.caseId,"PARTIAL");}
  let accessible=true,bytes=new TextEncoder().encode("ORIGINAL CONTENT AT ACCEPTANCE");
  server.use(...supportMocks(testApiUrl,inputs.getResult,c=>c===15?[100,101]:c===16?[101]:[],async(_c,id)=>accessible?{documentId:id,name:`예시 ${id}.txt`,bytes}:undefined));
  const client=createApiClient({baseUrl:testApiUrl,session:createMemorySession()});
  return {client,api:supportApi(client),inputs,management,revoke:()=>{accessible=false},changeBytes:()=>{bytes=new TextEncoder().encode("CHANGED ORIGINAL")}};
}
beforeEach(()=>{setup=make()});
async function ready(c:number,id:number){let r;for(let i=0;i<3;i++)r=await setup.api.report(c,id);return r!;}
const headers=(scenario:string)=>({"X-Wageitda-Mock-Scenario":scenario});
it("generates a minimal inquiry and preserves reference versions",async()=>{const value=await setup.api.inquiry(15);expect(value.text).toContain("개발용");expect(value.requiresUserReview).toBe(true);expect(value.basedOnResultVersions?.calculation).toBeGreaterThan(0)});
it("generates an inquiry from the chosen analysis items and versions",async()=>{
 const result=setup.inputs.getResult(15)!;
 const versions=Object.fromEntries(Object.entries(result.versions).filter(([,v])=>v.version!==null).map(([k,v])=>[k,v.version!]));
 const value=await setup.api.inquiry(15,{resultItemIds:[result.items[0].id],tone:'POLITE',basedOnResultVersions:versions});
 expect(value.text).toContain(result.items[0].title);
 expect(value.text).not.toContain(result.items[1].title);
 expect(value.basedOnResultVersions).toMatchObject(versions);
});
it("rejects unknown analysis items and outdated reference versions",async()=>{
 await expect(setup.api.inquiry(15,{resultItemIds:['unknown-result-item'],tone:'POLITE'})).rejects.toMatchObject({status:422});
 await expect(setup.api.inquiry(15,{resultItemIds:[],basedOnResultVersions:{calculation:-1}})).rejects.toMatchObject({status:409,errorCode:'REPORT_SOURCE_STALE'});
});
it.each([["inquiry-409",409,"REPORT_SOURCE_STALE"],["inquiry-503",503,"UPSTREAM_UNAVAILABLE"]])("handles %s without extra request fields",async(s,status,errorCode)=>{await expect(setup.client.requestJson("/cases/15/company-inquiry",v=>v,{method:"POST",body:{},headers:headers(String(s))})).rejects.toMatchObject({status,errorCode})});
it("filters regions and field, returns explicit nationwide fallback and empty results",async()=>{expect((await setup.api.centers("청주시","WAGE",1)).items[0].isNationwide).toBe(false);expect((await setup.api.centers("다른지역","WAGE",1)).nationwideFallbackUsed).toBe(true);expect((await setup.api.centers("정보없음","",1)).items).toEqual([])});
it("surfaces center failures",async()=>{await expect(setup.client.requestJson("/consultation-centers",v=>v,{headers:headers("centers-error")})).rejects.toMatchObject({status:503})});
it("freezes selected originals, input and references; ZIP CRC and extraction match selection",async()=>{
 const receipt=await setup.api.create(15,[101],"zip-request");expect(receipt.status).toBe("PROCESSING");
 await expect(setup.client.requestDownload(`/cases/15/reports/${receipt.reportId}/originals`,"application/zip","fallback.zip")).rejects.toMatchObject({status:409});
 expect((await ready(15,receipt.reportId)).status).toBe("READY");
 const before=await setup.client.requestDownload(`/cases/15/reports/${receipt.reportId}/originals`,"application/zip","fallback.zip");
 setup.changeBytes();setup.management.getCases().find(c=>c.caseId===15)!.inputVersion++;
 const after=await setup.api.report(15,receipt.reportId);expect(after.isCurrent).toBe(false);expect(after.referencedSnapshots).toEqual(receipt.referencedSnapshots);expect(after.selectedDocumentIds).toEqual([101]);
 const again=await setup.client.requestDownload(`/cases/15/reports/${receipt.reportId}/originals`,"application/zip","fallback.zip");expect(await again.blob.arrayBuffer()).toEqual(await before.blob.arrayBuffer());expect(before.filename).toContain("상담 자료");
 const verifyZip = [
  "import io,json,sys,zipfile",
  "z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))",
  "assert z.testzip() is None",
  "assert len(z.namelist())==2",
  "n=next(n for n in z.namelist() if n.startswith('originals/'))",
  "assert n.startswith('originals/101-')",
  "assert z.read(n)==b'ORIGINAL CONTENT AT ACCEPTANCE'",
  "assert json.loads(z.read('result-snapshot.json'))['selectedDocumentIds']==[101]",
  "print('CRC and extraction OK')",
 ].join("\n");
 const result=execFileSync("python",["-c",verifyZip],{
  input:Buffer.from(await before.blob.arrayBuffer()),encoding:"utf8",
 });
 expect(result).toContain("CRC and extraction OK");
});
it("rejects unlinked selections and cross-Case reports",async()=>{await expect(setup.api.create(16,[100],"invalid")).rejects.toMatchObject({status:422});const r=await setup.api.create(15,[101],"isolated");await expect(setup.api.report(16,r.reportId)).rejects.toMatchObject({status:404});await expect(setup.api.inquiry(999)).rejects.toMatchObject({status:404})});
it("rechecks source access on historic downloads and handles deleted Case",async()=>{const r=await setup.api.create(15,[101],"deleted");await ready(15,r.reportId);setup.revoke();await expect(setup.client.requestDownload(`/cases/15/reports/${r.reportId}/pdf`,"application/pdf","report.pdf")).rejects.toMatchObject({status:404});setup.management.getCases().splice(0,1);await expect(setup.api.report(15,r.reportId)).rejects.toMatchObject({status:404})});
it("replays a request without another report and rejects a reused key body",async()=>{const a=await setup.api.create(15,[],"replay");expect(await setup.api.create(15,[],"replay")).toEqual(a);expect((await setup.api.reports(15)).items).toHaveLength(1);await expect(setup.api.create(15,[101],"replay")).rejects.toMatchObject({errorCode:"IDEMPOTENCY_KEY_REUSED"})});
it("supports a failed async report without exposing a ready artifact",async()=>{const r=await setup.client.requestJson("/cases/15/reports",v=>reportSchema.parse(v),{method:"POST",body:{includeOriginalDocuments:false,documentIds:[],useLatestAvailableResults:true,acknowledgeOutdatedResults:false},headers:headers("report-failed")});expect((await ready(15,r.reportId)).status).toBe("FAILED");await expect(setup.client.requestDownload(`/cases/15/reports/${r.reportId}/pdf`,"application/pdf","file.pdf")).rejects.toMatchObject({status:409})});
it.each(["filename-invalid","filename-absent"])("falls back safely for %s",async(s)=>{const r=await setup.api.create(15,[],s);await ready(15,r.reportId);const file=await setup.client.requestDownload(`/cases/15/reports/${r.reportId}/originals`,"application/zip","fallback.zip",{headers:headers(s)});expect(file.filename).toBe("fallback.zip")});
