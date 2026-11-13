// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {afterEach,it,expect,vi} from "vitest";
import {cleanup,render,screen,fireEvent,waitFor} from "@testing-library/react";
import {QueryClientProvider} from "@tanstack/react-query";
import {AppServicesContext} from "@/hooks/use-app-services";
import {createAppServices,type AppServices} from "@/lib/app-services";
import {managementMocks} from "@/mocks/shared/management-handlers";
import {inputMocks} from "@/mocks/shared/input-handlers";
import {server,testApiUrl,apiResponse} from "@/test/server";
import {http} from "msw";
import {createTranslation} from "@/i18n/translate";
import {TranslationLocaleContext} from "@/i18n/use-translation";
import type {Locale} from "@/i18n/config";
import {caseInputsApi} from "@/features/case-inputs/api";
import {CaseDeposits} from "./case-deposits";
import {connectPayment} from "./connect-payment";
import {paymentsApi} from "./api";
import type {Transaction} from "./schemas";
const t=createTranslation("ko").translate;
const apps:AppServices[]=[];
afterEach(()=>{cleanup();vi.restoreAllMocks();apps.splice(0).forEach(a=>{a.session.clear();a.queryClient.clear();});});
const body={paymentMethod:"BANK_TRANSFER" as const,transactionDate:"2026-11-10",amount:992727,source:"USER_INPUT" as const,confirmationStatus:"USER_REPORTED" as const};
async function setup(locale:Locale="ko"){const m=managementMocks();const mock=inputMocks(m.getCases);server.use(...mock.handlers,...m.handlers,http.get(`${testApiUrl}/workplaces/:w/documents`,()=>apiResponse({items:[],page:1,size:100,total:0})));const app=createAppServices();apps.push(app);await app.auth.login({email:"worker@example.com",password:"password1234"});const api=paymentsApi(app.api);const c=m.getCases().find(c=>c.caseId===15)!;return {app,mock,api,c,mount:()=>render(<TranslationLocaleContext value={locale}><AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><CaseDeposits workplaceId={c.workplaceId} caseId={15}/></QueryClientProvider></AppServicesContext></TranslationLocaleContext>)};}
it("keeps unconfirmed allocations out of comparison, confirms two existing transactions and reuses allocations",async()=>{
 const {app,api,c,mock,mount}=await setup();
 await caseInputsApi(app.api).create(15,{recordType:"PAYSLIP",source:"USER_INPUT",data:{netPay:2992727}});
 for(const amount of [992727,2000000]){const tx=await api.create(c.workplaceId,{...body,amount});await api.allocate(15,{transactionId:tx.transactionId,allocatedAmount:amount,expectedInputVersion:c.inputVersion});}
 mock.setJobStatus(15,"SUCCEEDED");expect((await api.comparison(15))?.linkedPaymentTotal).toBeNull();
 mount();await screen.findByText(t("payments.needsConfirmation"));fireEvent.click(screen.getByRole("button",{name:t("common.edit")}));
 vi.spyOn(window,"confirm").mockReturnValue(true);
 const actions=await screen.findAllByRole("button",{name:t("payments.confirmDeposit")});fireEvent.click(actions[0]);
 await waitFor(()=>expect(screen.getAllByRole("button",{name:t("payments.confirmDeposit")})).toHaveLength(1));
 const last=screen.getByRole("button",{name:t("payments.confirmDeposit")});await waitFor(()=>expect(last).toBeEnabled());fireEvent.click(last);
 await waitFor(()=>expect(screen.queryByRole("button",{name:t("payments.confirmDeposit")})).not.toBeInTheDocument());
 expect((await api.allocations(15)).total).toBe(2);expect((await api.list(c.workplaceId)).total).toBe(2);
 expect((await api.list(c.workplaceId)).items.every(tx=>tx.confirmationStatus==="USER_CONFIRMED")).toBe(true);
 mock.setJobStatus(15,"FAILED");expect((await api.comparison(15))?.freshness).toBe("FAILED");
 mock.setJobStatus(15,"SUCCEEDED");expect(await api.comparison(15)).toMatchObject({freshness:"CURRENT",linkedPaymentTotal:2992727,status:"MATCH"});
});
it("distinguishes empty from explicit zero and only renders manual fields after selection",async()=>{
 const {api,c,mount}=await setup();mount();await screen.findByText(t("payments.notEntered"));fireEvent.click(screen.getByRole("button",{name:t("common.edit")}));
 expect(screen.queryByLabelText(t("payments.paymentScreen_transaction"))).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole("combobox"),{target:{value:"manual"}});
 expect(screen.getByLabelText(t("payments.paymentScreen_label5"))).toBeInTheDocument();
 expect(document.querySelector("form form")).toBeNull();
 const tx=await api.create(c.workplaceId,{...body,amount:0,confirmationStatus:"USER_CONFIRMED"});await api.allocate(15,{transactionId:tx.transactionId,allocatedAmount:0,expectedInputVersion:c.inputVersion});
});
it.each([403,409,422,500,200])("retains registration and confirmation after allocation failure %s, retries without duplicates",async(status)=>{
 const {api,c,mock}=await setup();let saved:Transaction|undefined;
 const run=()=>connectPayment({api,workplaceId:c.workplaceId,caseId:15,body,transactionId:saved?.transactionId,remember:tx=>{saved=tx;},confirm:()=>true,currentVersion:async()=>c.inputVersion});
 server.use(http.post(`${testApiUrl}/cases/15/deposits`,()=>apiResponse(status===200?{}:{errorCode:"FORBIDDEN"},status)));
 await expect(run()).rejects.toThrow();expect(saved?.confirmationStatus).toBe("USER_CONFIRMED");
 server.use(...mock.handlers);await run();await run();
 expect((await api.list(c.workplaceId)).total).toBe(1);expect((await api.allocations(15)).total).toBe(1);
});
it("retries confirmation without recreating a transaction and respects declined approval",async()=>{
 const {api,c,mock}=await setup();let saved:Transaction|undefined;
 const run=(confirm=()=>true)=>connectPayment({api,workplaceId:c.workplaceId,caseId:15,body,transactionId:saved?.transactionId,remember:tx=>{saved=tx;},confirm,currentVersion:async()=>c.inputVersion});
 await run(()=>false);expect(saved?.confirmationStatus).toBe("USER_REPORTED");expect((await api.allocations(15)).total).toBe(0);
 server.use(http.patch(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions/:id`,()=>apiResponse({errorCode:"FORBIDDEN"},403)));
 await expect(run()).rejects.toThrow();server.use(...mock.handlers);await run();expect((await api.list(c.workplaceId)).total).toBe(1);
});
it("uses only remaining server balance when another Case already has an allocation",async()=>{
 const {api,c}=await setup();const tx=await api.create(c.workplaceId,{...body,amount:100});
 await api.allocate(16,{transactionId:tx.transactionId,allocatedAmount:60});
 const confirm=vi.fn(()=>true);
 await connectPayment({api,workplaceId:c.workplaceId,caseId:15,transactionId:tx.transactionId,remember:()=>{},confirm,currentVersion:async()=>c.inputVersion});
 expect(confirm.mock.calls[0]).toEqual([expect.objectContaining({remainingUnallocated:40})]);
 expect((await api.allocations(15)).items[0].allocatedAmount).toBe(40);
 expect((await api.allocations(16)).items[0].allocatedAmount).toBe(60);
 const a=(await api.allocations(15)).items[0];await api.release(15,a.allocationId);
 expect((await api.allocations(16)).items[0].allocatedAmount).toBe(60);expect((await api.list(c.workplaceId)).total).toBe(1);
});
it("shows safe document labels, adds OCR provenance, removes only the Case allocation, and recovers deletion failure",async()=>{
 const {api,c,mock,mount}=await setup();mock.depositCandidates.push({registration:{...body,source:"DOCUMENT",sourceDocumentId:101,sourceCandidateId:"candidate",sourceRowId:"transaction_1"},registerable:true,reasonCode:null,existingTransactionId:null,requiresCaseAllocation:true,requiresUserConfirmation:true});
 vi.spyOn(window,"confirm").mockReturnValue(true);mount();fireEvent.click(screen.getByRole("button",{name:t("common.edit")}));
 const option=await screen.findByRole("option",{name:new RegExp(t("payments.depositField"))});expect(option.textContent).not.toContain("transaction_1");expect(option.textContent).not.toContain("candidate");
 fireEvent.change(screen.getByRole("combobox"),{target:{value:(option as HTMLOptionElement).value}});const add=await screen.findByRole("button",{name:t("payments.addDeposit")});await waitFor(()=>expect(add).toBeEnabled());fireEvent.click(add);
 const minus=await screen.findByRole("button",{name:t("payments.removeDeposit")});await waitFor(()=>expect(minus).toBeEnabled());
 expect((await api.list(c.workplaceId)).items[0]).toMatchObject({source:"DOCUMENT",sourceRowId:"transaction_1",confirmationStatus:"USER_CONFIRMED"});
 server.use(http.delete(`${testApiUrl}/cases/15/deposits/:a`,()=>apiResponse({errorCode:"FORBIDDEN"},500)));fireEvent.click(minus);await screen.findAllByRole("alert");expect((await api.allocations(15)).total).toBe(1);
 server.use(...mock.handlers);await waitFor(()=>expect(minus).toBeEnabled());fireEvent.click(minus);await waitFor(async()=>expect((await api.allocations(15)).total).toBe(0));expect((await api.list(c.workplaceId)).total).toBe(1);
});
it.each(['ko','en','km','vi','zh'] as const)('formats confirmed Case allocations in %s and distinguishes a saved zero',async locale=>{
 const {api,c,mount}=await setup(locale);
 const tx=await api.create(c.workplaceId,{...body,amount:0,confirmationStatus:'USER_CONFIRMED'});
 await api.allocate(15,{transactionId:tx.transactionId,allocatedAmount:0,expectedInputVersion:c.inputVersion});
 mount();await screen.findByText(new Intl.NumberFormat(locale,{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(0).replace(/\s/g,' '));
 expect(screen.queryByText(createTranslation(locale).translate('payments.notEntered'))).not.toBeInTheDocument();
});
it('saves manual input immediately through its own form and updates the summary',async()=>{
 const {api,c,mount}=await setup();vi.spyOn(window,'confirm').mockReturnValue(true);mount();
 fireEvent.click(screen.getByRole('button',{name:t('common.edit')}));
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'manual'}});
 fireEvent.change(screen.getByLabelText(t('payments.paymentScreen_transaction')),{target:{value:'2026-11-10'}});
 fireEvent.change(screen.getByLabelText(t('payments.paymentScreen_amount')),{target:{value:'2992727'}});
 fireEvent.change(screen.getByLabelText(t('payments.paymentScreen_label5')),{target:{value:'test memo'}});
 const add=await screen.findByRole('button',{name:t('payments.addDeposit')});await waitFor(()=>expect(add).toBeEnabled());fireEvent.click(add);
 await screen.findByRole('button',{name:t('payments.removeDeposit')});
 expect((await api.list(c.workplaceId)).items[0]).toMatchObject({memo:'test memo',confirmationStatus:'USER_CONFIRMED'});
 expect((await api.allocations(15)).items[0].allocatedAmount).toBe(2992727);
 await waitFor(()=>expect(screen.getByRole('button',{name:t('payments.finishEditing')})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:t('payments.finishEditing')}));await screen.findByText(new Intl.NumberFormat('ko',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(2992727));
});
it('reuses a duplicate document transaction returned by 409 and does not duplicate its allocation',async()=>{
 const {api,c}=await setup();const original=await api.create(c.workplaceId,body);
 server.use(http.post(`${testApiUrl}/workplaces/${c.workplaceId}/payment-transactions`,()=>apiResponse({errorCode:'DUPLICATE_TRANSACTION',details:{existingTransactionId:original.transactionId}},409)));
 const run=()=>connectPayment({api,workplaceId:c.workplaceId,caseId:15,body,remember:()=>{},confirm:()=>true,currentVersion:async()=>c.inputVersion});
 await run();await run();expect((await api.list(c.workplaceId)).total).toBe(1);expect((await api.allocations(15)).total).toBe(1);
});
