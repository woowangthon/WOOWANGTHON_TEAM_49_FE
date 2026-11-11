import { caseDocumentResponse } from "@/mocks/shared/document-handlers";
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { File as NodeFile } from "node:buffer";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { businessKeys } from "@/lib/query/business-keys";
import { documentMocks } from "@/test/document-handlers";
import { managementMocks } from "@/test/management-handlers";
import { server, apiResponse, testApiUrl } from "@/test/server";
import { CaseUploadScreen, LibraryScreen, WorkplaceDocumentsScreen } from "./components/document-screens";
import { DocumentCard } from "./components/document-card";
import { UploadForm } from "./components/upload-form";
import { LinkForm } from "./components/link-form";
import { documentApi } from "./api";
import { documentKeys, useRecomputeStatus } from "./queries";
import { revokeDocumentScope } from "./cache";
import { MAX_FILE_SIZE, validateFile, validateImageDimensions } from "./file-validation";
import { caseDocumentSchema, documentSchema } from "./schemas";
const nav = vi.hoisted(() => ({replace: vi.fn()}));
vi.mock("next/navigation", () => ({useRouter: () => nav, usePathname: () => "/library", useSearchParams: () => new URLSearchParams()}));
const apps: AppServices[] = [];
// Match Node fetch's WHATWG multipart classes instead of jsdom's incompatible File streams.
beforeEach(async () => {
  const nativeForm = await new Response(new URLSearchParams()).formData();
  vi.stubGlobal("FormData", nativeForm.constructor);
  vi.stubGlobal("File", NodeFile);
});
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
afterEach(() => { cleanup(); apps.splice(0).forEach(app => { app.session.clear(); app.queryClient.clear(); }); vi.unstubAllGlobals(); });
async function setup() {
  const management = managementMocks(); const mocks = documentMocks(management.getCases());
  server.use(...mocks.handlers, ...management.handlers);
  const app = createAppServices(); apps.push(app); await app.auth.login({email: "worker@example.com", password: "password1234"});
  const mount = (node: ReactNode) => render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><AuthGate mode="protected">{node}</AuthGate></QueryClientProvider></AppServicesContext>);
  return {app, mocks, management, mount, user: userEvent.setup()};
}
const pdf = () => new File(["%PDF-1.7 test fixture"], "새자료.pdf", {type: "application/pdf"});
describe("document flows with MSW, never a live backend", () => {
  it("lists original documents, filters on the server and paginates", async () => {
    const {mount, user, mocks} = await setup(); mount(<LibraryScreen />);
    expect(await screen.findByRole("article", {name: "근로계약서.pdf"})).toBeVisible();
    await user.click(screen.getAllByRole("button", {name: "다음"}).at(-1)!);
    expect(await screen.findByRole("article", {name: "급여명세서-20.pdf"})).toBeVisible();
    await user.selectOptions(screen.getByLabelText("문서 유형 필터"), "CONTRACT");
    expect(await screen.findByRole("article", {name: "근로계약서.pdf"})).toBeVisible();
    await user.selectOptions(screen.getByLabelText("처리 상태 필터"), "FAILED");
    expect(await screen.findByText("현재 페이지에 검색 결과가 없습니다.")).toBeVisible();
    expect(mocks.requests.some(r => r.path.includes("processingStatus=FAILED"))).toBe(false);
    expect(mocks.requests.some(r => r.path.includes("page=2&size=20"))).toBe(true);
  });
  it("filters workplaces and confines filename search to the current page", async () => {
    const {mount, user, mocks} = await setup(); mount(<LibraryScreen />); await screen.findByRole("article", {name: "근로계약서.pdf"});
    await user.type(screen.getByLabelText("현재 페이지 파일명 검색"), "없는 자료");
    expect(screen.getByText("현재 페이지에 검색 결과가 없습니다.")).toBeVisible();
    expect(mocks.requests.filter(r => r.path.includes("/documents?") && r.method === "GET")).toHaveLength(1);
    await user.click(screen.getByText("근무지 필터 (전체 근무지)"));
    await user.click(await screen.findByRole("radio", {name:"카페 나무"}));
    await waitFor(() => expect(mocks.requests.some(r => r.path.includes("workplaceId=3"))).toBe(true));
    expect(mocks.requests.every(r => !r.path.includes("search="))).toBe(true);
  });
  it("renders workplace shared originals and its upload form", async () => {
    const {mount, user} = await setup(); mount(<WorkplaceDocumentsScreen id={3} />);
    expect(await screen.findByRole("heading", {name: "카페 나무 자료함"})).toBeVisible();
    expect(await screen.findByRole("article", {name: "근로계약서.pdf"})).toHaveTextContent("연결 사례 2개");
    await user.click(screen.getByText("자료 추가",{exact:true}));
    expect(screen.getByRole("form", {name: "새 파일 업로드"})).toBeVisible();
  });
  it.each(["case", "workplace"] as const)("uploads one multipart file to %s, invalidates dependent caches", async kind => {
    const {app, mount, user, mocks} = await setup(); const g = app.session.getSnapshot().generation;
    const cacheKeys = [businessKeys.case(g,15), [...businessKeys.case(g,15), "readiness"], [...businessKeys.case(g,15), "results"], documentKeys.list(g,{kind: "library"},{page:1,size:20})];
    cacheKeys.forEach(key => app.queryClient.setQueryData(key, {old: true}));
    mount(<UploadForm context={{kind, id: kind === "case" ? 15 : 3}} />);
    await user.upload(screen.getByLabelText("파일 선택 또는 이곳에 끌어 놓기"), pdf());
    await user.click(screen.getByRole("button", {name: "파일 업로드"}));
    expect(await screen.findByText(/업로드가 접수되었습니다/)).toBeVisible();
    expect(mocks.requests.find(r => r.method === "POST")?.body).toMatchObject({documentType: "PAYSLIP", fileName: "새자료.pdf"});
    cacheKeys.forEach(key => expect(app.queryClient.getQueryState(key)?.isInvalidated).toBe(true));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it.each([413,415,422,500])("shows upload server error %s and keeps the file for explicit retry", async status => {
    const {mount, user} = await setup(); server.use(http.post(`${testApiUrl}/cases/15/documents`, () => apiResponse({errorCode: "INVALID_FILE"}, status)));
    mount(<UploadForm context={{kind:"case",id:15}} />);
    await user.upload(screen.getByLabelText("파일 선택 또는 이곳에 끌어 놓기"), pdf()); await user.click(screen.getByRole("button", {name:"파일 업로드"}));
    expect(await screen.findByRole("alert")).toBeVisible(); expect(screen.getByRole("button",{name:"파일 업로드"})).toBeEnabled();
    expect(screen.getAllByText("새자료.pdf").length).toBeGreaterThan(0);
  });
  it("validates empty, oversized, unknown and mismatched files; accepts exactly 20MiB", () => {
    expect(validateFile(new File([],"empty.pdf",{type:"application/pdf"}))).toContain("빈 파일");
    const file = pdf(); Object.defineProperty(file, "size", {value:MAX_FILE_SIZE+1}); expect(validateFile(file)).toContain("20MiB");
    const boundary = pdf(); Object.defineProperty(boundary, "size", {value:MAX_FILE_SIZE}); expect(validateFile(boundary)).toBeUndefined();
    expect(validateFile(new File(["x"],"a.exe",{type:"application/pdf"}))).toContain("MIME");
    expect(validateFile(new File(["x"],"a.png",{type:"image/jpeg"}))).toContain("MIME");
    expect(validateFile(new File(["x"],"a.PNG",{type:"image/png"}))).toBeUndefined();
  });
  it("checks image dimensions when decoding is available and releases the bitmap", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({width:10001,height:100,close}));
    expect(await validateImageDimensions(new File(["x"],"a.png",{type:"image/png"}))).toContain("10000px"); expect(close).toHaveBeenCalled();
  });
  it("accepts drag and drop and rejects multiple files without sending requests", async () => {
    const {mount, mocks} = await setup(); mount(<UploadForm context={{kind:"case",id:15}} />);
    const zone = screen.getByLabelText("파일 선택 또는 이곳에 끌어 놓기").parentElement!;
    fireEvent.drop(zone,{dataTransfer:{files:[pdf(),pdf()]}}); expect(screen.getByRole("alert")).toHaveTextContent("한 번에 파일 하나");
    fireEvent.drop(zone,{dataTransfer:{files:[pdf()]}}); expect(screen.getByText("새자료.pdf")).toBeVisible();
    expect(mocks.requests).toHaveLength(0);
  });
  it.each(["READ_READY","READY","REVIEW_REQUIRED","FAILED"] as const)("polls every 2s and stops on %s and unmount", async terminal => {
    const {mount, mocks} = await setup(); const dto = {...mocks.getDocuments()[0], processingStatus:"UPLOADED" as const}; let calls=0;
    server.use(http.get(`${testApiUrl}/cases/15/documents/101`, () => { calls++; return apiResponse({documentId:101, processingStatus:calls===1 ? "PROCESSING" : terminal, reviewStatus:"NOT_STARTED", progress: calls===1 ? 40 : null}); }));
    const view = mount(<DocumentCard dto={dto} context={{kind:"case",id:15}} />);
    await screen.findByText("서버 문서 처리 40%");
    await waitFor(() => expect(calls).toBe(2), {timeout:3500});
    await new Promise(resolve => setTimeout(resolve,2200)); expect(calls).toBe(2); view.unmount();
  }, 8000);
  it("connects an existing shared original with nullable dates and current version", async () => {
    const {mount,user,mocks} = await setup(); mount(<LinkForm caseId={15} documentId={102} inputVersion={7} onDone={() => {}} />);
    await user.type(screen.getByLabelText("연결 목적"),"CONTRACT_FOR_PERIOD"); await user.click(screen.getByRole("button",{name:"이 원본 연결"}));
    await waitFor(() => expect(mocks.getLinks()).toHaveLength(2));
    expect(mocks.requests.find(r => r.method==="POST")?.body).toEqual({documentId:102,purpose:"CONTRACT_FOR_PERIOD",applicableFrom:null,applicableTo:null,expectedInputVersion:7});
  });
  it("reports duplicate links and never retries POST automatically", async () => {
    const {mount,user,mocks} = await setup(); mount(<LinkForm caseId={15} documentId={101} inputVersion={7} onDone={() => {}} />);
    await user.type(screen.getByLabelText("연결 목적"),"CONTRACT_FOR_PERIOD"); await user.click(screen.getByRole("button",{name:"이 원본 연결"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("이미 연결된 문서"); expect(mocks.requests.filter(r=>r.method==="POST")).toHaveLength(1);
  });
  it("blocks stale-version resubmission, preserves the draft and reloads explicitly", async () => {
    const {mount,user,mocks,management} = await setup(); management.getCases()[0].inputVersion=8;
    mount(<LinkForm caseId={15} documentId={102} inputVersion={7} onDone={() => {}} />);
    await user.type(screen.getByLabelText("연결 목적"),"CONTRACT_FOR_PERIOD"); await user.click(screen.getByRole("button",{name:"이 원본 연결"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("다른 변경"); expect(screen.getByRole("button",{name:"이 원본 연결"})).toBeDisabled();
    expect(screen.getByLabelText("연결 목적")).toHaveValue("CONTRACT_FOR_PERIOD");
    await user.click(screen.getByRole("button",{name:"최신 버전 확인 후 현재 입력으로 다시 편집"}));
    await user.click(screen.getByRole("button",{name:"이 원본 연결"}));
    await waitFor(()=>expect(mocks.getLinks()).toHaveLength(2));
    expect(mocks.requests.filter(r=>r.method==="POST").at(-1)?.body?.expectedInputVersion).toBe(8);
  });
  it("edits link purpose/period with PATCH without changing the original", async () => {
    const {mount,user,mocks} = await setup(); const link=mocks.getLinks()[0];
    mount(<LinkForm caseId={15} documentId={101} link={link} inputVersion={7} onDone={()=>{}} />);
    fireEvent.change(screen.getByLabelText("적용 종료일 (선택)"),{target:{value:"2026-11-03"}});
    await user.click(screen.getByRole("button",{name:"연결 정보 저장"}));
    await waitFor(()=>expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(true));
    expect(mocks.getLinks()[0].applicableTo).toBe("2026-11-03"); expect(mocks.getDocuments()).toHaveLength(21);
  });
  it("unlinks only the Case link, preserving original and other Case references", async () => {
    const {mount,user,mocks} = await setup(); mount(<DocumentCard dto={{...mocks.getDocuments()[0],linkId:mocks.getLinks()[0].linkId}} context={{kind:"case",id:15}} inputVersion={7} />);
    await user.click(screen.getByRole("button",{name:"이 사례 연결 해제"}));
    expect(screen.getByRole("dialog")).toHaveTextContent("공유 원본과 다른 사례의 연결은 보존");
    await user.click(screen.getByRole("button",{name:"연결만 해제"})); await waitFor(()=>expect(mocks.getLinks()).toHaveLength(0));
    expect(mocks.getDocuments()[0].linkedCaseIds).toEqual([16]); expect(mocks.requests.find(r=>r.method==="DELETE")?.path).toContain("document-links/777");
  });
  it("requires fresh impact and explicit acknowledgement before original deletion", async () => {
    const {mount,user,mocks} = await setup(); mount(<DocumentCard dto={mocks.getDocuments()[0]} context={{kind:"library"}} />);
    await user.click(screen.getByText("자료 관리 상세",{exact:true})); await user.click(screen.getByRole("button",{name:"공유 원본 삭제"}));
    const dialog=screen.getByRole("dialog"); await within(dialog).findByText("이 원본을 참조하는 사례: 2개");
    expect(within(dialog).getByRole("button",{name:"공유 원본 삭제 요청"})).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox")); await user.click(within(dialog).getByRole("button",{name:"공유 원본 삭제 요청"}));
    await waitFor(()=>expect(mocks.getDocuments()).toHaveLength(20));
    expect(mocks.requests.find(r=>r.method==="DELETE")?.path).toBe("/api/v1/workplaces/3/documents/101?confirm=true");
  });
  it("blocks deletion when impact lookup fails", async () => {
    const {mount,user,mocks} = await setup(); server.use(http.get(`${testApiUrl}/workplaces/3/documents/101/deletion-impact`,()=>apiResponse({},403)));
    mount(<DocumentCard dto={mocks.getDocuments()[0]} context={{kind:"library"}} />); await user.click(screen.getByText("자료 관리 상세",{exact:true})); await user.click(screen.getByRole("button",{name:"공유 원본 삭제"}));
    await within(screen.getByRole("dialog")).findByRole("alert"); expect(screen.getByRole("button",{name:"공유 원본 삭제 요청"})).toBeDisabled();
    expect(mocks.requests.some(r=>r.method==="DELETE")).toBe(false);
  });
  it("retries a failed document using its Case retry endpoint", async () => {
    const {mount,user,mocks} = await setup(); const dto={...mocks.getDocuments()[0],processingStatus:"FAILED" as const};
    mount(<DocumentCard dto={dto} context={{kind:"case",id:15}} />); await user.click(screen.getByRole("button",{name:"문서 재처리"}));
    await waitFor(()=>expect(mocks.requests.some(r=>r.path.endsWith("/documents/101/retry"))).toBe(true));
  });
  it("handles 403/404 without repeated polling and supports explicit list retry", async () => {
    const {mount,user} = await setup(); server.use(http.get(`${testApiUrl}/documents`,()=>apiResponse({},404)));
    mount(<LibraryScreen />); expect(await screen.findByRole("alert")).toHaveTextContent("자료를 찾을 수 없습니다");
    server.use(http.get(`${testApiUrl}/documents`,()=>apiResponse({items:[],page:1,size:20,total:0})));
    await user.click(screen.getByRole("button",{name:"다시 시도"})); expect(await screen.findByText("등록된 자료가 없습니다")).toBeVisible();
  });
  it("clears authenticated document caches on session expiry", async () => {
    const {app,mount} = await setup(); server.use(http.get(`${testApiUrl}/documents`,()=>apiResponse({errorCode:"TOKEN_EXPIRED"},401)));
    mount(<LibraryScreen />); await waitFor(()=>expect(app.session.getSnapshot().accessToken).toBeNull());
    expect(app.queryClient.getQueryCache().findAll({queryKey:documentKeys.root(1)})).toHaveLength(0);
  });
  it("renders Case upload, linked and existing-original sections", async () => {
    const {mount,user} = await setup(); mount(<CaseUploadScreen id={15} />);
    expect(await screen.findByRole("heading",{name:"카페 나무 자료 등록"})).toBeVisible();
    await user.click(screen.getByRole("button",{name:"기존 자료 연결"}));
    expect(await screen.findByRole("region",{name:"근무지 기존 원본 연결"})).toBeVisible();
    expect(await screen.findByText(/작업 종료는 모든 계산의 완료나 일치를 뜻하지 않습니다/)).toBeVisible();
  });
  it("rejects missing required metadata and null progress", () => {
 expect(documentSchema.safeParse({documentId:1,workplaceId:3,documentType:"PAYSLIP",fileName:"a.pdf",processingStatus:"READY",progress:null}).success).toBe(false);
 });
  it("shares refresh for multipart 401s and preserves the same file on retry", async () => {
    const {app} = await setup(); let uploads=0; let refreshes=0;
    server.use(http.post(`${testApiUrl}/auth/refresh`,()=>{refreshes++;return apiResponse({accessToken:"rotated",tokenType:"Bearer",expiresIn:1800});}),http.post(`${testApiUrl}/cases/15/documents`,async ({request})=>{uploads++; expect((await request.formData()).get("documentType")).toBe("PAYSLIP");return request.headers.get("Authorization")==="Bearer rotated" ? apiResponse({documentId:122,processingStatus:"UPLOADED",reviewStatus:"NOT_STARTED"},202) : apiResponse({},401);}));
    await Promise.all([documentApi(app.api).upload({kind:"case",id:15},pdf(),"PAYSLIP"),documentApi(app.api).upload({kind:"case",id:15},pdf(),"PAYSLIP")]);
    expect(refreshes).toBe(1); expect(uploads).toBe(4);
  });
  it("aborts a pending detail request on unmount", async () => {
    const {mount,mocks}=await setup(); let aborted=false; let started=false;
    server.use(http.get(`${testApiUrl}/cases/15/documents/101`,({request})=>new Promise<Response>(resolve=>{started=true;request.signal.addEventListener("abort",()=>{aborted=true;resolve(new HttpResponse(null,{status:499}));});})));
    const view=mount(<DocumentCard dto={{...mocks.getDocuments()[0],processingStatus:"PROCESSING"}} context={{kind:"case",id:15}} />);
    await waitFor(()=>expect(started).toBe(true)); view.unmount(); await waitFor(()=>expect(aborted).toBe(true));
  });
  it("requires a new impact acknowledgement after delete conflict", async () => {
    const {mount,user,mocks}=await setup(); let deletes=0;
    server.use(http.delete(`${testApiUrl}/workplaces/3/documents/101`,()=>{deletes++;return apiResponse({errorCode:"DOCUMENT_SHARED_REFERENCES_EXIST"},409);}));
    mount(<DocumentCard dto={mocks.getDocuments()[0]} context={{kind:"library"}} />);
    await user.click(screen.getByText("자료 관리 상세",{exact:true})); await user.click(screen.getByRole("button",{name:"공유 원본 삭제"})); await screen.findByRole("checkbox");
    await user.click(screen.getByRole("checkbox")); await user.click(screen.getByRole("button",{name:"공유 원본 삭제 요청"}));
    expect(await screen.findByText(/다른 사례의 참조가 변경되었습니다/)).toBeVisible();
    expect(screen.getByRole("button",{name:"공유 원본 삭제 요청"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"삭제 영향 다시 확인"}));
    expect(screen.getByRole("checkbox")).not.toBeChecked(); expect(deletes).toBe(1);
  });
  it("disables Case additions at the 20-link limit", async () => {
    const {mount,mocks,user}=await setup();
    server.use(http.get(`${testApiUrl}/cases/15/documents`,()=>apiResponse({items:[caseDocumentResponse(mocks.getDocuments()[0], mocks.getLinks()[0].linkId)],page:1,size:20,total:20})));
    mount(<CaseUploadScreen id={15} />); await screen.findByText(/사례에는 문서를 최대 20개/);
    expect(screen.getByRole("button",{name:"파일 업로드"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"기존 자료 연결"}));
    await waitFor(()=>expect(screen.getAllByRole("button",{name:"기존 원본 선택"}).every(button=>button.hasAttribute("disabled"))).toBe(true));
  });
  it("prevents duplicate upload submits and permits cancelling the request wait", async () => {
    const {mount,user}=await setup(); let uploads=0;
    server.use(http.post(`${testApiUrl}/cases/15/documents`,({request})=>new Promise<Response>(resolve=>{uploads++; request.signal.addEventListener("abort",()=>resolve(new HttpResponse(null,{status:499})));})));
    mount(<UploadForm context={{kind:"case",id:15}} />);
    await user.upload(screen.getByLabelText("파일 선택 또는 이곳에 끌어 놓기"),pdf());
    const form=screen.getByRole("form",{name:"새 파일 업로드"}); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(()=>expect(uploads).toBe(1));
    await user.click(screen.getByRole("button",{name:"요청 대기 중단"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("서버에는 접수되었을 수");
    expect(uploads).toBe(1);
  });
  it("stops document polling immediately when the user session changes", async () => {
    const {app,mount,mocks}=await setup(); let calls=0;
    server.use(http.get(`${testApiUrl}/cases/15/documents/101`,()=>{calls++;return apiResponse({documentId:101,processingStatus:"PROCESSING"});}));
    mount(<DocumentCard dto={{...mocks.getDocuments()[0],processingStatus:"UPLOADED"}} context={{kind:"case",id:15}} />);
    await waitFor(()=>expect(calls).toBe(1));
    await act(async ()=>{app.session.clear();});
    await new Promise(resolve=>setTimeout(resolve,2200)); expect(calls).toBe(1);
  },5000);

  it("revokes deleted Case document queries and invalidates shared-original lists", async () => {
    const {app}=await setup(); const g=app.session.getSnapshot().generation;
    const caseKey=documentKeys.list(g,{kind:"case",id:15},{page:1,size:20});
    const sharedKey=documentKeys.list(g,{kind:"workplace",id:3},{page:1,size:20});
    const statusKey=documentKeys.status(g,{kind:"case",id:15},101);
    [caseKey,sharedKey,statusKey].forEach(key=>app.queryClient.setQueryData(key,{sensitive:true}));
    await revokeDocumentScope(app.queryClient,g,{kind:"case",id:15});
    expect(app.queryClient.getQueryData(caseKey)).toBeUndefined(); expect(app.queryClient.getQueryData(statusKey)).toBeUndefined();
    expect(app.queryClient.getQueryState(sharedKey)?.isInvalidated).toBe(true);
  });
  it("polls recompute-status only while pending/running, without issuing calculations", async () => {
    const {mount,mocks}=await setup(); let calls=0;
    server.use(http.get(`${testApiUrl}/cases/15/recompute-status`,()=>{calls++;return apiResponse({caseId:15,currentInputVersion:7,results:{},pending:0,running:calls===1?1:0,activeJob:null,latestJob:{status:calls===1?"RUNNING":"PARTIAL"}});}));
    function Probe(){const q=useRecomputeStatus(15);return <p>{String(q.data?.latestJob?.status ?? "")}</p>;}
    mount(<Probe />); await screen.findByText("RUNNING");
    await screen.findByText("PARTIAL",{}, {timeout:3500});
    await new Promise(resolve=>setTimeout(resolve,2200)); expect(calls).toBe(2);
    expect(mocks.requests.some(r=>/calculations|comparisons/.test(r.path))).toBe(false);
  },8000);

});

it("preserves the upload selection across all three modes without mutations", async()=>{
 const {mount,user,mocks}=await setup();mount(<CaseUploadScreen id={15}/>);
 await screen.findByRole("heading",{name:"카페 나무 자료 등록"});
 const file=screen.getByLabelText("파일 선택 또는 이곳에 끌어 놓기") as HTMLInputElement;
 await waitFor(()=>expect(file).toBeEnabled()); await user.upload(file,pdf());
 await user.click(screen.getByRole("button",{name:"기존 자료 연결"}));
 await user.click(screen.getByRole("button",{name:"직접 입력"}));
 expect(within(screen.getByRole("region",{name:"직접 입력"})).getByRole("link")).toHaveAttribute("href","/cases/15/manual-records");
 await user.click(screen.getByRole("button",{name:"새 파일 업로드"}));
 expect(screen.getByText("새자료.pdf",{exact:true})).toBeVisible();
 expect(mocks.requests.filter(r=>r.method!=="GET")).toHaveLength(0);
});

it("keeps compact row metadata separate and reveals linked cases five at a time", async () => {
 const {mount,user,mocks}=await setup();
 mount(<DocumentCard dto={{...mocks.getDocuments()[0], linkedCaseIds:[1,2,3,4,5,6]}} context={{kind:"library"}} />);
 expect(await screen.findByText(/^처리:/)).toBeVisible();
 expect(screen.getByText(/^검토:/)).toBeVisible();
 expect(screen.getByRole("link",{name:"사례 #1"}).closest("details")).not.toHaveAttribute("open");
 await user.click(screen.getByText("자료 관리 상세",{exact:true}));
 expect(screen.getByRole("link",{name:"사례 #5"})).toBeVisible();
 expect(screen.queryByRole("link",{name:"사례 #6"})).not.toBeInTheDocument();
 await user.click(screen.getByRole("button",{name:"연결 사례 더 보기"}));
 expect(screen.getByRole("link",{name:"사례 #6"})).toBeVisible();
 expect(mocks.requests.filter(r=>r.method!=="GET")).toHaveLength(0);
});


it.each([null, 777])("A05 lists and opens details without a nested link (%s)", async linkId => {
  const {app,mount,user,mocks} = await setup();
  const dto = caseDocumentResponse(mocks.getDocuments()[0], linkId);
  server.use(http.get(`${testApiUrl}/cases/15/documents`, () => apiResponse({items:[dto],page:1,size:20,total:1})),
    http.get(`${testApiUrl}/cases/15/documents/101`, () => apiResponse(dto)));
  const page = await documentApi(app.api).list({kind:"case",id:15},{page:1,size:20});
  expect(page.items[0].linkId).toBe(linkId);
  expect(page.items[0]).not.toHaveProperty("link");
  expect((await documentApi(app.api).detail(15,101)).documentId).toBe(101);
  mount(<DocumentCard dto={page.items[0]} context={{kind:"case",id:15}} inputVersion={7} />);
  await user.click(screen.getByText("\uC790\uB8CC \uAD00\uB9AC \uC0C1\uC138"));
  expect(screen.getByRole("link",{name:"\uC6D0\uBB38\u00B7\uCD94\uCD9C\uAC12 \uAC80\uD1A0"})).toHaveAttribute("href","/cases/15/review?documentId=101");
  expect(screen.queryByRole("button",{name:"\uC5F0\uACB0 \uC815\uBCF4 \uC218\uC815"})).toBeNull();
  const unlink = screen.queryByRole("button",{name:"\uC774 \uC0AC\uB840 \uC5F0\uACB0 \uD574\uC81C"});
  expect(Boolean(unlink)).toBe(linkId !== null);
  if (unlink) {
    await user.click(unlink);
    await user.click(screen.getByRole("button",{name:"\uC5F0\uACB0\uB9CC \uD574\uC81C"}));
    await waitFor(() => expect(mocks.requests.some(r => r.method === "DELETE" && r.path.endsWith("document-links/777"))).toBe(true));
  } else expect(mocks.requests.some(r => r.method === "DELETE")).toBe(false);
});
it("A05 requires nullable integer linkId and strips undeclared nested links", () => {
  const dto = caseDocumentResponse({documentId:1,workplaceId:1,documentType:"CONTRACT",fileName:"a",processingStatus:"READY",reviewStatus:"NOT_STARTED",progress:100,linkId:null,linkedCaseIds:[],uploadedAt:"",errorCode:null,aiMetadata:null},null);
  expect(caseDocumentSchema.parse({...dto,link:{linkId:777}})).not.toHaveProperty("link");
  for (const linkId of [undefined,"777",1.5]) expect(caseDocumentSchema.safeParse({...dto,linkId}).success).toBe(false);
});
