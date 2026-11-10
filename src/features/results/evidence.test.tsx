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
import { SourceEvidence } from "./source-evidence";
import { ResultScreen, ServerValue } from "./result-screen";
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
 it("renders integrated results with previous snapshot notice and P0 summary",async()=>{const s=await setup();s.mount(<ResultScreen caseId={15}/>);await screen.findByRole("heading",{name:"결과 요약 · 최신"});expect(screen.getAllByText("미확정·확정 불가").length).toBeGreaterThan(0);expect(screen.getAllByText(/전체 세전 임금 아님/).length).toBeGreaterThan(0);await screen.findAllByRole("heading",{name:"가상_급여명세서.pdf"});});
 it("keeps cached results when malformed refetch fails",async()=>{const s=await setup();s.app.queryClient.setDefaultOptions({queries:{retry:false}});s.mount(<ResultScreen caseId={15}/>);await screen.findByRole("heading",{name:"결과 요약 · 최신"});server.use(http.get(`${testApiUrl}/cases/15/results`,()=>apiResponse({caseId:15})));await s.app.queryClient.invalidateQueries({predicate:q=>q.queryKey.at(-1)==="results"});await screen.findByText(/최신 결과 조회에 실패해/);expect(screen.getByRole("heading",{name:"직전 조회 결과 · 최신성 미확인"})).toBeInTheDocument();expect(screen.getByText(/서버 응답 형식이 문서 계약과 일치하지 않습니다/)).toBeInTheDocument();});
 it("formats amounts and hour quantities with accessible text",()=>{render(<ServerValue caseId={15} value={{calculatedSubtotal:2000000,grossPay:null,items:[{amount:0,currency:"KRW"},{unit:"HOUR",value:1.5}]}}/>);expect(screen.getByText("2,000,000 원")).toBeInTheDocument();expect(screen.getByText("0 원")).toBeInTheDocument();expect(screen.getByText("1.5 시간")).toBeInTheDocument();});
 it("receives 202, polls to terminal, invalidates results and re-enables manual execution",async()=>{const s=await setup();s.mount(<ResultScreen caseId={15}/>);const button=await screen.findByRole("button",{name:"전체 수동 재실행"});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);await screen.findByText(/수동 작업 접수:/);await waitFor(()=>expect(button).toBeEnabled(),{timeout:10000});await waitFor(()=>expect(screen.getByText(/현재 입력 버전 7 · 결과 버전 1/)).toBeInTheDocument());expect(screen.getAllByText(/PARTIAL|일부 갱신 완료/).length).toBeGreaterThan(0);},15000);
});
