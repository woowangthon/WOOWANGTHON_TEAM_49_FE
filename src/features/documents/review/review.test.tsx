import { createOpenApiContract } from "@/test/openapi/contract";
import { caseDocumentResponse } from "@/mocks/shared/document-handlers";
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { File as NodeFile } from "node:buffer";
import { QueryClientProvider } from "@tanstack/react-query";
import { act,cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http,HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach,beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices,type AppServices } from "@/lib/app-services";
import { businessKeys } from "@/lib/query/business-keys";
import { managementMocks } from "@/test/management-handlers";
import { documentMocks } from "@/test/document-handlers";
import { reviewMocks } from "@/test/review-handlers";
import { server,apiResponse,testApiUrl } from "@/test/server";
import { ReviewScreen } from "./components/review-screen";
import { OriginalViewer,ViewerContent } from "./components/original-viewer";
import { FieldsPanel } from "./components/fields-panel";
import { ReviewConfirmation } from "./components/review-confirmation";
import { ReplacementPanel } from "./components/replacement-panel";
import { FieldHistory } from "./components/field-history";
import { FieldEditor } from "./components/field-editor";
import { documentApi } from "../api";
import { reviewApi } from "./api";
import { reviewKeys } from "./query-keys";
import { displayValue,fieldView,highlightBox,parseFieldValue } from "./view-models";
const navigation=vi.hoisted(()=>({replace:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>navigation,usePathname:()=>"/cases/15/review",useSearchParams:()=>new URLSearchParams()}));
const apps:AppServices[]=[];const NativeURL=URL;
const context={caseId:15,workplaceId:3,documentId:101};
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};});
beforeEach(async()=>{
  vi.stubGlobal("FormData",(await new Response(new URLSearchParams()).formData()).constructor);vi.stubGlobal("File",NodeFile);
  vi.stubGlobal("URL",class extends NativeURL {static createObjectURL=vi.fn(()=>"blob:local-review-resource");static revokeObjectURL=vi.fn();});
});
afterEach(()=>{cleanup();apps.splice(0).forEach(a=>{a.session.clear();a.queryClient.clear();});vi.unstubAllGlobals();});
async function setup(){const m=managementMocks();const d=documentMocks(m.getCases());const mocks=reviewMocks(m.getCases(),d.getDocuments());server.use(...mocks.handlers,...d.handlers,...m.handlers);const app=createAppServices();apps.push(app);await app.auth.login({email:"worker@example.com",password:"password1234"});
 const mount=(node:ReactNode)=>render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><AuthGate mode="protected">{node}</AuthGate></QueryClientProvider></AppServicesContext>);
 return {app,mocks,m,d,mount,user:userEvent.setup()};}
