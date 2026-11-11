// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { RecoveryScreen, DeletionStatusScreen } from "./components/account-screens";
const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(() => { cleanup(); replace.mockReset(); });
function mount(reset = false, deletion = false) {
 const app = createAppServices(testApiUrl);
 render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{deletion ? <DeletionStatusScreen /> : <RecoveryScreen reset={reset} />}</QueryClientProvider></AppServicesContext>);
 return app;
}
describe("account recovery UI", () => {
 it("focuses the invalid email without submitting", async () => {
  mount(); await userEvent.click(document.querySelector('form button')!);
  expect(document.querySelector('#recovery-email')).toHaveFocus();
 });
 it("shows accepted recovery without claiming delivery", async () => {
  let calls = 0; server.use(http.post(testApiUrl+'/auth/forgot-password', () => { calls++; return apiResponse({},202); }));
  mount(); await userEvent.type(document.querySelector('#recovery-email')!, 'unknown@example.com');
  await userEvent.dblClick(document.querySelector('form button')!);
  await waitFor(() => expect(calls).toBe(1)); expect(await screen.findByRole('status')).toBeVisible();
  expect(document.querySelector('form button')).toBeDisabled();
 });
 it("rejects a password mismatch before sending reset", async () => {
  let calls=0;server.use(http.post(testApiUrl+'/auth/reset-password',()=>{calls++;return new HttpResponse(null,{status:204})}));
  mount(true);await userEvent.type(document.querySelector('#reset-token')!,'test-token-value-123456');await userEvent.type(document.querySelector('#new-password')!,'new-password');await userEvent.type(document.querySelector('#confirm-password')!,'other');await userEvent.click(document.querySelector('form button')!);
  expect(document.querySelector('#confirm-password')).toHaveFocus();expect(calls).toBe(0);
 });
 it("clears credentials and navigates only after reset 204", async () => {
  server.use(http.post(testApiUrl+'/auth/reset-password',()=>new HttpResponse(null,{status:204})));
  const app=mount(true);app.session.start('old');await userEvent.type(document.querySelector('#reset-token')!,'test-token-value-123456');await userEvent.type(document.querySelector('#new-password')!,'new-password');await userEvent.type(document.querySelector('#confirm-password')!,'new-password');await userEvent.click(document.querySelector('form button')!);
  await waitFor(()=>expect(replace).toHaveBeenCalledWith('/login'));expect(app.session.getSnapshot().accessToken).toBeNull();
 });
 it("fetches receipt once without polling or bearer", async () => {
  let calls=0;server.use(http.get(testApiUrl+'/users/me/deletion',({request})=>{calls++;expect(request.headers.has('Authorization')).toBe(false);return apiResponse({})}));
  mount(false,true);await screen.findByRole('status');await waitFor(()=>expect(screen.getByRole('button')).not.toBeDisabled());expect(calls).toBe(1);
 });
});

describe('receipt polling lifecycle',()=>{
 it('polls pending then stops after terminal state',async()=>{
  let calls=0;server.use(http.get(testApiUrl+'/users/me/deletion',()=>apiResponse({status:++calls===1?'PENDING_PURGE':'PURGED',normalStoragePurgeDueAt:null})));
  mount(false,true);await waitFor(()=>expect(calls).toBe(2),{timeout:6500});await new Promise(r=>setTimeout(r,5200));expect(calls).toBe(2);
 },14000);
 it('does not refresh or poll a receipt 401',async()=>{
  let refresh=0,calls=0;server.use(http.post(testApiUrl+'/auth/refresh',()=>{refresh++;return apiResponse({},401)}),http.get(testApiUrl+'/users/me/deletion',()=>{calls++;return apiResponse({},401)}));mount(false,true);await screen.findByRole('alert');expect(calls).toBe(1);expect(refresh).toBe(0);
 });
 it('unmount removes the polling observer',async()=>{
  let calls=0;server.use(http.get(testApiUrl+'/users/me/deletion',()=>{calls++;return apiResponse({status:'PENDING_PURGE'})}));mount(false,true);await waitFor(()=>expect(calls).toBe(1));cleanup();await new Promise(r=>setTimeout(r,5200));expect(calls).toBe(1);
 },8000);
});

it('aborts a receipt request when its screen unmounts',async()=>{
 let signal:AbortSignal|undefined;server.use(http.get(testApiUrl+'/users/me/deletion',async({request})=>{signal=request.signal;await delay(200);return apiResponse({})}));mount(false,true);await waitFor(()=>expect(signal).toBeDefined());cleanup();await waitFor(()=>expect(signal?.aborted).toBe(true));
});
