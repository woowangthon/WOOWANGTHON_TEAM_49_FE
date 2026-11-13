// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, configure, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { http } from "msw";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { createDevelopmentScenario, demoAccount, clearMockSession } from "@/mocks/development";
import { server, testApiUrl, apiResponse } from "@/test/server";
import { ResultDetail } from "./result-detail";
import { SourceEvidence } from "./source-evidence";
import { ResultScreen, ServerValue } from "./result-screen";
import { resultsApi } from "./api";
const viewer=vi.hoisted(()=>vi.fn());
vi.mock("@/features/documents/review/components/original-viewer",()=>({OriginalViewer:(props:unknown)=>{viewer(props);return <p>원문 뷰어</p>;}}));
configure({asyncUtilTimeout:5000});
const apps:AppServices[]=[];
afterEach(()=>{cleanup();apps.splice(0).forEach(a=>{a.session.clear();a.queryClient.clear();});clearMockSession();});
async function setup(){clearMockSession();const scenario=createDevelopmentScenario(testApiUrl);server.use(...scenario.handlers);const app=createAppServices();apps.push(app);await app.auth.login(demoAccount);const mount=(ui:ReactNode)=>render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{ui}</QueryClientProvider></AppServicesContext>);return {scenario,app,mount};}
const source={documentId:101,fieldId:501,page:1,text:"지급총액 2,300,000원",boundingBox:[0.1,0.2,0.3,0.1],coordinateSystem:"RELATIVE_0_1"};
describe("result evidence and screen",()=>{
 it("resolves actual filename, document type, field and forwards exact snapshot location",async()=>{const s=await setup();s.mount(<SourceEvidence caseId={15} value={source}/>);await screen.findByRole("heading",{name:"가상_급여명세서.pdf"});await screen.findByText(/현재 필드: 지급총액/);expect(screen.getByText(/급여명세서 · 1페이지/)).toBeInTheDocument();expect(screen.getByText(/문서 추출값/)).toBeInTheDocument();expect(screen.getByRole("link")).toHaveAttribute("href","/cases/15/review?documentId=101");fireEvent.click(screen.getByRole("button",{name:"원문 근거 펼치기·접기"}));expect(viewer).toHaveBeenLastCalledWith(expect.objectContaining({documentId:101,workplaceId:3,source:expect.objectContaining(source)}));});
 it.each([403,404])("handles inaccessible/deleted source %s without opening private viewer",async status=>{const s=await setup();server.use(http.get(`${testApiUrl}/cases/15/documents/101`,()=>apiResponse({errorCode:"RESOURCE_NOT_FOUND"},status)));s.mount(<SourceEvidence caseId={15} value={source}/>);await screen.findByText(/출처 문서가 삭제/);expect(screen.queryByText(/결과 스냅샷 근거:/)).not.toBeInTheDocument();expect(screen.queryByText(source.text,{exact:false})).not.toBeInTheDocument();expect(screen.queryByRole("link")).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"원문 근거 펼치기·접기"})).not.toBeInTheDocument();});
 it("keeps historical evidence when the field is gone and coordinates are absent",async()=>{const s=await setup();s.scenario.review.originals.set(101,[]);s.mount(<SourceEvidence caseId={15} value={{...source,boundingBox:null}}/>);await screen.findByText(/현재 대응 필드가 없거나/);expect(screen.getByText(/좌표가 없어 강조하지/)).toBeInTheDocument();expect(screen.getByText(/결과 스냅샷 근거:/)).toHaveTextContent(source.text);});
 it("reports missing current field access without losing snapshot text",async()=>{const s=await setup();server.use(http.get(`${testApiUrl}/cases/15/documents/101/fields`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));s.mount(<SourceEvidence caseId={15} value={source}/>);await screen.findByText(/현재 필드 정보에 접근할 수 없습니다/);expect(screen.getByRole("link")).toBeInTheDocument();});
 it("keeps the reference overview and table first, opening live evidence on demand",async()=>{
  const s=await setup();
  const result=s.scenario.inputs.getResult(15)!;
  server.use(http.get(`${testApiUrl}/cases/15/results`,()=>apiResponse({...result,comparison:{...result.comparison,items:result.comparison!.items.map(item=>({...item,sources:[source]}))}})));
  s.mount(<ResultScreen caseId={15}/>);
  await screen.findByRole("heading",{name:"결과 요약 · 최신"});
  expect(screen.getAllByText("미확정").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/전체 임금 아님/).length).toBeGreaterThan(0);
  expect(screen.queryByRole("region",{name:"결과 탐색"})).not.toBeInTheDocument();
  expect(screen.queryByRole("heading",{name:"가상_급여명세서.pdf"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"시급 대조 근거 보기"}));
  expect(screen.getByRole("region",{name:"결과 탐색"})).toBeVisible();
  await screen.findAllByRole("link",{name:/가상_급여명세서.pdf/});
 },15000);
 it("keeps cached results when malformed refetch fails",async()=>{const s=await setup();s.app.queryClient.setDefaultOptions({queries:{retry:false}});s.mount(<ResultScreen caseId={15}/>);await screen.findByRole("heading",{name:"결과 요약 · 최신"});server.use(http.get(`${testApiUrl}/cases/15/results`,()=>apiResponse({caseId:15})));await s.app.queryClient.invalidateQueries({predicate:q=>q.queryKey.at(-1)==="results"});await screen.findByText(/최신 결과 조회에 실패해/);expect(screen.getByRole("heading",{name:"직전 조회 결과 · 최신성 미확인"})).toBeInTheDocument();expect(screen.getByText(/서버 응답 형식이 문서 계약과 일치하지 않습니다/)).toBeInTheDocument();},15000);
 it("formats amounts and hour quantities with accessible text",()=>{render(<ServerValue caseId={15} value={{calculatedSubtotal:2000000,grossPay:null,items:[{amount:0,currency:"KRW"},{unit:"HOUR",value:1.5}]}}/>);expect(screen.getByText("2,000,000 원")).toBeInTheDocument();expect(screen.getByText("0 원")).toBeInTheDocument();expect(screen.getByText("1.5 시간")).toBeInTheDocument();});
 it("receives an execution receipt and automatically displays the newer result without management controls",async()=>{
  const s=await setup();
  const before=s.scenario.inputs.getResult(15)!;
  expect(before.resultVersion).toEqual(expect.any(Number));
  const receipt=await resultsApi(s.app.api).execute(15,"recompute",before.currentInputVersion);
  expect(receipt.jobId).toEqual(expect.any(String));
  expect(["PENDING","RUNNING"]).toContain(receipt.status);
  s.mount(<ResultScreen caseId={15}/>);
  await screen.findByRole("region",{name:"임금 결과 요약"});
  expect(screen.queryByRole("button",{name:"전체 수동 재실행"})).not.toBeInTheDocument();
  await waitFor(()=>{
   const after=s.scenario.inputs.getResult(15)!;
   expect(after.resultVersion).toBeGreaterThan(before.resultVersion!);
   expect(after.currentInputVersion).toBe(before.currentInputVersion);
   expect(screen.getByText(new RegExp(`현재 입력 v${after.currentInputVersion} · 결과 v${after.resultVersion}`))).toBeVisible();
  },{timeout:10000});
 },15000);
});

it("keeps real evidence and additional information without a debug disclosure",async()=>{
 const s=await setup();const {container}=s.mount(<ResultDetail caseId={15} groupId="validation" onClose={()=>{}} card={{id:"test",title:"Evidence",status:"INSUFFICIENT_INFORMATION",data:{itemSum:null,statedTotal:100,sources:[source],reasonCode:"EXTRACTION_INCOMPLETE"},version:{snapshotId:1,version:1,inputVersion:7,createdAt:null,freshness:"CURRENT"}}}/>);
 await screen.findByRole("link",{name:/.*pdf/});
 expect(container.querySelector("[data-result-detail] > details")).toBeNull();
 expect(screen.queryByText("EXTRACTION_INCOMPLETE")).not.toBeInTheDocument();
 expect(screen.getByText(source.text,{exact:false})).toBeVisible();
});
