// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach,describe,it,expect } from "vitest";
import { cleanup,render,screen,fireEvent,renderHook,act,waitFor } from "@testing-library/react";
import { usePayments } from "./queries";
import { businessKeys } from "@/lib/query/business-keys";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices,type AppServices } from "@/lib/app-services";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { server, testApiUrl, apiResponse } from "@/test/server";
import { http, delay } from "msw";
import { DuplicateCandidates } from "./duplicate-candidates";
import { paymentsApi } from "./api";
import { caseInputsApi } from "@/features/case-inputs/api";
import { ComparisonValues,DepositComparisonPanel } from "./comparison-panel";
import { PaymentScreen } from "./payment-screen";
import { createOpenApiContract } from "@/test/openapi/contract";
const apps:AppServices[]=[];
afterEach(()=>{cleanup();apps.splice(0).forEach(a=>{a.session.clear();a.queryClient.clear();});});
async function setup(){const management=managementMocks();const mock=inputMocks(management.getCases);server.use(...mock.handlers,...management.handlers);const app=createAppServices();apps.push(app);await app.auth.login({email:"worker@example.com",password:"password1234"});const api=paymentsApi(app.api);const c=management.getCases().find(c=>c.caseId===15)!;return {app,api,mock,c,mount:(node:React.ReactNode)=>render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{node}</QueryClientProvider></AppServicesContext>)};}
const input={paymentMethod:"BANK_TRANSFER" as const,transactionDate:"2026-11-10",amount:100,source:"USER_INPUT" as const,confirmationStatus:"USER_REPORTED" as const};
describe("deposit completion",()=>{
 it("distinguishes loading, failed lookup, retry, and empty duplicate candidates", async()=>{
  const {c,mount}=await setup();
  server.use(http.get(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/duplicate-candidates`,async()=>{await delay(100);return apiResponse({errorCode:"FORBIDDEN"},403);}));
  mount(<DuplicateCandidates workplaceId={c.workplaceId} onSelect={()=>{}}/>);
  expect(screen.queryByText("중복 후보가 없습니다.")).not.toBeInTheDocument();
  await screen.findByRole("alert");
  server.use(http.get(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/duplicate-candidates`,()=>apiResponse({candidates:[]})));
  fireEvent.click(screen.getByRole("button",{name:"다시 시도"}));
  expect(await screen.findByText("중복 후보가 없습니다.")).toBeVisible();
 });
 it("creates and edits from the form with independently validated actual requests",async()=>{
  const {c,mount,api}=await setup();const contract=createOpenApiContract();const requests:unknown[]=[];
  const listener=async({request}:{request:Request})=>{
   if(!request.url.includes("payment-transactions") || !["POST","PATCH"].includes(request.method))return;
   const body=await request.clone().json();requests.push(body);
   expect(contract.request({method:request.method,url:request.url,body}).errors).toEqual([]);
   if(request.method==="PATCH")expect(body).not.toHaveProperty("source");
  };
  server.events.on("request:start",listener);
  try {
   mount(<PaymentScreen workplaceId={c.workplaceId}/>);
   fireEvent.change(screen.getByLabelText("\uac70\ub798\uc77c"),{target:{value:"2026-11-10"}});
   fireEvent.change(screen.getByLabelText("\uae08\uc561 (\uc6d0, 0\uc6d0 \ud5c8\uc6a9)"),{target:{value:"100"}});
   fireEvent.click(screen.getByRole("button",{name:"\uac70\ub798 \ub4f1\ub85d"}));
   const detailButton=await screen.findByRole("button",{name:"\uc0c1\uc138\u00b7\uc218\uc815"});
   await waitFor(()=>expect(detailButton).toBeEnabled());
   fireEvent.click(detailButton);
   await waitFor(()=>expect(screen.getByRole("button",{name:"\uac70\ub798 \uc218\uc815 \uc800\uc7a5"})).toBeEnabled());
   fireEvent.change(screen.getByLabelText("\uae08\uc561 (\uc6d0, 0\uc6d0 \ud5c8\uc6a9)"),{target:{value:"0"}});
   fireEvent.click(screen.getByRole("button",{name:"\uac70\ub798 \uc218\uc815 \uc800\uc7a5"}));
   await waitFor(()=>expect(screen.getByRole("button",{name:"\uac70\ub798 \ub4f1\ub85d"})).toBeVisible());
   expect((await api.list(c.workplaceId)).items[0].amount).toBe(0);
   expect(requests).toHaveLength(2);
  } finally {server.events.removeListener("request:start",listener);}
 });
 it("does not prefill an unknown transaction amount with zero",async()=>{const {c,mount}=await setup();mount(<PaymentScreen workplaceId={c.workplaceId}/>);expect(screen.getByLabelText("금액 (원, 0원 허용)")).toHaveValue(null);});
 it("loads allocations past the first page before deciding create versus update",async()=>{
 const {api,c}=await setup();
 for(let i=0;i<21;i++){const t=await api.create(c.workplaceId,{...input,amount:i});await api.allocate(15,{transactionId:t.transactionId,allocatedAmount:i,expectedInputVersion:c.inputVersion});}
 const result=await api.allocations(15);expect(result.items).toHaveLength(21);expect(new Set(result.items.map(a=>a.allocationId)).size).toBe(21);expect(result.items[20].allocatedAmount).toBe(20);
 await api.updateAllocation(15,result.items[20].allocationId,{allocatedAmount:0,expectedInputVersion:c.inputVersion});expect((await api.allocations(15)).items[20].allocatedAmount).toBe(0);
 });
 it("invalidates cached cases in this workplace and preserves other workplaces",async()=>{const {app,c}=await setup();const g=app.session.getSnapshot().generation;const own=businessKeys.case(g,15),shared=businessKeys.case(g,16),other=businessKeys.case(g,99);app.queryClient.setQueryData(own,c);app.queryClient.setQueryData(shared,{...c,caseId:16});app.queryClient.setQueryData(other,{...c,caseId:99,workplaceId:c.workplaceId+100});const wrapper=({children}:{children:React.ReactNode})=><AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{children}</QueryClientProvider></AppServicesContext>;const hook=renderHook(()=>usePayments(c.workplaceId),{wrapper});await act(async()=>{await hook.result.current.action.mutateAsync(()=>hook.result.current.api.create(c.workplaceId,input));});expect(app.queryClient.getQueryState(own)?.isInvalidated).toBe(true);expect(app.queryClient.getQueryState(shared)?.isInvalidated).toBe(true);expect(app.queryClient.getQueryState(other)?.isInvalidated).toBe(false);});
 it("cash and bank stay separate; superseded jobs retain old snapshots",async()=>{const {api,app,c,mock}=await setup();await api.comparison(15);await caseInputsApi(app.api).create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{netPay:100}});mock.setJobStatus(15,"SUCCEEDED");const bank=await api.create(c.workplaceId,{...input,amount:70});const cash=await api.create(c.workplaceId,{...input,paymentMethod:"CASH",amount:30});await api.allocate(15,{transactionId:bank.transactionId,allocatedAmount:70,expectedInputVersion:c.inputVersion});await api.allocate(15,{transactionId:cash.transactionId,allocatedAmount:30,expectedInputVersion:c.inputVersion});mock.setJobStatus(15,"SUPERSEDED");expect((await api.comparison(15))?.freshness).toBe("STALE");mock.setJobStatus(15,"SUCCEEDED");const result=await api.comparison(15);expect(result?.linkedBankDepositTotal).toBe(70);expect(result?.linkedCashPaymentTotal).toBe(30);expect(result?.status).toBe("MATCH");});
 it.each(["MATCH","DIFFERENCE","INSUFFICIENT_INFORMATION","REVIEW_REQUIRED"] as const)("renders %s without inventing missing money",status=>{render(<ComparisonValues value={{depositComparisonId:1,version:1,status,payslipNetPay:null,linkedBankDepositTotal:0,linkedCashPaymentTotal:null,linkedPaymentTotal:null,difference:null}}/>);expect(screen.getByText("0원")).toBeVisible();expect(screen.getAllByText("미확인")).toHaveLength(4);});
 it("preserves snapshots and unrelated calculation across payment changes",async()=>{const {app,api,mock,c}=await setup();const before=await app.api.requestJson(`/cases/15/results`,v=>v as {calculation:unknown});expect((await api.comparison(15))?.linkedPaymentTotal).toBeNull();await caseInputsApi(app.api).create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{netPay:100}});mock.setJobStatus(15,"SUCCEEDED");const baseline=await app.api.requestJson(`/cases/15/results`,v=>v as {calculation:unknown});const t=await api.create(c.workplaceId,input);await api.allocate(15,{transactionId:t.transactionId,allocatedAmount:100,expectedInputVersion:c.inputVersion});expect((await api.comparison(15))?.freshness).toBe("STALE");mock.setJobStatus(15,"RUNNING");expect((await api.comparison(15))?.freshness).toBe("UPDATING");mock.setJobStatus(15,"FAILED");expect((await api.comparison(15))?.freshness).toBe("FAILED");mock.setJobStatus(15,"SUCCEEDED");expect((await api.comparison(15))?.status).toBe("MATCH");const after=await app.api.requestJson(`/cases/15/results`,v=>v as {calculation:unknown});expect(after.calculation).toEqual(baseline.calculation);expect(before.calculation).not.toBeNull();const h=await api.history(15);expect(h.items.length).toBeGreaterThan(1);expect(h.items.at(-1)?.linkedPaymentTotal).toBeNull();const allocation=(await api.allocations(15)).items[0];await api.updateAllocation(15,allocation.allocationId,{allocatedAmount:0,expectedInputVersion:c.inputVersion});mock.setJobStatus(15,"SUCCEEDED");expect((await api.comparison(15))?.status).toBe("DIFFERENCE");expect((await api.comparison(15))?.linkedPaymentTotal).toBe(0);await api.release(15,allocation.allocationId);mock.setJobStatus(15,"SUCCEEDED");expect((await api.comparison(15))?.status).toBe("INSUFFICIENT_INFORMATION");});
 it("server duplicate candidates link detail without merging",async()=>{const {api,c,mount}=await setup();await api.create(c.workplaceId,input);await api.create(c.workplaceId,input);mount(<PaymentScreen workplaceId={c.workplaceId}/>);fireEvent.click(await screen.findByRole("button",{name:"후보 상세 확인 #1"}));expect(await screen.findByRole("button",{name:"거래 수정 저장"})).toBeVisible();expect((await api.list(c.workplaceId)).total).toBe(2);});
 it("deletion cancellation preserves transaction, conflict permits explicit confirmed 204",async()=>{const {api,c,mount}=await setup();const t=await api.create(c.workplaceId,input);await api.allocate(15,{transactionId:t.transactionId,allocatedAmount:10,expectedInputVersion:c.inputVersion});mount(<PaymentScreen workplaceId={c.workplaceId}/>);fireEvent.click(await screen.findByRole("button",{name:"원거래 삭제"}));fireEvent.click(screen.getByRole("button",{name:"삭제 취소"}));expect((await api.list(c.workplaceId)).total).toBe(1);fireEvent.click(screen.getByRole("button",{name:"원거래 삭제"}));fireEvent.click(screen.getByRole("button",{name:"삭제 요청·서버 영향 확인"}));expect(await screen.findByText(/서버가 반환한 영향 내역: #15/)).toBeVisible();await waitFor(()=>expect(screen.getByRole("button",{name:"영향을 확인했으며 전체 삭제"})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:"영향을 확인했으며 전체 삭제"}));expect(await screen.findByText("등록된 거래가 없습니다. 지급액이 0원이라는 뜻은 아닙니다.")).toBeVisible();expect((await api.allocations(15)).total).toBe(0);});
 it("comparison panel loads history",async()=>{const {mount}=await setup();mount(<DepositComparisonPanel caseId={15}/>);expect(await screen.findByText(/정보 부족/)).toBeVisible();fireEvent.click(screen.getByText("입금 대조 스냅샷 이력"));expect(await screen.findByText(/과거 스냅샷/)).toBeVisible();});
 it("keeps payment pagination active and returns to page one",async()=>{
  const {api,c,mount}=await setup();
  for(let i=0;i<21;i++) await api.create(c.workplaceId,{...input,amount:i+1});
  mount(<PaymentScreen workplaceId={c.workplaceId}/>);
  const next=await screen.findByRole("button",{name:"\uB2E4\uC74C"});
  await waitFor(()=>expect(next).toBeEnabled());
  fireEvent.click(next);
  const previous=await screen.findByRole("button",{name:"\uC774\uC804"});
  await waitFor(()=>expect(previous).toBeEnabled());
  await waitFor(()=>expect(screen.getByRole("button",{name:"\uB2E4\uC74C"})).toBeDisabled());
  expect(screen.getAllByRole("button",{name:"\uC0C1\uC138\u00B7\uC218\uC815"})).toHaveLength(1);
  fireEvent.click(previous);
  await waitFor(()=>expect(screen.getByRole("button",{name:"\uC774\uC804"})).toBeDisabled());
  await waitFor(()=>expect(screen.getByRole("button",{name:"\uB2E4\uC74C"})).toBeEnabled());
 });

});