const noop=()=>{};
describe("P0 document review via MSW",()=>{
 it("carries one integer ID through create/detail/confirm and independently validates transport",async()=>{
  const {app,mocks}=await setup();const api=reviewApi(app.api);
  const created=await api.replace(15,101,new File(["x"],"new.png",{type:"image/png"}),7);
  expect(typeof created.replacementId).toBe("number");
  const loading=await api.replacement(15,created.replacementId);
  expect(loading.processingStatus).toBe("PROCESSING");
  mocks.setReplacementReady();
  const candidate=await api.replacement(15,created.replacementId);
  expect(candidate.candidate?.documentId).toBe(created.documentId);
  expect(candidate.original?.documentId).toBe(101);
  const confirmed=await api.confirmReplacement(15,created.replacementId,7);
  expect(confirmed.documentId).toBe(candidate.documentId);
  const contract=createOpenApiContract("contracts/openapi.json");
  for(const request of mocks.requests.filter(r=>r.path.includes("/document-replacements/"))){
   expect(contract.request({method:request.method,url:request.path,body:request.body})).toMatchObject({valid:true});
  }
  expect(contract.response({method:"POST",url:"/api/v1/cases/15/documents/101/replace"},202,{code:202,message:"ok",data:created})).toMatchObject({valid:true,coverage:"free-json"});
 });
 it("safely displays absent candidates and partial raw fields",async()=>{
  const {mount}=await setup();
  server.use(http.get(`${testApiUrl}/cases/15/document-replacements/2`,()=>apiResponse({replacementId:2,status:"CANDIDATE",candidate:null,fields:[{key:"gross",value:null}]})));
  mount(<ReplacementPanel context={context} version={7} replacementId={2} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false}/>);
  expect(await screen.findByText(/교체 후보 원문이 아직 제공되지 않았습니다/)).toBeVisible();
  expect(screen.getByRole("button",{name:"원본 교체 확정"})).toBeDisabled();
 });
 it.each(["DEFERRED","NEEDS_RECONFIRMATION"] as const)("preserves %s structured values through JSON editor and MSW",async status=>{
   const {mount,mocks,user,app}=await setup();const field=mocks.fields(15,101)[0];
   field.value={items:[null,0,false,{name:"base"}]};field.status=status;
   mount(<FieldEditor field={field} scope="case" context={context} version={7} onClose={noop} onDirty={noop} onSaved={noop}/>);
   const editor=screen.getByRole("textbox",{name:"구조형 값 (JSON)"});
   expect(JSON.parse((editor as HTMLTextAreaElement).value)).toEqual(field.value);
   expect(screen.queryByLabelText("수정값")).toBeNull();
   fireEvent.change(editor,{target:{value:'{"items":[0,null,{"nested":[false]}]}'}});
   await user.click(screen.getByRole("button",{name:"수정값 저장"}));
   await waitFor(()=>expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(true));
   const saved=await reviewApi(app.api).fields(15,101);
   expect(saved.fields[0].value).toEqual({items:[0,null,{nested:[false]}]});
 });

 it("requests metadata and original Blob with Bearer, ignoring private previewUrl",async()=>{const {mount,mocks}=await setup();mount(<OriginalViewer workplaceId={3} documentId={101} />);expect(await screen.findByRole("img",{name:"문서 원문 1페이지"})).toHaveAttribute("src","blob:local-review-resource");expect(mocks.requests.filter(r=>/preview|file$/.test(r.path))).toHaveLength(2);expect(mocks.requests.every(r=>r.authorization==="Bearer msw-access-token")).toBe(true);expect(document.body.innerHTML).not.toContain("must-not-follow");});
 it("releases Blob URLs and file cache on unmount",async()=>{const {mount,app}=await setup();const v=mount(<OriginalViewer workplaceId={3} documentId={101} />);await screen.findByRole("img",{name:"문서 원문 1페이지"});const revoke=URL.revokeObjectURL;v.unmount();expect(revoke).toHaveBeenCalledWith("blob:local-review-resource");await waitFor(()=>expect(app.queryClient.getQueryData(reviewKeys.file(app.session.getSnapshot().generation,3,101))).toBeUndefined());});
 it("retries original failures and displays image decoding errors",async()=>{const {mount,user}=await setup();server.use(http.get(`${testApiUrl}/workplaces/3/documents/101/file`,()=>apiResponse({},403)));mount(<OriginalViewer workplaceId={3} documentId={101} />);expect(await screen.findByRole("alert")).toHaveTextContent("권한");server.use(http.get(`${testApiUrl}/workplaces/3/documents/101/file`,()=>new HttpResponse(new Uint8Array([1]),{headers:{"Content-Type":"image/png"}})));await user.click(screen.getByRole("button",{name:"다시 시도"}));fireEvent.error(await screen.findByRole("img",{name:"문서 원문 1페이지"}));expect(screen.getByRole("alert")).toHaveTextContent("이미지를 표시할 수 없습니다");});
 it("displays zero, missing values, source and independent review statuses",async()=>{const {mount,user}=await setup();mount(<ReviewScreen id={15} initialDocumentId={101} />);const fields=await screen.findByRole("region",{name:"OCR 추출 필드"});expect(within(fields).getAllByRole("article")).toHaveLength(1);await user.click(within(within(fields).getByRole("article",{name:"지급총액"})).getByText("근거·이력·공유 설정"));expect(within(fields).getByText(/지급총액 2,300,000원/)).toBeVisible();await user.click(within(fields).getByRole("button",{name:"다음"}));expect(within(fields).getByRole("article",{name:"공제액"})).toHaveTextContent("값 없음");await user.click(within(fields).getByRole("button",{name:"다음"}));expect(within(fields).getByRole("article",{name:"추가 지급액"})).toHaveTextContent("0");expect(await screen.findByText("문서 처리: 처리 완료 · 사용자 검토: 검토 전")).toBeVisible();});
 it("preserves all five field status labels and scalar null/zero semantics",async()=>{const {mocks}=await setup();const f=mocks.fields(15,101)[0];expect(displayValue(null)).toBe("값 없음");expect(displayValue(0)).toBe("0");expect(displayValue(false)).toBe("아니요");expect(["UNCONFIRMED","CONFIRMED","MISSING","UNREADABLE","CONFLICTED"].map(status=>fieldView({...f,status:status as typeof f.status}).statusLabel)).toEqual(["미확인","확인됨","값 없음","판독 불가","상충"]);expect(parseFieldValue(f,"0",false)).toBe(0);expect(parseFieldValue(f,"",true)).toBeNull();expect(()=>parseFieldValue(f,"",false)).toThrow();});
 it("only highlights valid matching relative coordinates; rotated or absent coordinates fall back",()=>{const p={documentId:101,mediaType:"image/png",pageCount:2,coordinateSystem:"RELATIVE_0_1",rotationDegrees:0,supportsHighlight:true};const s={documentId:101,page:1,boundingBox:[0.1,0.2,0.3,0.1] as [number,number,number,number],coordinateSystem:"RELATIVE_0_1"};expect(highlightBox(p,s,1)).toEqual({left:"10%",top:"20%",width:"30%",height:"10%"});expect(highlightBox(p,s,2)).toBeUndefined();expect(highlightBox({...p,rotationDegrees:90},s,1)).toBeUndefined();expect(highlightBox(p,s,1,90)).toBeUndefined();expect(highlightBox(p,{...s,boundingBox:[0.9,0.2,0.4,0.1]},1)).toBeUndefined();expect(highlightBox(p,{...s,documentId:102},1)).toBeUndefined();});
 it("keeps a relative overlay stable during zoom and page changes",async()=>{const {mount,user}=await setup();mount(<ViewerContent url="blob:local" preview={{documentId:101,mediaType:"image/png",pageCount:2,coordinateSystem:"RELATIVE_0_1",rotationDegrees:0,supportsHighlight:true}} source={{documentId:101,page:1,text:"근거",boundingBox:[0.1,0.2,0.3,0.1],coordinateSystem:"RELATIVE_0_1"}} onRetry={noop} />);fireEvent.load(screen.getByRole("img",{name:"문서 원문 1페이지"}));expect(screen.getByRole("img",{name:"선택한 필드의 원문 위치"})).toHaveStyle({left:"10%"});await user.click(screen.getByRole("button",{name:"확대"}));expect(screen.getByText("125%")).toBeVisible();expect(screen.getByRole("img",{name:"선택한 필드의 원문 위치"})).toHaveStyle({left:"10%"});await user.click(screen.getByRole("button",{name:"다음 페이지"}));expect(screen.queryByRole("img",{name:"선택한 필드의 원문 위치"})).not.toBeInTheDocument();});
 it("confirms only a field without resending its value; null cannot be confirmed",async()=>{const {mount,mocks,user}=await setup();mount(<FieldsPanel fields={mocks.fields(15,101)} context={context} inputVersion={7} onSource={noop} onDirty={noop} dirty={false} />);const card=screen.getByRole("article",{name:"지급총액"});await user.click(within(card).getByRole("button",{name:"값만 확인"}));await waitFor(()=>expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(true));expect(mocks.requests.find(r=>r.method==="PATCH")?.body).toEqual({confirmed:true,expectedInputVersion:7});await waitFor(()=>expect(screen.getByRole("button",{name:"다음"})).toBeEnabled());await user.click(screen.getByRole("button",{name:"다음"}));expect(within(screen.getByRole("article",{name:"공제액"})).getByRole("button",{name:"값만 확인"})).toBeDisabled();});
 it("saves value edits without implicit confirmation and carries expected version",async()=>{const {mount,mocks,user}=await setup();const done=vi.fn();mount(<FieldEditor field={mocks.fields(15,101)[0]} scope="case" context={context} version={7} onClose={done} onDirty={noop} onSaved={noop} />);await user.clear(screen.getByLabelText("수정값"));await user.type(screen.getByLabelText("수정값"),"0");await user.click(screen.getByRole("button",{name:"수정값 저장"}));await waitFor(()=>expect(done).toHaveBeenCalled());expect(mocks.requests.find(r=>r.method==="PATCH")?.body).toEqual({value:0,expectedInputVersion:7});expect(mocks.fields(15,101)[0].status).toBe("UNCONFIRMED");});
 it("confirms explicitly and reports unsupported unconfirmation without changing data",async()=>{const {app,mocks}=await setup();await reviewApi(app.api).patchCase(15,101,501,{value:2000000,confirmed:true},7);expect(mocks.fields(15,101)[0].status).toBe("CONFIRMED");await expect(reviewApi(app.api).patchCase(15,101,501,{confirmed:false},8)).rejects.toMatchObject({status:422,errorCode:"CANDIDATE_CONFIRMATION_INVALID"});expect(mocks.fields(15,101)[0].status).toBe("CONFIRMED");});
 it("handles 409 with preserved draft and explicit reload of latest values/version",async()=>{const {mount,mocks,m,user}=await setup();m.getCases()[0].inputVersion=8;mount(<FieldEditor field={mocks.fields(15,101)[0]} scope="case" context={context} version={7} onClose={noop} onDirty={noop} onSaved={noop} />);await user.clear(screen.getByLabelText("수정값"));await user.type(screen.getByLabelText("수정값"),"1");await user.click(screen.getByRole("button",{name:"수정값 저장"}));expect(await screen.findByText(/다른 변경이 먼저/)).toBeVisible();expect(screen.getByLabelText("수정값")).toHaveValue("1");expect(screen.getByRole("button",{name:"수정값 저장"})).toBeDisabled();await user.click(screen.getByRole("button",{name:"최신 값으로 초안 다시 불러오기"}));await waitFor(()=>expect(screen.getByLabelText("수정값")).toHaveValue("2300000"));await user.click(screen.getByRole("button",{name:"수정값 저장"}));await waitFor(()=>expect(mocks.requests.filter(r=>r.method==="PATCH").at(-1)?.body?.expectedInputVersion).toBe(8));});
 it.each(["DOCUMENT_STILL_PROCESSING","INVALID_FIELD_VALUE"])("surfaces %s and maps field errors",async code=>{const {mount,mocks,user}=await setup();server.use(http.patch(`${testApiUrl}/cases/15/documents/101/fields/501`,()=>apiResponse({errorCode:code,errors:[{field:"value",reason:"서버 값 검증 오류"}]},code==="DOCUMENT_STILL_PROCESSING"?409:422)));mount(<FieldEditor field={mocks.fields(15,101)[0]} scope="case" context={context} version={7} onClose={noop} onDirty={noop} onSaved={noop} />);await user.click(screen.getByRole("button",{name:"수정값 저장"}));if(code==="INVALID_FIELD_VALUE")expect(await screen.findByText("서버 값 검증 오류")).toBeVisible();else expect(await screen.findByText(/문서를 처리 중입니다/)).toBeVisible();});
 it("shared save requires impact confirmation and never transmits Case version",async()=>{const {mount,mocks,user}=await setup();mount(<FieldEditor field={mocks.fields(15,101)[0]} scope="shared" context={context} version={7} onClose={noop} onDirty={noop} onSaved={noop} linkedCaseIds={[15,16]} />);await user.click(screen.getByRole("button",{name:"수정값 저장"}));expect(screen.getByRole("dialog")).toHaveTextContent("#15, #16");expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(false);await user.click(screen.getByRole("button",{name:"공유 기본값 저장 확인"}));await waitFor(()=>expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(true));const request=mocks.requests.find(r=>r.method==="PATCH")!;expect(request.path).toContain("/workplaces/3/");expect(request.body).not.toHaveProperty("expectedInputVersion");});
 it("shared edits preserve another Case override and report only affected cases",async()=>{const {app,mocks}=await setup();await reviewApi(app.api).patchCase(16,101,501,{value:500,confirmed:true},7);const data=await reviewApi(app.api).patchShared(3,101,501,{value:2500000,confirmed:true});expect(data.affectedCaseIds).toEqual([15]);expect(mocks.fields(16,101)[0].value).toBe(500);expect(mocks.fields(15,101)[0].value).toBe(2500000);});
 it("does not seed a shared editor with the effective override value",async()=>{const {app,mount,mocks}=await setup();await reviewApi(app.api).patchCase(15,101,501,{value:500},7);mount(<FieldEditor field={mocks.fields(15,101)[0]} scope="shared" context={context} version={8} onClose={noop} onDirty={noop} onSaved={noop} />);expect(screen.getByLabelText("수정값")).toHaveValue("");expect(screen.getByText(/공유 기본값을 대신 채우지 않았습니다/)).toBeVisible();});
 it("removes only the current Case override and returns to the shared value",async()=>{const {app,mocks,mount,user}=await setup();await reviewApi(app.api).patchCase(15,101,501,{value:500},7);await reviewApi(app.api).patchCase(16,101,501,{value:600},7);mount(<FieldsPanel fields={mocks.fields(15,101)} context={context} inputVersion={8} onSource={noop} onDirty={noop} dirty={false} />);await user.click(screen.getByRole("button",{name:"재정의 제거"}));await user.click(screen.getByRole("button",{name:"재정의 제거 확인"}));await waitFor(()=>expect(mocks.fields(15,101)[0].effectiveValueOrigin).toBe("SHARED_DEFAULT"));expect(mocks.fields(15,101)[0].value).toBe(2300000);expect(mocks.fields(16,101)[0].value).toBe(600);});
 it("paginates client history with null/zero, actor and scope",async()=>{const {mount,user}=await setup();mount(<FieldHistory caseId={15} documentId={101} fieldId={501} />);expect(await screen.findByText("값 없음 → 0")).toBeVisible();expect(screen.getAllByText(/기록되지 않음 · 범위: 이 내역의 재정의/)).toHaveLength(20);await user.click(screen.getByRole("button",{name:"다음"}));await screen.findByText("2 / 2 페이지 · 총 21개");});
 it("shows empty history and retryable errors",async()=>{const {mount,user}=await setup();server.use(http.get(`${testApiUrl}/cases/15/documents/101/fields/501/history`,()=>apiResponse({},500)));mount(<FieldHistory caseId={15} documentId={101} fieldId={501} />);await screen.findByRole("alert");server.use(http.get(`${testApiUrl}/cases/15/documents/101/fields/501/history`,()=>apiResponse({items:[],page:1,size:20,total:0})));await user.click(screen.getByRole("button",{name:"다시 시도"}));expect(await screen.findByText("수정 이력이 없습니다.")).toBeVisible();});
 it("keeps review IN_PROGRESS with missing fields and uses P0 unconfirmedFieldIds",async()=>{const {mount,mocks,user}=await setup();mount(<ReviewConfirmation context={context} version={7} fields={mocks.fields(15,101)} disabled={false} />);await user.click(await screen.findByRole("button",{name:"문서 검토 완료 요청"}));expect(await screen.findByText(/연결 문서 검토: 검토 중/)).toBeVisible();expect(screen.getByText("미완료 항목: 지급총액, 공제액")).toBeVisible();expect(screen.getByText(/원본 진위·법적 검증 완료를 뜻하지 않습니다/)).toBeVisible();});
 it("accepts authoritative CONFIRMED review only after all fields are confirmed",async()=>{const {app,mocks,mount,user}=await setup();await reviewApi(app.api).patchCase(15,101,501,{confirmed:true},7);await reviewApi(app.api).patchCase(15,101,502,{value:0,confirmed:true},8);mount(<ReviewConfirmation context={context} version={9} fields={mocks.fields(15,101)} disabled={false} />);await user.click(await screen.findByRole("button",{name:"문서 검토 완료 요청"}));expect(await screen.findByText(/연결 문서 검토: 검토 확인 완료/)).toBeVisible();});
 it("invalidates fields/history/readiness/results while retaining old result snapshots",async()=>{const {app,mocks,mount,user}=await setup();const g=app.session.getSnapshot().generation;const resultKey=[...businessKeys.case(g,15),"results"];const readinessKey=[...businessKeys.case(g,15),"readiness"];const hist=reviewKeys.history(g,15,101,501,1);[resultKey,readinessKey,hist].forEach(k=>app.queryClient.setQueryData(k,{snapshot:"previous"}));mount(<FieldsPanel fields={mocks.fields(15,101)} context={context} inputVersion={7} onSource={noop} onDirty={noop} dirty={false} />);await user.click(within(screen.getByRole("article",{name:"지급총액"})).getByRole("button",{name:"값만 확인"}));await waitFor(()=>expect(app.queryClient.getQueryState(resultKey)?.isInvalidated).toBe(true));expect(app.queryClient.getQueryData(resultKey)).toEqual({snapshot:"previous"});expect(app.queryClient.getQueryState(readinessKey)?.isInvalidated).toBe(true);expect(app.queryClient.getQueryState(hist)?.isInvalidated).toBe(true);});
 it("starts replacement separately, preserves originals, and polls its own ID until ready",async()=>{const {mount,mocks,user,d}=await setup();const created=vi.fn();mount(<ReplacementPanel context={context} version={7} onCreated={created} onConfirmed={noop} onDirty={noop} disabled={false} />);await user.upload(screen.getByLabelText("교체할 새 파일"),new File(["image fixture"],"new.png",{type:"image/png"}));await user.click(screen.getByRole("button",{name:"새 원본 교체 요청"}));await waitFor(()=>expect(created).toHaveBeenCalledWith(1));expect(d.getDocuments().find(v=>v.documentId===101)?.linkedCaseIds).toEqual([15,16]);expect(mocks.requests.find(r=>r.method==="POST")?.path).toMatch(/\/documents\/101\/replace$/);});
 it("requires new source and field acknowledgement before second-step confirmation",async()=>{const {app,mount,mocks,user,d}=await setup();await reviewApi(app.api).replace(15,101,new File(["x"],"a.png",{type:"image/png"}),7);mocks.setReplacementReady();const confirmed=vi.fn();mount(<ReplacementPanel context={context} version={7} replacementId={1} onCreated={noop} onConfirmed={confirmed} onDirty={noop} disabled={false} />);await screen.findByRole("region",{name:"교체 후보 추출 필드"});expect(screen.getByRole("button",{name:"원본 교체 확정"})).toBeDisabled();fireEvent.load(await screen.findByRole("img",{name:"문서 원문 1페이지"}));await user.click(screen.getByRole("checkbox"));await user.click(screen.getByRole("button",{name:"원본 교체 확정"}));expect(screen.getByRole("dialog")).toHaveTextContent("다른 내역과 공유 원본은 유지");await user.click(screen.getByRole("button",{name:"새 원본으로 연결 교체 확인"}));await waitFor(()=>expect(confirmed).toHaveBeenCalledWith(901));expect(d.getDocuments().find(v=>v.documentId===101)?.linkedCaseIds).toEqual([16]);expect(mocks.requests.find(r=>r.path.endsWith("1/confirm"))?.body).toEqual({confirmed:true,expectedInputVersion:7});});
 it("handles REPLACEMENT_OVERRIDE_CONFLICT without changing the existing link",async()=>{const {app,mount,mocks,user,d}=await setup();await reviewApi(app.api).replace(15,101,new File(["x"],"a.png",{type:"image/png"}),7);mocks.setReplacementReady();mocks.setReplacementConflict(true);mount(<ReplacementPanel context={context} version={7} replacementId={1} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false} />);await screen.findByRole("checkbox");fireEvent.load(await screen.findByRole("img",{name:"문서 원문 1페이지"}));await user.click(screen.getByRole("checkbox"));await user.click(screen.getByRole("button",{name:"원본 교체 확정"}));await user.click(screen.getByRole("button",{name:"새 원본으로 연결 교체 확인"}));expect(await screen.findByText(/기존 연결을 유지했습니다/)).toBeVisible();expect(d.getDocuments()[0].linkedCaseIds).toEqual([15,16]);expect(screen.getByRole("button",{name:"원본 교체 확정"})).toBeDisabled();});
 it("warns on unsaved edits and prevents navigation when discarded is declined",async()=>{const {mount,user}=await setup();vi.spyOn(window,"confirm").mockReturnValue(false);mount(<ReviewScreen id={15} initialDocumentId={101} />);const panel=await screen.findByRole("region",{name:"OCR 추출 필드"});await user.click(within(screen.getByRole("article",{name:"지급총액"})).getByRole("button",{name:"이 내역 값 수정"}));await user.clear(screen.getByLabelText("수정값"));await user.type(screen.getByLabelText("수정값"),"1");expect(await screen.findByText(/저장하지 않은 변경이 있습니다/)).toBeVisible();await user.click(screen.getByRole("link",{name:"자료 등록·관리"}));expect(window.confirm).toHaveBeenCalled();expect(panel).toBeInTheDocument();});
 it("clears original resources and private review caches after session change",async()=>{const {mount,app}=await setup();mount(<ReviewScreen id={15} initialDocumentId={101} />);await screen.findByRole("region",{name:"OCR 추출 필드"});await screen.findByRole("img",{name:"문서 원문 1페이지"});const revoke=URL.revokeObjectURL;await act(async()=>app.session.clear());await waitFor(()=>expect(revoke).toHaveBeenCalled());expect(app.queryClient.getQueryCache().getAll().filter(q=>q.queryKey[0]==="session")).toHaveLength(0);});
 it("polls replacement status by replacementId and stops after terminal state",async()=>{const {app,mount,mocks}=await setup();await reviewApi(app.api).replace(15,101,new File(["x"],"a.png",{type:"image/png"}),7);mount(<ReplacementPanel context={context} version={7} replacementId={1} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false} />);await screen.findByText(/새 문서 #901 · 처리 중/);
 await waitFor(()=>expect(mocks.requests.filter(r=>r.method==="GET"&&r.path.endsWith("/document-replacements/1"))).toHaveLength(1));mocks.setReplacementReady();
 await screen.findByText(/새 문서 #901 · 처리 완료/,{}, {timeout:3500});const calls=mocks.requests.filter(r=>r.method==="GET"&&r.path.endsWith("/document-replacements/1")).length;
 await new Promise(resolve=>setTimeout(resolve,2200));expect(mocks.requests.filter(r=>r.method==="GET"&&r.path.endsWith("/document-replacements/1"))).toHaveLength(calls);
 },8000);
 it("blocks confirmation if replacement fields or identity cannot be verified",async()=>{const {mount}=await setup();server.use(http.get(`${testApiUrl}/cases/15/document-replacements/2`,()=>apiResponse({replacementId:2,documentId:902,processingStatus:"READY"})));mount(<ReplacementPanel context={context} version={7} replacementId={2} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false} />);expect(await screen.findByText(/새 필드가 아직 제공되지 않았습니다/)).toBeVisible();expect(screen.getByRole("button",{name:"원본 교체 확정"})).toBeDisabled();});
 it("preserves read-only candidate fields without creating a premature Case link",async()=>{const {app,mount,mocks}=await setup();await reviewApi(app.api).replace(15,101,new File(["x"],"a.png",{type:"image/png"}),7);mocks.setReplacementReady();mount(<ReplacementPanel context={context} version={7} replacementId={1} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false} />);await screen.findByRole("region",{name:"교체 후보 추출 필드"});expect(mocks.requests.some(r=>r.path.includes("/cases/15/documents/901/fields"))).toBe(false);expect(screen.queryByRole("button",{name:"수정값 저장"})).not.toBeInTheDocument();});

 it("keeps replacement confirmation disabled when its authenticated original cannot load",async()=>{const {app,mocks,mount}=await setup();await reviewApi(app.api).replace(15,101,new File(["x"],"a.png",{type:"image/png"}),7);mocks.setReplacementReady();server.use(http.get(`${testApiUrl}/workplaces/3/documents/901/file`,()=>apiResponse({},403)));mount(<ReplacementPanel context={context} version={7} replacementId={1} onCreated={noop} onConfirmed={noop} onDirty={noop} disabled={false} />);await screen.findByRole("alert");expect(screen.getByRole("checkbox")).toBeDisabled();expect(screen.getByRole("button",{name:"원본 교체 확정"})).toBeDisabled();});
 it("rejects a fields response for a different Case or document",async()=>{const {app,mocks}=await setup();server.use(http.get(`${testApiUrl}/cases/15/documents/101/fields`,()=>apiResponse({documentId:102,caseId:16,processingStatus:"READY",reviewStatus:"NOT_STARTED",fields:mocks.fields(15,101)})));await expect(reviewApi(app.api).fields(15,101)).rejects.toMatchObject({kind:"protocol"});});
 it("supports arrow-key navigation between mobile original and field tabs",async()=>{const {mount}=await setup();mount(<ReviewScreen id={15} initialDocumentId={101} />);const fieldsTab=await screen.findByRole("tab",{name:"추출 필드"});fieldsTab.focus();fireEvent.keyDown(fieldsTab,{key:"ArrowLeft"});expect(screen.getByRole("tab",{name:"원문"})).toHaveAttribute("aria-selected","true");expect(screen.getByRole("tab",{name:"원문"})).toHaveFocus();});
 it("requires explicit latest-state reload after a review version conflict",async()=>{const {mount,mocks,m,user}=await setup();m.getCases()[0].inputVersion=8;server.use(http.post(`${testApiUrl}/cases/15/documents/101/review/confirm`,()=>apiResponse({errorCode:"INPUT_VERSION_CONFLICT"},409)));mount(<ReviewConfirmation context={context} version={7} fields={mocks.fields(15,101)} disabled={false} />);await user.click(await screen.findByRole("button",{name:"문서 검토 완료 요청"}));expect(await screen.findByText(/다른 변경이 먼저/)).toBeVisible();expect(screen.getByRole("button",{name:"문서 검토 완료 요청"})).toBeDisabled();expect(screen.getByRole("button",{name:"최신 검토 상태와 버전 확인"})).toBeEnabled();});

 it("fits a rotated image into its true bounds and avoids speculative rotated highlights",async()=>{const {mount}=await setup();mount(<ViewerContent url="blob:local" preview={{documentId:101,mediaType:"image/png",pageCount:1,coordinateSystem:"RELATIVE_0_1",rotationDegrees:90,supportsHighlight:true}} source={{documentId:101,page:1,boundingBox:[0.1,0.2,0.3,0.1],coordinateSystem:"RELATIVE_0_1"}} onRetry={noop} />);const image=screen.getByRole("img",{name:"문서 원문 1페이지"});Object.defineProperty(image,"naturalWidth",{value:600});Object.defineProperty(image,"naturalHeight",{value:800});fireEvent.load(image);expect(image).toHaveStyle({position:"absolute",transform:"translate(-50%,-50%) rotate(90deg)"});expect(image.parentElement?.style.aspectRatio).toContain("800");expect(screen.queryByRole("img",{name:"선택한 필드의 원문 위치"})).not.toBeInTheDocument();});

 it("shows a failed recompute job without blocking independent field review",async()=>{const {mount}=await setup();server.use(http.get(`${testApiUrl}/cases/15/recompute-status`,()=>apiResponse({caseId:15,currentInputVersion:7,results:{},pending:0,running:0,activeJob:null,latestJob:{status:"FAILED"}})));mount(<ReviewScreen id={15} initialDocumentId={101} />);expect(await screen.findByText(/서버 갱신: 갱신 실패/)).toBeVisible();expect(await screen.findByRole("region",{name:"OCR 추출 필드"})).toBeVisible();});

 it("uses newly supplied P0 204 contracts for original deletion and Case unlink",async()=>{const {app}=await setup();server.use(http.delete(`${testApiUrl}/workplaces/3/documents/101`,()=>new HttpResponse(null,{status:204})),http.delete(`${testApiUrl}/cases/15/document-links/777`,()=>new HttpResponse(null,{status:204})));await expect(documentApi(app.api).remove(3,101)).resolves.toBeUndefined();await expect(documentApi(app.api).unlink(15,777,7)).resolves.toBeUndefined();});

 it("preserves an edited draft and exposes unresolved fields across local pages without mutations",async()=>{
 const {mount,mocks,user}=await setup();const base=mocks.fields(15,101)[0];
 const fields=Array.from({length:13},(_,i)=>({...base,fieldId:701+i,label:`검토 항목 ${i+1}`}));
 mount(<FieldsPanel fields={fields} context={context} inputVersion={7} onSource={noop} onDirty={noop} dirty={false} />);
 expect(screen.getAllByRole("article")).toHaveLength(1);
 await user.click(within(screen.getByRole("article",{name:"검토 항목 1"})).getByRole("button",{name:"이 내역 값 수정"}));
 await user.clear(screen.getByLabelText("수정값"));await user.type(screen.getByLabelText("수정값"),"123");
 await user.click(screen.getByRole("button",{name:"다음"}));
 expect(screen.getByRole("button",{name:"다음"})).toBeDisabled();
 expect(screen.getByLabelText("수정값")).toHaveValue("123");expect(screen.getByRole("article",{name:"검토 항목 1"})).toBeVisible();
 const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);await user.click(screen.getByRole("button",{name:"편집 닫기"}));expect(screen.getByLabelText("수정값")).toHaveValue("123");
 confirm.mockReturnValue(true);await user.click(screen.getByRole("button",{name:"편집 닫기"}));confirm.mockRestore();
 await user.click(screen.getByText("검토 필요 13개 · 상충 0개 · 전체 13개"));await user.click(screen.getByRole("button",{name:"검토 항목 13 · 미확인"}));
 expect(screen.getAllByRole("article")).toHaveLength(1);await waitFor(()=>expect(screen.getByRole("article",{name:"검토 항목 13"})).toHaveFocus());
 expect(screen.queryByLabelText("수정값")).not.toBeInTheDocument();expect(mocks.requests.some(r=>r.method==="PATCH")).toBe(false);
 });

});

