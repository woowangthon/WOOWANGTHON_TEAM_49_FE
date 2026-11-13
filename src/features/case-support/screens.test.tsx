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
import { ConsultationScreen } from "./consultation-screen";
import { SupportLinks } from "./support-navigation";
let pathname="/cases/15/questions";
vi.mock("next/navigation",()=>({usePathname:()=>pathname}));
let services:ReturnType<typeof createAppServices>;
beforeEach(async()=>{
 pathname="/cases/15/questions";
 services=createAppServices(testApiUrl);await services.auth.login({email:"worker@example.com",password:"password1234"});
 HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};
});
afterEach(()=>{cleanup();services.session.clear();services.queryClient.clear();vi.unstubAllGlobals();vi.restoreAllMocks()});
function mount(node:ReactNode){return render(<AppServicesContext value={services}><QueryClientProvider client={services.queryClient}>{node}</QueryClientProvider></AppServicesContext>)}
it("marks only the current support destination",()=>{
 mount(<SupportLinks caseId={15}/>);
 expect(screen.getByRole('link',{name:'확인 질문'})).toHaveAttribute('aria-current','page');
 expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});
it("selects a question directly from the full list and resets on case changes",async()=>{
 const questions=[1,2,3].map(id=>({questionId:id,relatedItemId:null,type:'MISSING_CONDITION',question:`질문 ${id}`,reason:`근거 ${id}`}));
 server.use(http.get(`${testApiUrl}/cases/:id/questions`,()=>apiResponse({questions})));
 const ui=mount(<QuestionsScreen caseId={15}/>);
 fireEvent.click(await screen.findByRole('button',{name:'3. 질문 3'}));
 expect(screen.getByRole('heading',{name:'질문 3'})).toBeVisible();
 expect(screen.getByRole('button',{name:'3. 질문 3'})).toHaveAttribute('aria-current','true');
 ui.rerender(<AppServicesContext value={services}><QueryClientProvider client={services.queryClient}><QuestionsScreen caseId={16}/></QueryClientProvider></AppServicesContext>);
 expect(await screen.findByRole('heading',{name:'질문 1'})).toBeVisible();
});
it("loads document pages beyond 100 and enforces the contract selection limit",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);await services.auth.login({email:'worker@example.com',password:'password1234'});
 const pages:number[]=[];
 server.use(http.get(`${testApiUrl}/cases/15/documents`,({request})=>{const page=Number(new URL(request.url).searchParams.get('page'));pages.push(page);return apiResponse({items:Array.from({length:page===1?100:1},(_,i)=>({documentId:(page-1)*100+i+1,workplaceId:3,documentType:'PAYSLIP',fileName:`file-${(page-1)*100+i+1}.pdf`,processingStatus:'READY',linkedCaseIds:[15],reviewStatus:'NOT_STARTED',progress:100,linkId:i+1,uploadedAt:'2026-11-09T00:00:00Z',errorCode:null,aiMetadata:null})),total:101,page,size:100})}));
 mount(<ReportsScreen caseId={15}/>);
 await screen.findByRole('checkbox',{name:'file-1.pdf'});
 expect(pages).toEqual([1,2]);
 fireEvent.click(screen.getByRole('button',{name:'전체 선택'}));
 expect(screen.getByText('선택한 원본 100개')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'선택 해제'}));
 expect(screen.getByText('선택한 원본 0개')).toBeVisible();
});
it("shows real preparation counts for each selected case and a creation link when empty",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);await services.auth.login({email:'worker@example.com',password:'password1234'});
 const item={caseId:15,workplaceId:3,workplace:{name:'근무지'},payType:'MONTHLY',periodStart:'2026-10-01',periodEnd:'2026-10-31',scheduledPayDate:null,status:'CREATED',currentStep:'UPLOAD',documentCount:0,latestCalculationId:null,inputVersion:1,attentionRequired:false,attentionCount:0,updatedAt:'2026-11-01T00:00:00Z'};
 server.use(http.get(`${testApiUrl}/cases`,()=>apiResponse({items:[item,{...item,caseId:16}],total:2,page:1,size:20})),http.get(`${testApiUrl}/cases/:id/questions`,({params})=>apiResponse({questions:params.id==='15'?[{questionId:1,relatedItemId:null,type:'MISSING_CONDITION',question:'확인',reason:'이유'}]:[]})),http.get(`${testApiUrl}/cases/:id/reports`,()=>apiResponse({items:[],total:0})));
 const ui=mount(<ConsultationScreen/>);const radios=await screen.findAllByRole('radio');
 expect(screen.queryByRole('region',{name:'선택한 내역의 상담 준비'})).toBeNull();
 fireEvent.click(radios[0]);expect(await screen.findByText('확인 질문 1개')).toBeVisible();
 const preparation=screen.getByRole('region',{name:'선택한 내역의 상담 준비'});
 expect(within(preparation).getByRole('link',{name:'확인 질문'})).toHaveAttribute('href','/cases/15/questions');
 expect(within(preparation).getByRole('link',{name:'회사 문의 초안'})).toHaveAttribute('href','/cases/15/company-inquiry');
 expect(within(preparation).getByRole('link',{name:'상담 자료 묶음'})).toHaveAttribute('href','/cases/15/reports');
 expect(screen.getByRole('link',{name:'상담기관 찾기'})).toHaveAttribute('href','/consultation-centers');
 fireEvent.click(radios[1]);expect(screen.queryByText('확인 질문 1개')).toBeNull();expect(await screen.findByText('확인 질문 0개')).toBeVisible();
 expect(screen.getAllByRole('navigation',{name:'상담 준비 메뉴'})).toHaveLength(1);
 ui.unmount(); services.queryClient.clear();
 server.use(http.get(`${testApiUrl}/cases`,()=>apiResponse({items:[],total:0,page:1,size:20})));
 mount(<ConsultationScreen/>);expect(await screen.findByRole('link',{name:'새 급여 내역 시작'})).toHaveAttribute('href','/cases/new');
});
it("shows one support question at a time while keeping inquiry and report routes accessible",async()=>{
 server.use(http.get(`${testApiUrl}/cases/15/questions`,()=>apiResponse({questions:[
  {questionId:1,relatedItemId:null,type:"MISSING_CONDITION",question:"첫 번째 확인 질문",reason:"첫 질문의 근거"},
  {questionId:2,relatedItemId:null,type:"MISSING_CONDITION",question:"두 번째 확인 질문",reason:"두 번째 근거"},
 ]})));
 mount(<QuestionsScreen caseId={15}/>);
 await screen.findByRole("heading",{name:"첫 번째 확인 질문"});
 expect(screen.getAllByRole("article")).toHaveLength(1);
 const navigation=screen.getByRole("navigation",{name:"확인 질문 이동"});
 expect(within(navigation).getByRole("button",{name:"이전"})).toBeDisabled();
 fireEvent.click(within(navigation).getByRole("button",{name:"다음"}));
 expect(screen.getByRole("heading",{name:"두 번째 확인 질문"})).toBeVisible();
 expect(screen.queryByRole("heading",{name:"첫 번째 확인 질문"})).not.toBeInTheDocument();
 expect(within(navigation).getByRole("button",{name:"다음"})).toBeDisabled();
 fireEvent.click(within(navigation).getByRole("button",{name:"이전"}));
 expect(screen.getByRole("heading",{name:"첫 번째 확인 질문"})).toBeVisible();
 expect(screen.getByRole("link",{name:"회사 문의 초안"})).toHaveAttribute("href","/cases/15/company-inquiry");
 expect(screen.getByRole("link",{name:"상담 자료 묶음"})).toHaveAttribute("href","/cases/15/reports");
});
it("preserves selected originals across local pages without a mutation",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);
 server.use(...mock.handlers);
 await services.auth.login({email:"worker@example.com",password:"password1234"});
 let posts=0;
 server.use(http.get(`${testApiUrl}/cases/15/documents`,()=>apiResponse({items:Array.from({length:11},(_,i)=>({documentId:i+201,workplaceId:3,documentType:"PAYSLIP",fileName:`original-${i+1}.pdf`,processingStatus:"READY",linkId:i+1,reviewStatus:"NOT_STARTED",progress:100,linkedCaseIds:[15],uploadedAt:"2026-11-09T00:00:00Z",errorCode:null,aiMetadata:null})),total:11,page:1,size:100})),http.post(`${testApiUrl}/cases/15/reports`,()=>{posts++;return apiResponse({},500)}));
 mount(<ReportsScreen caseId={15}/>);
 fireEvent.click(await screen.findByRole('checkbox',{name:'original-1.pdf'}));
 fireEvent.click(screen.getByRole('button',{name:'다음 원본'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'original-6.pdf'}));
 fireEvent.click(screen.getByRole('button',{name:'이전 원본'}));
 expect(screen.getByRole('checkbox',{name:'original-1.pdf'})).toBeChecked();
 fireEvent.click(screen.getByRole('button',{name:'다음 원본'}));
 expect(screen.getByRole('checkbox',{name:'original-6.pdf'})).toBeChecked();
 expect(screen.getByText('선택한 원본 2개')).toBeVisible();expect(posts).toBe(0);
});
it("navigates report history past twenty records and back",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);await services.auth.login({email:"worker@example.com",password:"password1234"});
 const api=supportApi(services.api);for(let i=0;i<21;i++)await api.create(15,[],`audit-${i}`);
 mount(<ReportsScreen caseId={15}/>);await screen.findByRole("heading",{name:/보고서 #110/});
 await waitFor(()=>expect(screen.getByRole("button",{name:"다음 보고서"})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:"다음 보고서"}));expect(await screen.findByRole("heading",{name:/보고서 #90/})).toBeVisible();
 expect(screen.getByRole("button",{name:"다음 보고서"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"이전 보고서"}));expect(await screen.findByRole("heading",{name:/보고서 #110/})).toBeVisible();
});
it("shows the server original separately and never overwrites an in-flight edit",async()=>{
 let finish:()=>void=()=>{};const pending=new Promise<void>(resolve=>{finish=resolve});let count=0;
 server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,async({request})=>{count++;expect(await request.json()).toEqual({});await pending;return apiResponse({text:"서버 원문 0원 · 미확인 금액은 null",requiresUserReview:true,basedOnResultVersions:{comparison:3}})}));
 mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"요청 중 편집"}});finish();
 expect(await screen.findByRole("region",{name:"서버 생성 원문"})).toBeVisible();expect(screen.getByRole("textbox")).toHaveValue("요청 중 편집");fireEvent.click(screen.getByText("서버 생성 원문 · 적용 및 기준 보기"));expect(screen.getByText("사용자 검토 필수")).toBeVisible();expect(count).toBe(1);
 fireEvent.click(screen.getByRole("button",{name:"서버 초안 재생성"}));expect(screen.getByRole("dialog")).toHaveTextContent("작성 중인 문장은 유지");fireEvent.click(screen.getByRole("button",{name:"취소"}));expect(count).toBe(1);
});
it("preserves the editor when clipboard access fails",async()=>{
 Object.defineProperty(navigator,"clipboard",{value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))},configurable:true});
 mount(<InquiryScreen caseId={15}/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'보존할 문의'}});
 fireEvent.click(screen.getByRole('button',{name:'문장 복사'}));
 expect(await screen.findByText(/복사하지 못했습니다/)).toBeVisible();
 expect(screen.getByRole('textbox')).toHaveValue('보존할 문의');
});
it("explains an empty server draft without replacing the editor",async()=>{
 server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>apiResponse({text:'',requiresUserReview:true})));
 mount(<InquiryScreen caseId={15}/>);
 fireEvent.click(screen.getByRole('button',{name:'서버 초안 생성'}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'작성 중 문장'}});
 expect(await screen.findByText(/생성된 초안이 비어 있습니다/)).toBeVisible();
 expect(screen.getByRole('button',{name:'초안 편집하기'})).toBeDisabled();
 expect(screen.getByRole('textbox')).toHaveValue('작성 중 문장');
 expect(screen.getByText('사용자 검토 필수')).toBeVisible();
});
it("keeps polling the requested report after navigating the history",async()=>{
 const mock=createDevelopmentScenario(testApiUrl);server.use(...mock.handlers);
 await services.auth.login({email:"worker@example.com",password:"password1234"});
 const api=supportApi(services.api);for(let i=0;i<21;i++)await api.create(15,[],`track-${i}`);
 let polls=0;
 server.use(http.get(`${testApiUrl}/cases/15/reports/111`,()=>{polls++;return apiResponse({reportId:111,version:1,status:polls<3?'PROCESSING':'READY',basedOnInputVersion:7,referencedSnapshots:{},selectedDocumentIds:[],createdAt:'2026-11-11T01:00:00Z',isCurrent:true})}));
 mount(<ReportsScreen caseId={15}/>);
 fireEvent.click(await screen.findByLabelText('선택 문서와 현재 결과로 보고서 생성을 요청합니다.'));
 await waitFor(()=>expect(screen.getByRole('button',{name:'보고서 생성 요청'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'보고서 생성 요청'}));
 const tracking=await screen.findByRole('region',{name:'현재 생성 요청'});
 await waitFor(()=>expect(screen.getByRole('button',{name:'다음 보고서'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'다음 보고서'}));
 expect(tracking).toBeVisible();
 await waitFor(()=>expect(within(tracking).getByRole('button',{name:'PDF 다운로드'})).toBeEnabled(),{timeout:10000});
 expect(polls).toBeGreaterThanOrEqual(3);
},15000);
it("allows direct edits and copies while generation fails",async()=>{
 const copy=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,"clipboard",{value:{writeText:copy},configurable:true});
 server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>apiResponse({errorCode:"UPSTREAM_UNAVAILABLE"},503)));
 mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));expect(await screen.findByText(/문장 생성 서비스를 사용할 수 없습니다/)).toBeVisible();
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"직접 작성한 문의"}});fireEvent.click(screen.getByRole("button",{name:"문장 복사"}));await waitFor(()=>expect(copy).toHaveBeenCalledWith("직접 작성한 문의"));expect(screen.queryByRole("button",{name:/발송|전송/})).toBeNull();
});
it("handles stale generation and keeps the editor available",async()=>{server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>apiResponse({errorCode:"REPORT_SOURCE_STALE"},409)));mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole("button",{name:"서버 초안 생성"}));expect(await screen.findByText(/결과가 최신 상태가 아닙니다/)).toBeVisible();expect(screen.getByRole("textbox")).toBeEnabled()});
it("clears the editor on session generation changes",async()=>{mount(<InquiryScreen caseId={15}/>);fireEvent.change(screen.getByRole("textbox"),{target:{value:"개인 문장"}});act(()=>services.session.start("other-user-token"));expect(screen.getByRole("textbox")).toHaveValue("")});
it("uses supported server filters and removes local name search",async()=>{
 const urls:string[]=[];server.use(http.get(`${testApiUrl}/consultation-centers`,({request})=>{urls.push(request.url);return apiResponse({items:[{centerId:1,name:"예시 기관",region:"전국",categories:["임금"],phone:"javascript:bad",website:"javascript:bad",businessHours:null,languages:null,visitInformation:null,notes:"example",sourceUrl:"https://example.org/source",verifiedAt:"2026-11-10",dataSource:"MOCK",isNationwide:true}],page:1,size:20,total:1,nationwideFallbackUsed:true,dataStatus:"NATIONWIDE_ONLY"})}));
 mount(<CentersScreen/>);expect(await screen.findByText("예시 기관")).toBeVisible();expect(screen.getByText("지역 대신 전국 단위 대안을 표시합니다.")).toBeVisible();expect(screen.getByText(/개발용 예시 데이터/)).toBeVisible();expect(screen.getByRole("link",{name:"https://example.org/source"})).toHaveAttribute("rel","noopener noreferrer");expect(screen.getByText("검증일: 2026-11-10")).toBeVisible();expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
 fireEvent.change(screen.getByLabelText("지역"),{target:{value:"청주시"}});fireEvent.change(screen.getByLabelText("상담 분야"),{target:{value:"WAGE"}});fireEvent.click(screen.getByRole("button",{name:"기관 조회"}));await waitFor(()=>expect(urls.at(-1)).toContain("category=WAGE"));expect(urls.at(-1)).toContain("region=");
 expect(screen.getAllByRole("textbox")).toHaveLength(1);
 expect(document.querySelector("details")).toBeNull();
 expect(screen.queryByText("현재 전국 단위 상담기관 정보만 제공됩니다.")).toBeNull();
 expect(screen.queryByText("이 페이지에서 기관명 찾기")).toBeNull();
 expect(urls.every(u=>!u.includes("search="))).toBe(true);
});
it("retries center errors without inventing contact data",async()=>{let failed=true;server.use(http.get(`${testApiUrl}/consultation-centers`,()=>failed?apiResponse({errorCode:"UPSTREAM_UNAVAILABLE"},503):apiResponse({items:[],page:1,size:20,total:0,nationwideFallbackUsed:false,dataStatus:"AVAILABLE"})));mount(<CentersScreen/>);const retry=await screen.findByRole("button",{name:/다시/});failed=false;fireEvent.click(retry);expect(await screen.findByText(/표시할 상담기관이 없습니다/)).toBeVisible()});
it("allows only safe phone and website schemes",()=>{expect(safeWebsite("javascript:alert(1)")).toBeUndefined();expect(safeWebsite("https://user:secret@example.org")).toBeUndefined();expect(safeWebsite("https://example.org")).toBe("https://example.org/");expect(safePhone("010-1234-5678")).toBe("tel:01012345678");expect(safePhone("123;ext=456")).toBeUndefined()});
it("shows only supplied center contact and visit details",async()=>{
 server.use(http.get(`${testApiUrl}/consultation-centers`,()=>apiResponse({items:[{centerId:3,name:"지역 상담소",region:"청주시",categories:["임금"],phone:"043-123-4567",website:"https://example.org",businessHours:"평일 09:00–18:00",languages:["한국어"],visitInformation:"방문 전 전화",notes:"",sourceUrl:"https://example.org/source",verifiedAt:"2026-11-10",dataSource:"OFFICIAL",isNationwide:false}],page:1,size:20,total:1,nationwideFallbackUsed:false,dataStatus:"AVAILABLE"})));
 mount(<CentersScreen/>);
 expect(await screen.findByRole('heading',{name:'지역 상담소'})).toBeVisible();
 expect(screen.getByRole('link',{name:'043-123-4567'})).toHaveAttribute('href','tel:0431234567');
 expect(screen.getByText('평일 09:00–18:00')).toBeVisible();
 expect(screen.getByText('한국어')).toBeVisible();
 expect(screen.getByText('방문 전 전화')).toBeVisible();
 expect(screen.queryByRole('link',{name:/지도|길찾기/})).not.toBeInTheDocument();
});
it("keeps question navigation and the empty state",async()=>{server.use(http.get(`${testApiUrl}/cases/15/questions`,()=>apiResponse({questions:[{questionId:1,relatedItemId:null,type:"MISSING_CONDITION",question:"서버 질문",reason:"서버 사유"}]})));const ui=mount(<QuestionsScreen caseId={15}/>);await screen.findByText("서버 질문");const article=screen.getByRole("article");expect(within(article).getByRole("link",{name:"계산 조건 확인"})).toHaveAttribute("href","/cases/15/conditions");fireEvent.click(within(article).getByText("자료 보완·질문 상세"));expect(within(article).getByRole("link",{name:"문서 검토"})).toHaveAttribute("href","/cases/15/review");ui.unmount();server.use(http.get(`${testApiUrl}/cases/16/questions`,()=>apiResponse({questions:[]})));mount(<QuestionsScreen caseId={16}/>);expect(await screen.findByText("서버가 제공한 확인 질문이 없습니다.")).toBeVisible()});
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
it("confirms replacing only the local draft, preserves cancel without another API call",async()=>{
 let calls=0;server.use(http.post(`${testApiUrl}/cases/15/company-inquiry`,()=>{calls++;return apiResponse({text:"서버 새 원문",requiresUserReview:true})}));
 mount(<InquiryScreen caseId={15}/>);fireEvent.click(screen.getByRole('button',{name:'서버 초안 생성'}));await screen.findByText('서버 새 원문');
 fireEvent.click(screen.getByText('서버 생성 원문 · 적용 및 기준 보기'));fireEvent.change(screen.getByRole('textbox'),{target:{value:'보존할 작성본'}});const trigger=screen.getByRole('button',{name:'작성본 교체 확인'});trigger.focus();fireEvent.click(trigger);
 expect(screen.getByRole('dialog')).toHaveTextContent('기존 작성 내용은 사라집니다');fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(screen.getByRole('textbox')).toHaveValue('보존할 작성본');
 fireEvent.click(trigger);fireEvent.click(screen.getByRole('button',{name:'작성본 교체'}));expect(screen.getByRole('textbox')).toHaveValue('서버 새 원문');expect(calls).toBe(1);expect(screen.queryByRole('dialog')).toBeNull();
});

