// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen,fireEvent,waitFor} from "@testing-library/react";
import {QueryClientProvider} from "@tanstack/react-query";
import {AppServicesContext} from "@/hooks/use-app-services";
import {createAppServices,type AppServices} from "@/lib/app-services";
import {managementMocks} from "@/mocks/shared/management-handlers";
import {inputMocks} from "@/mocks/shared/input-handlers";
import {server,testApiUrl,apiResponse} from "@/test/server";
import {http} from "msw";
import {DepositCandidates} from "./deposit-connections";
import {PaymentScreen} from "./payment-screen";
import {paymentsApi} from "./api";
import {createTranslation} from "@/i18n/translate";
import type {DepositCandidate} from "./schemas";
const t=createTranslation("ko").translate;
const apps:AppServices[]=[];
afterEach(()=>{cleanup();apps.splice(0).forEach(a=>{a.session.clear();a.queryClient.clear();});});
const candidate:DepositCandidate={registration:{source:"DOCUMENT",sourceDocumentId:101,sourceCandidateId:"ocr-1",sourceRowId:"transaction_1",transactionDate:"2026-11-10",amount:100,paymentMethod:"BANK_TRANSFER",confirmationStatus:"USER_REPORTED"},registerable:true,reasonCode:null,existingTransactionId:null,requiresUserConfirmation:true,requiresCaseAllocation:true};
async function setup(){const m=managementMocks();const mock=inputMocks(m.getCases);server.use(...mock.handlers,...m.handlers);const app=createAppServices();apps.push(app);await app.auth.login({email:"worker@example.com",password:"password1234"});const api=paymentsApi(app.api);const c=m.getCases().find(c=>c.caseId===15)!;return {mock,api,c,mount:(node:React.ReactNode)=>render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{node}</QueryClientProvider></AppServicesContext>)};}
it("queries empty candidates and preserves source and provenance on registration without confirming or allocating",async()=>{
 const {mock,api,c,mount}=await setup();expect((await api.candidates(c.workplaceId)).items).toEqual([]);mock.depositCandidates.push({...candidate,registration:{...candidate.registration,amount:"100"}});
 const select=vi.fn();mount(<DepositCandidates workplaceId={c.workplaceId} caseId={15} onSelect={select}/>);
 fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));
 expect(await screen.findByRole("link",{name:t("payments.sourceDocument",{id:101})})).toHaveAttribute("href","/cases/15/review?documentId=101");
 fireEvent.click(await screen.findByRole("button",{name:t("payments.registerCandidate")}));
 await waitFor(()=>expect(select).toHaveBeenCalledOnce());
 expect((await api.list(c.workplaceId)).items[0]).toMatchObject({...candidate.registration,confirmationStatus:"USER_REPORTED"});
 expect((await api.allocations(15)).items).toEqual([]);
 const refreshed=await api.candidates(c.workplaceId);expect(refreshed.items[0]).toMatchObject({registerable:false,existingTransactionId:select.mock.calls[0][0].transactionId});
 fireEvent.click(await screen.findByRole("button",{name:t("payments.reuseCandidate")}));await waitFor(()=>expect(select).toHaveBeenCalledTimes(2));expect((await api.list(c.workplaceId)).total).toBe(1);
});
it("blocks incomplete and nonregisterable rows, including missing date and amount",async()=>{
 const {mock,c,mount}=await setup();mock.depositCandidates.push({...candidate,registerable:false,reasonCode:"SOURCE_MISSING"},{...candidate,registration:{...candidate.registration,amount:null,transactionDate:null}});
 mount(<DepositCandidates workplaceId={c.workplaceId} onSelect={vi.fn()}/>);fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));
 for(const button of await screen.findAllByRole("button",{name:t("payments.registerCandidate")}))expect(button).toBeDisabled();
});
it("retains a registered transaction after confirmation failure, then confirms and retries a failed partial allocation",async()=>{
 const {api,c,mock,mount}=await setup();const tx=await api.create(c.workplaceId,{...candidate.registration,amount:100,transactionDate:"2026-11-10"});vi.spyOn(window,"confirm").mockReturnValue(true);
 server.use(http.patch(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/${tx.transactionId}`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));
 mount(<PaymentScreen workplaceId={c.workplaceId} caseId={15} inputVersion={c.inputVersion}/>);
 fireEvent.click(await screen.findByRole("button",{name:t("payments.confirmTransaction")}));await screen.findAllByRole("alert");expect((await api.detail(c.workplaceId,tx.transactionId)).confirmationStatus).toBe("USER_REPORTED");
 server.use(...mock.handlers);
 const confirm=screen.getByRole("button",{name:t("payments.confirmTransaction")});await waitFor(()=>expect(confirm).toBeEnabled());fireEvent.click(confirm);
 await waitFor(async()=>expect((await api.detail(c.workplaceId,tx.transactionId)).confirmationStatus).toBe("USER_CONFIRMED"));
 server.use(http.post(`${testApiUrl}/cases/15/deposits`,()=>apiResponse({errorCode:"INPUT_VERSION_CONFLICT"},409)));
 const field=screen.getByLabelText(t("payments.paymentScreen_case_allocation"));fireEvent.change(field,{target:{value:"40"}});
 const save=screen.getByRole("button",{name:t("payments.paymentScreen_allocation_save")});await waitFor(()=>expect(save).toBeEnabled());fireEvent.click(save);
 await screen.findAllByRole("alert");expect((await api.allocations(15)).total).toBe(0);expect((await api.detail(c.workplaceId,tx.transactionId)).confirmationStatus).toBe("USER_CONFIRMED");
 server.use(...mock.handlers);await waitFor(()=>expect(save).toBeEnabled());fireEvent.click(save);
 await waitFor(async()=>expect((await api.allocations(15)).items[0]?.allocatedAmount).toBe(40));expect((await api.list(c.workplaceId)).total).toBe(1);
});

it("renders an empty state without a failure panel, and retries candidate permission errors",async()=>{
 const {mock,c,mount}=await setup();server.use(http.get(`${testApiUrl}/workplaces/${c.workplaceId}/deposit-candidates`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));
 mount(<DepositCandidates workplaceId={c.workplaceId} onSelect={vi.fn()}/>);fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));await screen.findByRole("alert");
 server.use(...mock.handlers);fireEvent.click(screen.getByRole("button",{name:t("common.retry")}));await screen.findByText(t("payments.noCandidates"));expect(screen.queryByRole("heading",{name:t("common.queryFeedback_request_processing_failure")})).not.toBeInTheDocument();
});

it("previews the full remaining balance and confirms only on explicit connection",async()=>{
 const {mock,api,c,mount}=await setup();mock.depositCandidates.push(candidate);
 const keys:string[]=[];
 const observe=({request}:{request:Request})=>{if(request.method==="POST"&&request.url.endsWith("/cases/15/deposits"))keys.push(request.headers.get("Idempotency-Key")??"");};
 server.events.on("request:start",observe);
 mount(<DepositCandidates workplaceId={c.workplaceId} caseId={15} inputVersion={c.inputVersion} onSelect={vi.fn()}/>);
 fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));
 fireEvent.click(await screen.findByRole("button",{name:t("payments.registerCandidate")}));
 const connect=await screen.findByRole("button",{name:t("payments.confirmAndConnect")});
 expect(screen.getByText(t("payments.autoAmount",{amount:"100"}))).toBeInTheDocument();
 expect((await api.allocations(15)).total).toBe(0);
 expect((await api.list(c.workplaceId)).items[0].confirmationStatus).toBe("USER_REPORTED");
 expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
 await waitFor(()=>expect(connect).toBeEnabled());fireEvent.click(connect);
 await screen.findByText(t("payments.connected"));
 expect((await api.allocations(15)).items[0].allocatedAmount).toBe(100);
 expect((await api.list(c.workplaceId)).items[0].confirmationStatus).toBe("USER_CONFIRMED");
 expect(keys).toHaveLength(1);expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
 server.events.removeListener("request:start",observe);
});
it("uses the remaining server balance and reuses registration after confirmation failure",async()=>{
 const {mock,api,c,mount}=await setup();mock.depositCandidates.push(candidate);
 const tx=await api.create(c.workplaceId,{...candidate.registration,amount:100,transactionDate:"2026-11-10"});
 server.use(http.get(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/${tx.transactionId}`,()=>apiResponse({...tx,totalAllocatedAcrossCases:60,remainingUnallocated:40})),http.patch(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/${tx.transactionId}`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));
 mount(<DepositCandidates workplaceId={c.workplaceId} caseId={15} inputVersion={c.inputVersion} onSelect={vi.fn()}/>);
 fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));
 fireEvent.click(await screen.findByRole("button",{name:t("payments.reuseCandidate")}));
 const connect=await screen.findByRole("button",{name:t("payments.confirmAndConnect")});
 expect(screen.getByText(t("payments.autoAmount",{amount:"40"}))).toBeInTheDocument();await waitFor(()=>expect(connect).toBeEnabled());fireEvent.click(connect);
 await screen.findByText(t("payments.connectionFailed"));expect((await api.list(c.workplaceId)).total).toBe(1);
 expect((await api.allocations(15)).total).toBe(0);
});

it.each([409,422,403,200])("preserves confirmation and retries allocation failure %s without registering again",async status=>{
 const {mock,api,c,mount}=await setup();mock.depositCandidates.push(candidate);
 server.use(http.post(`${testApiUrl}/cases/15/deposits`,()=>apiResponse(status===200?{}:{errorCode:status===409?"INPUT_VERSION_CONFLICT":status===403?"FORBIDDEN":"VALIDATION_ERROR"},status)));
 mount(<DepositCandidates workplaceId={c.workplaceId} caseId={15} inputVersion={c.inputVersion} onSelect={vi.fn()}/>);
 fireEvent.click(screen.getByRole("button",{name:t("payments.importCandidates")}));
 fireEvent.click(await screen.findByRole("button",{name:t("payments.registerCandidate")}));
 const connect=await screen.findByRole("button",{name:t("payments.confirmAndConnect")});
 await waitFor(()=>expect(connect).toBeEnabled());fireEvent.click(connect);
 await screen.findByText(t("payments.connectionFailed"));
 expect((await api.list(c.workplaceId)).items[0].confirmationStatus).toBe("USER_CONFIRMED");
 expect((await api.allocations(15)).total).toBe(0);
 server.use(...mock.handlers);await waitFor(()=>expect(connect).toBeEnabled());fireEvent.click(connect);
 await screen.findByText(t("payments.connected"));
 expect((await api.list(c.workplaceId)).total).toBe(1);
 expect((await api.allocations(15)).items[0].allocatedAmount).toBe(100);
});