it.each([null,777])("A05 enters review without link details (%s)",async linkId=>{
 const {mount,d}=await setup();
 const dto=caseDocumentResponse(d.getDocuments()[0],linkId);
 server.use(http.get(`${testApiUrl}/cases/15/documents`,()=>apiResponse({items:[dto],page:1,size:20,total:1})));
 mount(<ReviewScreen id={15}/>);
 expect(await screen.findByRole("tab",{name:"\uCD94\uCD9C \uD544\uB4DC"})).toBeVisible();
});

it("A07 bodyless actions tolerate stale UI versions and duplicate confirmation",async()=>{const {app,m}=await setup();m.getCases()[0].inputVersion=99;const api=reviewApi(app.api);await expect(api.confirmReview(15,101,7)).resolves.toMatchObject({reviewStatus:"IN_PROGRESS"});await expect(api.confirmReview(15,101,7)).resolves.toMatchObject({reviewStatus:"IN_PROGRESS"});await expect(api.removeOverride(15,101,501,7)).resolves.toMatchObject({fieldId:501});});

it("N01 preserves an unknown review status and blocks confirmation/editing",async()=>{
 const {mount,mocks}=await setup();
 server.use(http.get(`${testApiUrl}/cases/15/documents/101/fields`,()=>apiResponse({documentId:101,caseId:15,processingStatus:"READY",reviewStatus:"OPAQUE_REVIEW",fields:mocks.fields(15,101)})));
 mount(<ReviewScreen id={15} initialDocumentId={101}/>);
 expect(await screen.findByText(/OPAQUE_REVIEW/)).toBeVisible();
 expect(await screen.findByRole("button",{name:"\uBB38\uC11C \uAC80\uD1A0 \uC644\uB8CC \uC694\uCCAD"})).toBeDisabled();
 for(const button of screen.getAllByRole("button",{name:"\uC774 \uB0B4\uC5ED \uAC12 \uC218\uC815"})) expect(button).toBeDisabled();
});
