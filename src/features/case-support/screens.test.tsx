// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http } from "msw";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { InquiryScreen } from "./inquiry-screen";
import { CentersScreen, safePhone, safeWebsite } from "./centers-screen";
import { QuestionsScreen } from "./screens";
import { ReportsScreen } from "./screens";
import { createDevelopmentScenario } from "@/mocks/development";
import { supportApi } from "./api";
let services:ReturnType<typeof createAppServices>;
beforeEach(async()=>{
 services=createAppServices(testApiUrl);await services.auth.login({email:"worker@example.com",password:"password1234"});
 HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};
});
afterEach(()=>{cleanup();services.session.clear();services.queryClient.clear();vi.unstubAllGlobals();vi.restoreAllMocks()});
function mount(node:ReactNode){return render(<AppServicesContext value={services}><QueryClientProvider client={services.queryClient}>{node}</QueryClientProvider></AppServicesContext>)}
it("navigates report history past twenty records and back",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);await services.auth.login({email:"worker@example.com",password:"password1234"});
 const api=supportApi(services.api);for(let i=0;i<21;i++)await api.create(15,[],`audit-${i}`);
 mount(<ReportsScreen caseId={15}/>);await screen.findByRole("heading",{name:/보고서 #110 /});
 fireEvent.click(screen.getByRole("button",{name:"다음 보고서"}));expect(await screen.findByRole("heading",{name:/보고서 #90 /})).toBeVisible();
 expect(screen.getByRole("button",{name:"다음 보고서"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"이전 보고서"}));expect(await screen.findByRole("heading",{name:/보고서 #110 /})).toBeVisible();
});
it("shows the server original separately and never overwrites an in-flight edit",async()=>{
 let finish:()=>void=()=>{};const pending=new Promise<void>(resolve=>{finish=resolve});let count=0;
 server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,async({request})=>{count++;expect(await request.json()).toEqual({});await pending;return apiResponse({text:"서버 원문 0원 · 미확인 금액은 null",requiresUserReview:true,basedOnResultVersions:{comparison:3}})}));
 mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"요청 중 편집"}});finish();
 expect(await screen.findByRole("region",{name:"서버 생성 원문"})).toBeVisible();expect(screen.getByRole("textbox")).toHaveValue("요청 중 편집");expect(screen.getByText("사용자 검토 필수")).toBeVisible();expect(count).toBe(1);
 fireEvent.click(screen.getByRole("button",{name:"서버 초안 재생성"}));expect(screen.getByRole("dialog")).toHaveTextContent("작성 중인 문장은 유지");fireEvent.click(screen.getByRole("button",{name:"취소"}));expect(count).toBe(1);
});
it("allows direct edits and copies while generation fails",async()=>{
 const copy=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,"clipboard",{value:{writeText:copy},configurable:true});
 server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>apiResponse({errorCode:"UPSTREAM_UNAVAILABLE"},503)));
 mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));expect(await screen.findByText(/문장 생성 서비스를 사용할 수 없습니다/)).toBeVisible();
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"직접 작성한 문의"}});fireEvent.click(screen.getByRole("button",{name:"문장 복사"}));await waitFor(()=>expect(copy).toHaveBeenCalledWith("직접 작성한 문의"));expect(screen.queryByRole("button",{name:/발송|전송/})).toBeNull();
});
it("handles stale generation and keeps the editor available",async()=>{server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>apiResponse({errorCode:"REPORT_SOURCE_STALE"},409)));mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));expect(await screen.findByText(/결과가 최신 상태가 아닙니다/)).toBeVisible();expect(screen.getByRole("textbox")).toBeEnabled()});
it("clears the editor on session generation changes",async()=>{mount(<InquiryScreen caseId={15}/>);fireEvent.change(screen.getByRole("textbox"),{target:{value:"개인 문장"}});act(()=>services.session.start("other-user-token"));expect(screen.getByRole("textbox")).toHaveValue("")});
it("uses only supported server filters and keeps name search local",async()=>{
 const urls:string[]=[];server.use(http.get(`${testApiUrl}/consultation-centers`,({request})=>{urls.push(request.url);return apiResponse({items:[{centerId:1,name:"예시 기관",region:"전국",categories:["임금"],phone:"javascript:bad",website:"javascript:bad",sourceUrl:"https://example.org/source",verifiedAt:"2026-11-10",dataSource:"MOCK",isNationwide:true}],page:1,size:20,total:1,nationwideFallbackUsed:true})}));
 mount(<CentersScreen/>);expect(await screen.findByText("예시 기관")).toBeVisible();expect(screen.getByText("지역 대신 전국 단위 대안을 표시합니다.")).toBeVisible();expect(screen.getByText(/개발용 예시 데이터/)).toBeVisible();expect(screen.getByRole("link",{name:"https://example.org/source"})).toHaveAttribute("rel","noopener noreferrer");expect(screen.getByText("검증일: 2026-11-10")).toBeVisible();expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
 fireEvent.change(screen.getByLabelText("지역"),{target:{value:"청주시"}});fireEvent.change(screen.getByLabelText("상담 분야"),{target:{value:"WAGE"}});fireEvent.click(screen.getByRole("button",{name:"기관 조회"}));await waitFor(()=>expect(urls.at(-1)).toContain("category=WAGE"));const count=urls.length;
 fireEvent.change(screen.getByLabelText("현재 페이지 기관명 검색"),{target:{value:"없는이름"}});expect(screen.getByText(/표시할 상담기관이 없습니다/)).toBeVisible();expect(urls.length).toBe(count);expect(urls.every(u=>!u.includes("search="))).toBe(true);
});
it("retries center errors without inventing contact data",async()=>{let failed=true;server.use(http.get(`${testApiUrl}/consultation-centers`,()=>failed?apiResponse({errorCode:"UPSTREAM_UNAVAILABLE"},503):apiResponse({items:[],page:1,size:20,total:0})));mount(<CentersScreen/>);const retry=await screen.findByRole("button",{name:/다시/});failed=false;fireEvent.click(retry);expect(await screen.findByText(/표시할 상담기관이 없습니다/)).toBeVisible()});
it("allows only safe phone and website schemes",()=>{expect(safeWebsite("javascript:alert(1)")).toBeUndefined();expect(safeWebsite("https://user:secret@example.org")).toBeUndefined();expect(safeWebsite("https://example.org")).toBe("https://example.org/");expect(safePhone("010-1234-5678")).toBe("tel:01012345678");expect(safePhone("123;ext=456")).toBeUndefined()});
it("keeps question navigation and the empty state",async()=>{server.use(http.get(`${testApiUrl}/cases/15/questions`,()=>apiResponse({questions:[{questionId:1,type:"MISSING_CONDITION",question:"서버 질문",reason:"서버 사유"}]})));const ui=mount(<QuestionsScreen caseId={15}/>);await screen.findByText("서버 질문");const article=screen.getByRole("article");expect(within(article).getByRole("link",{name:"계산 조건 확인"})).toHaveAttribute("href","/cases/15/conditions");expect(within(article).getByRole("link",{name:"문서 검토"})).toHaveAttribute("href","/cases/15/review");ui.unmount();server.use(http.get(`${testApiUrl}/cases/16/questions`,()=>apiResponse({questions:[]})));mount(<QuestionsScreen caseId={16}/>);expect(await screen.findByText("서버가 제공한 확인 질문이 없습니다.")).toBeVisible()});
it("requires explicit report confirmation, selects originals, prevents duplicate clicks and stops detail polling at READY",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);
 await services.auth.login({email:"worker@example.com",password:"password1234"});
 let posts=0,details=0;
 // Observers fall through to the same MSW scenario.
 server.use(http.post(`${testApiUrl}/cases/15/reports`,()=>{posts++}),http.get(`${testApiUrl}/cases/15/reports/:r`,()=>{details++}));
 mount(<ReportsScreen caseId={15}/>);
 const original=await screen.findByRole("checkbox",{name:"가상_급여명세서.pdf"});
 const generate=screen.getByRole("button",{name:"보고서 생성 요청"});expect(generate).toBeDisabled();
 fireEvent.click(original);fireEvent.click(screen.getByLabelText("선택 문서와 현재 결과로 보고서 생성을 요청합니다."));
 fireEvent.click(generate);fireEvent.click(generate);
 expect(await screen.findByText(/비동기 접수되었습니다/)).toBeVisible();expect(posts).toBe(1);
 expect((await supportApi(services.api).reports(15)).items[0].selectedDocumentIds).toEqual([101]);
 await waitFor(()=>expect(screen.getByRole("button",{name:"PDF 다운로드"})).toBeEnabled(),{timeout:8000});
 const seen=details;await act(async()=>{await new Promise(r=>setTimeout(r,2300))});expect(details).toBe(seen);
},15000);