it.each(["/consultation", "/cases/15/questions", "/cases/15/company-inquiry", "/cases/15/reports", "/consultation-centers"])("keeps five destinations and one active link at %s", path => {
 pathname=path;
 mount(<SupportLinks caseId={15}/>);
 const links=screen.getAllByRole("link");
 expect(links).toHaveLength(5);
 expect(links.filter(link=>link.getAttribute("aria-current")==="page").map(link=>link.getAttribute("href"))).toEqual([path]);
});
it("guides case-free navigation to selection and preserves explicit selection until logout", () => {
 pathname="/consultation-centers";
 mount(<SupportLinks/>);
 expect(screen.getAllByRole("link")[1]).toHaveAttribute("href","/consultation#consultation-case-selection");
 act(()=>services.consultationSelection.setState({caseId:16}));
 expect(screen.getAllByRole("link")[1]).toHaveAttribute("href","/cases/16/questions");
 act(()=>services.session.clear());
 expect(screen.getAllByRole("link")[2]).toHaveAttribute("href","/consultation#consultation-case-selection");
});
it("keeps consultation navigation available while loading and retries a failed case list", async () => {
 let finish: () => void = () => {};
 const pending = new Promise<void>(resolve => { finish = resolve; });
 let failed = true;
 server.use(http.get(`${testApiUrl}/cases`, async () => {
  await pending;
  return failed ? apiResponse({errorCode:"UPSTREAM_UNAVAILABLE"},503) : apiResponse({items:[],page:1,size:20,total:0});
 }));
 mount(<ConsultationScreen/>);
 expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
 expect(screen.getAllByRole('navigation',{name:'상담 준비 메뉴'})).toHaveLength(1);
 finish();
 await screen.findByRole('alert');
 failed = false;
 fireEvent.click(screen.getByRole('button',{name:/다시/}));
 expect(await screen.findByRole('link',{name:'새 급여 내역 시작'})).toHaveAttribute('href','/cases/new');
});
