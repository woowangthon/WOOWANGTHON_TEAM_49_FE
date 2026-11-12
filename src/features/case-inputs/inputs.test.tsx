// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { ManualScreen } from "./components/manual-screen";

import { InputStatus, ReadinessView, RecomputeView } from "./components/input-status";
import { caseInputsApi } from "./api";


const apps: AppServices[] = [];
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); apps.splice(0).forEach(a => { a.session.clear(); a.queryClient.clear(); }); });
async function setup() {
  const m = managementMocks(); const mock = inputMocks(m.getCases); server.use(...mock.handlers, ...m.handlers);
  const app = createAppServices(); apps.push(app); await app.auth.login({ email: "worker@example.com", password: "password1234" });
  const mount = (ui: ReactNode) => render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{ui}</QueryClientProvider></AppServicesContext>);
  return { app, api: caseInputsApi(app.api), m, mock, mount, user: userEvent.setup() };
}
describe("manual record forms with real API client and MSW", () => {
  it("keeps creation and editing drafts across task switches without mutation", async () => {
    const { mount, user, api, mock } = await setup();
    await api.create(15, { recordType: "CONTRACT", source: "USER_INPUT", data: { hourlyWage: 10000 } });
    mount(<ManualScreen caseId={15} />);
    const draft = await screen.findByLabelText("시급 (원) · 선택·미확인 가능");
    await user.type(draft, "0");
    await user.click(screen.getByRole("button", { name: "기존 기록" }));
    await user.click(await screen.findByRole("button", { name: "기록 #1 상세·수정" }));
    await user.click(await screen.findByRole("button", { name: "기록 수정" }));
    const detail = screen.getByRole("region", { name: "수기 기록 상세" });
    const edit = within(detail).getByLabelText("시급 (원) · 선택·미확인 가능");
    await user.clear(edit); await user.type(edit, "12000");
    await user.click(screen.getByRole("button", { name: "수정 닫기" }));
    await user.click(screen.getByRole("button", { name: "기록 수정" }));
    expect(edit).toHaveValue("12000");
    await user.click(screen.getByRole("button", { name: "새 입력" }));
    expect(draft).toBeVisible(); expect(draft).toHaveValue("0");
    expect(mock.requests).toHaveLength(1);
  });

  it("retains values on free step navigation and reveals a hidden 422 field", async () => {
    const { mount, user, mock } = await setup();
    server.use(http.post(`${testApiUrl}/cases/15/manual-records`, () => apiResponse({ errorCode: "VALIDATION_ERROR", errors: [{ field: "data.paymentItems", reason: "상세 금액 재확인" }] }, 422)));
    mount(<ManualScreen caseId={15} />);
    await user.selectOptions(await screen.findByLabelText("수기 자료 유형"), "PAYSLIP");
    const gross = screen.getByLabelText("지급총액 (원) · 선택·미확인 가능");
    await user.type(gross, "0");
    await user.click(screen.getByRole("button", { name: /^다음$/ }));
    const items = screen.getByLabelText("개별 지급액 목록 (원) · 선택·미확인 가능");
    await user.type(items, "0, 100");
    await user.click(screen.getByRole("button", { name: /^이전$/ }));
    expect(gross).toBeVisible(); expect(gross).toHaveValue("0");
    expect(mock.requests).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /4\. 확인/ }));
    await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    await screen.findByText("상세 금액 재확인");
    await waitFor(() => expect(items).toHaveFocus());
    expect(items).toBeVisible(); expect(items).toHaveValue("0, 100");
    await user.click(screen.getByRole("button", { name: /4\. 확인/ }));
    expect(screen.getByRole("region", { name: "입력 내용 확인" })).toBeVisible();
  });
  it.each([409,500])("preserves manual draft after save failure %s and supports explicit cancel", async status => {
    const {mount,user,mock}=await setup(); server.use(http.post(`${testApiUrl}/cases/15/manual-records`,()=>apiResponse({errorCode:status===409?"INPUT_VERSION_CONFLICT":"INTERNAL_ERROR"},status)));
    mount(<ManualScreen caseId={15}/>); const input=await screen.findByLabelText("시급 (원) · 선택·미확인 가능"); await user.type(input,"0");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button",{name:"수기 자료 저장"})); await screen.findByRole("alert"); expect(input).toHaveValue("0"); expect(mock.requests).toHaveLength(0);
    await user.click(screen.getByRole("button",{name:"입력 취소·되돌리기"})); expect(input).toHaveValue("");
  });

  it.each([
    { type: "ATTENDANCE", fields: { "근무일 · 필수": "2026-10-10", "출근 시각 (한국시간) · 필수": "2026-10-10T09:00", "퇴근 시각 (한국시간) · 필수": "2026-10-10T18:00", "휴게시간 (분) · 필수": "0" }, expected: { workDate: "2026-10-10", clockIn: "2026-10-10T09:00:00+09:00", clockOut: "2026-10-10T18:00:00+09:00", breakMinutes: 0 } },
    { type: "PAYSLIP", fields: { "지급총액 (원) · 선택·미확인 가능": "0", "개별 지급액 목록 (원) · 선택·미확인 가능": "0, 100" }, expected: { grossPay: 0, paymentItems: [0, 100] } },
  ])("creates $type from typed form fields", async ({ type, fields, expected }) => {
    const { mount, user, api } = await setup(); mount(<ManualScreen caseId={15} />);
    await user.selectOptions(await screen.findByLabelText("수기 자료 유형"), type);
    for (const [label, value] of Object.entries(fields)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    await screen.findByText("수기 기록 #1을 저장했습니다.");
    expect((await api.record(15, 1)).data).toEqual(expected);
  });
  it("shows empty state, creates zero without filling blank fields, edits and deletes", async () => {
    const { mount, user, mock } = await setup(); mount(<ManualScreen caseId={15} />);
    await screen.findByText("이 페이지에 수기 기록이 없습니다.");
    await user.type(screen.getByLabelText("시급 (원) · 선택·미확인 가능"), "0");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    await user.click(await screen.findByRole("button", { name: "기록 #1 상세·수정" }));
    expect(await screen.findByRole("region", { name: "수기 기록 상세" })).toHaveTextContent("0");
    expect((mock.requests[0].body as { data: unknown }).data).toEqual({ hourlyWage: 0 });
    await user.click(screen.getByRole("button", { name: "기록 수정" }));
    expect(within(screen.getByRole("region", { name: "수기 기록 상세" })).getByLabelText("시급 (원) · 선택·미확인 가능")).toHaveValue("0");
  });
  it("edits a complete data object and revokes deleted detail", async () => {
    const { mount, user, api, mock } = await setup(); await api.create(15, { recordType: "CONTRACT", source: "USER_INPUT", data: { hourlyWage: 10000, monthlyBasePay: null, extra: "keep" } });
    mount(<ManualScreen caseId={15} />); await user.click(await screen.findByRole("button", { name: "기존 기록" })); await user.click(await screen.findByRole("button", { name: "기록 #1 상세·수정" }));
    await user.click(await screen.findByRole("button", { name: "기록 수정" }));
    const detail = screen.getByRole("region", { name: "수기 기록 상세" });
    const input = within(detail).getByLabelText("시급 (원) · 선택·미확인 가능"); await user.clear(input); await user.type(input, "12000");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(within(detail).getByRole("button", { name: "수기 기록 수정 저장" }));
    await waitFor(() => expect(mock.requests.at(-1)?.method).toBe("PATCH"));
    expect((await api.record(15, 1)).data).toEqual({ hourlyWage: 12000, monthlyBasePay: null, extra: "keep" });
    await user.click(within(detail).getByRole("button", { name: "기록 삭제" }));
    await user.click(screen.getByRole("button", { name: "수기 기록 삭제 확인" }));
    await screen.findByText("이 페이지에 수기 기록이 없습니다.");
    expect(screen.queryByRole("region", { name: "수기 기록 상세" })).not.toBeInTheDocument();
  });
  it("creates DEPOSIT as a transaction receipt without a manual list entry", async () => {
    const { mount, user, api } = await setup(); mount(<ManualScreen caseId={15} />);
    await user.selectOptions(await screen.findByLabelText("수기 자료 유형"), "DEPOSIT");
    await user.selectOptions(screen.getByLabelText("수령 수단 · 필수"), "CASH");
    await user.type(screen.getByLabelText("수령일 · 필수"), "2026-11-10"); await user.type(screen.getByLabelText("수령액 (원) · 필수"), "0");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    expect(await screen.findByText(/입금 거래 #1 · 배분 #2/)).toBeVisible();
    expect((await api.list(15, 1)).total).toBe(0);
  });
  it("focuses required attendance fields and displays date validation", async () => {
    const { mount, user, mock } = await setup(); mount(<ManualScreen caseId={15} />);
    await user.selectOptions(await screen.findByLabelText("수기 자료 유형"), "ATTENDANCE");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    await waitFor(() => expect(screen.getByLabelText("근무일 · 필수")).toHaveFocus());
    expect(mock.requests).toHaveLength(0);
  });
  it("maps server field validation to manual inputs", async () => {
    const { mount, user } = await setup(); server.use(http.post(`${testApiUrl}/cases/15/manual-records`, () => apiResponse({ errorCode: "VALIDATION_ERROR", errors: [{ field: "data.hourlyWage", reason: "시급 값을 다시 확인하세요" }] }, 422)));
    mount(<ManualScreen caseId={15} />); await user.type(await screen.findByLabelText("시급 (원) · 선택·미확인 가능"), "1"); await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    expect(await screen.findByText("시급 값을 다시 확인하세요")).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("시급 (원) · 선택·미확인 가능")).toHaveFocus());
  });
});
describe("independent readiness and authoritative freshness", () => {
  it("keeps FULL and PARTIAL checks accessible when wage readiness is NONE", () => {
    render(<ReadinessView caseId={15} data={{ caseId: 15, inputVersion: 7, checks: [{ checkType: "WAGE_CALCULATION", available: false, mode: "NONE", missingInputs: ["contract"] }, { checkType: "PAYSLIP_VALIDATION", available: true, mode: "FULL", missingInputs: [] }, { checkType: "DEPOSIT_COMPARISON", available: true, mode: "PARTIAL", missingInputs: ["allocation"] }] }} />);
    expect(screen.getByRole("article", { name: "임금 계산" })).toHaveTextContent("실행 보류"); expect(screen.getByRole("article", { name: "명세서 합계 검사" })).toHaveTextContent("실행 가능"); expect(screen.getByRole("article", { name: "입금 대조" })).toHaveTextContent("PARTIAL");
    expect(screen.getAllByRole("link", { name: "수기 자료 확인" })).toHaveLength(4);
  });
  it("shows server CURRENT/STALE/UPDATING/FAILED without comparing input versions", () => {
    render(<RecomputeView data={{ caseId: 15, pending: 0, running: 0, currentInputVersion: 99, activeJob: null, latestJob: { status: "FAILED", errorCode: "RECOMPUTE_FAILED" }, results: { calculation: { inputVersion: 1, version: 1, freshness: "CURRENT" }, comparison: { freshness: "STALE" }, payslipValidation: { freshness: "UPDATING" }, depositComparison: { freshness: "FAILED" } } }} />);
    expect(screen.getByText(/임금 계산: CURRENT/)).toBeVisible(); expect(screen.getByText(/계약·근태 대조: STALE/)).toBeVisible(); expect(screen.getByText(/명세서 합계 검사: UPDATING/)).toBeVisible(); expect(screen.getByRole("alert")).toHaveTextContent("RECOMPUTE_FAILED");
  });
  it("polls only active jobs and stops after a terminal response", async () => {
    const { mount } = await setup(); let calls = 0;
    server.use(http.get(`${testApiUrl}/cases/15/recompute-status`, () => { const status = ["PENDING", "RUNNING", "PARTIAL"][Math.min(calls++, 2)]; return apiResponse({ caseId: 15, pending: status === "PENDING" ? 1 : 0, running: status === "RUNNING" ? 1 : 0, activeJob: status === "PARTIAL" ? null : { status }, latestJob: { status } }); }));
    mount(<InputStatus caseId={15} />);
    await screen.findByText("현재 진행 중인 작업 없음 · PARTIAL", {}, { timeout: 7000 });
    expect(calls).toBe(3); await new Promise(resolve => setTimeout(resolve, 2200)); expect(calls).toBe(3);
  }, 10000);
  it("observes a scheduled receipt even before the job appears, then stops", async () => {
    const { mount, user } = await setup(); let calls = 0;
    server.use(http.get(`${testApiUrl}/cases/15/recompute-status`, () => {
      calls++; return apiResponse({ caseId: 15, pending: 0, running: 0, activeJob: null, latestJob: calls >= 3 ? { jobId: "input-job-1", status: "PARTIAL" } : null });
    }));
    mount(<ManualScreen caseId={15} />);
    await user.type(await screen.findByLabelText("시급 (원) · 선택·미확인 가능"), "0");
    await user.click(screen.getByRole("button", { name: /[0-9]+\. 확인/ })); await user.click(screen.getByRole("button", { name: "수기 자료 저장" }));
    await screen.findByText(/저장 응답에서 자동 갱신 접수를 확인했으나/);
    await screen.findByText("현재 진행 중인 작업 없음 · PARTIAL", {}, { timeout: 5000 });
    expect(calls).toBe(3);
  }, 8000);
});
