// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { delay, http } from "msw";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { createDevelopmentScenario, demoAccount, clearMockSession } from "@/mocks/development";
import { server, testApiUrl, apiResponse } from "@/test/server";
import { ResultScreen } from "./result-screen";
import type { Results } from "./schemas";

vi.mock("@/features/documents/review/components/original-viewer",()=>({OriginalViewer:()=> <p>원문 뷰어</p>}));
const apps:AppServices[]=[];
afterEach(()=>{cleanup();apps.splice(0).forEach(app=>{app.session.clear();app.queryClient.clear();});clearMockSession();});

async function setup(){
 clearMockSession();const scenario=createDevelopmentScenario(testApiUrl);server.use(...scenario.handlers);
 const app=createAppServices();apps.push(app);app.queryClient.setDefaultOptions({queries:{retry:false}});
 await app.auth.login(demoAccount);
 const mount=()=>render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><ResultScreen caseId={16}/></QueryClientProvider></AppServicesContext>);
 return {scenario,app,mount};
}

it("renders case 16 through the existing development MSW contract with visible follow-up routes",async()=>{
 const s=await setup();const result=s.scenario.inputs.getResult(16)!;s.mount();
 await screen.findByRole("heading",{name:"결과 요약 · 최신"});
 expect(screen.getByRole("heading",{level:1})).toHaveTextContent("내 임금, 어디까지 확인됐을까요?");
 expect(screen.getByRole("link",{name:"상담 자료 준비"})).toHaveAttribute("href","/cases/16/reports");
 const steps=screen.getByRole("complementary",{name:"결과 확인 후 다음 행동"});
 expect(within(steps).getByRole("link",{name:"계산 조건 확인하기"})).toHaveAttribute("href","/cases/16/conditions");
 expect(screen.queryByRole("heading",{name:"결과를 확인한 뒤에는"})).not.toBeInTheDocument();
 expect(screen.queryByRole("heading",{name:"연결된 지급 범위를 확인해요"})).not.toBeInTheDocument();
 expect(screen.queryByRole("region",{name:"결과 탐색"})).not.toBeInTheDocument();
 expect(screen.queryByText("계산식·비교 기준·출처·버전 상세")).not.toBeInTheDocument();
 expect(screen.getByRole("navigation",{name:"후속 확인"})).toBeVisible();
 expect(screen.getByRole("button",{name:`정보 부족 ${result.summary.counts.insufficientInformation}개 · 확인`})).toBeVisible();
 expect(screen.getByText(/차이 발견은 미지급임금 확정을 의미하지 않습니다/)).toBeVisible();
 expect(screen.queryByText("계산 상세·작업 상태·버전·이력·수동 실행")).not.toBeInTheDocument();
 expect(screen.queryByText("입금 거래·배분 관리 및 별도 입금 대조 이력")).not.toBeInTheDocument();
 expect(screen.queryByText("실행 가능성과 부족한 입력 상세")).not.toBeInTheDocument();
});

it("keeps a loading state until the case's result response arrives",async()=>{
 const s=await setup();const result=s.scenario.inputs.getResult(16)!;
 server.use(http.get(`${testApiUrl}/cases/16/results`,async()=>{await delay(150);return apiResponse(result);}));
 s.mount();expect(screen.getAllByRole("heading",{name:"자료를 불러오는 중입니다"}).length).toBeGreaterThan(0);
 expect(screen.queryByRole("region",{name:"임금 결과 요약"})).not.toBeInTheDocument();
 await screen.findByRole("heading",{name:"결과 요약 · 최신"});
});

it("shows retryable access errors without turning missing results into zero amounts",async()=>{
 const s=await setup();server.use(http.get(`${testApiUrl}/cases/16/results`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));
 s.mount();expect(await screen.findByText("이 자료에 접근할 권한이 없습니다.")).toBeVisible();
 expect(screen.getByRole("button",{name:"다시 시도"})).toBeVisible();
 expect(screen.queryByRole("region",{name:"임금 결과 요약"})).not.toBeInTheDocument();
 expect(screen.queryByText("0 원")).not.toBeInTheDocument();
});

it("keeps a valid empty response usable with scoped missing values and an empty comparison table",async()=>{
 const s=await setup();const result:Results=structuredClone(s.scenario.inputs.getResult(16)!);
 result.calculation=null;result.comparison=null;result.payslipValidation=null;result.depositComparison=null;result.items=[];
 result.summary.calculationStatus=null;result.summary.comparisonStatus=null;result.summary.counts={match:0,difference:0,insufficientInformation:0,reviewRequired:0};
 server.use(http.get(`${testApiUrl}/cases/16/results`,()=>apiResponse(result)));
 s.mount();await screen.findByRole("heading",{name:"결과 요약 · 최신"});
 const summary=screen.getByRole("region",{name:"임금 결과 요약"});
 expect(within(summary).getAllByText("미제공")).toHaveLength(2);
 expect(screen.getByText(/해당 조건의 대조 항목이 없어요/)).toBeVisible();
 expect(screen.queryByRole("region",{name:"결과 탐색"})).not.toBeInTheDocument();
 expect(screen.getByRole("navigation",{name:"후속 확인"})).toBeVisible();
});
