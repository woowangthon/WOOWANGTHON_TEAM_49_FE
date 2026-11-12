// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "@/features/auth/components/auth-gate";
import { CaseDetailScreen } from "@/features/cases/components/case-detail-screen";
import { TaskNavigation } from "@/features/cases/components/case-context";
import { ConsultationScreen } from "@/features/case-support/consultation-screen";
import { BrandLink } from "@/components/layout/brand-link";
import { documentMocks } from "@/mocks/shared/document-handlers";
import { WorkspaceNavigation } from "@/features/auth/components/workspace-navigation";
import { CaseForm } from "@/features/cases/components/case-form";
import { CaseList } from "@/features/cases/components/case-list";
import { WorkplaceDetailScreen } from "@/features/workplaces/components/workplace-detail-screen";
import { WorkplaceForm } from "@/features/workplaces/components/workplace-form";
import { WorkplaceListScreen } from "@/features/workplaces/components/workplace-list-screen";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { businessKeys as keys } from "@/lib/query/business-keys";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { managementMocks } from "@/test/management-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";

import { DashboardScreen } from "./dashboard-screen";
import { caseApi } from "@/features/cases/api";

const navigation = vi.hoisted(() => ({ router: { replace: vi.fn() }, pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation.router, usePathname: () => navigation.pathname, useSearchParams: () => new URLSearchParams() }));

const apps: AppServices[] = [];
const unhandledRequests: string[] = [];
beforeAll(() => {
  server.events.on("request:unhandled", ({ request }) => {
    unhandledRequests.push(`${request.method} ${request.url}`);
  });
  // jsdom does not implement modal presentation. Native keyboard/focus is checked in Edge.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => { navigation.router.replace.mockReset(); navigation.pathname = "/dashboard"; });
afterEach(() => {
  cleanup();
  apps.splice(0).forEach((app) => { app.session.clear(); app.queryClient.clear(); });
  expect(unhandledRequests.splice(0)).toEqual([]);
});

async function setup(empty = false) {
  const mocks = managementMocks({ empty });
  // Detail screens also mount payment/comparison queries inside disclosures.
  // Share the management store so these requests exercise consistent Case data.
  const inputs = inputMocks(mocks.getCases, testApiUrl);
  server.use(...mocks.handlers, ...inputs.handlers, ...documentMocks(mocks.getCases()).handlers);
  const app = createAppServices();
  apps.push(app);
  await app.auth.login({ email: "worker@example.com", password: "password1234" });
  const mount = (ui: ReactNode) => render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><AuthGate mode="protected">{ui}</AuthGate></QueryClientProvider></AppServicesContext>);
  return { app, mocks, mount, user: userEvent.setup() };
}

describe("dashboard and management user flows with MSW", () => {
  it("opens existing cases and starts a first case while retaining workplace management", async () => {
    const { mount, mocks, user } = await setup();
    server.use(http.get(`${testApiUrl}/workplaces`, () => apiResponse({ items: [
      { workplaceId: 3, name: "이전 근무지", industry: "음식점", region: "청주시", employmentStatus: "FORMER", caseCount: 2, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" },
      { workplaceId: 4, name: "새 근무지", industry: null, region: null, employmentStatus: "CURRENT", caseCount: 0, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" },
    ], page: 1, size: 20, total: 2 })));
    mount(<WorkplaceListScreen />);
    const previous = await screen.findByRole("link", { name: "이전 근무지" });
    expect(previous).toHaveAttribute("href", "/workplaces/3");
    expect(previous).toHaveAccessibleDescription("급여 내역 2개 보기");
    expect(within(previous).getByText("퇴사", { exact: true })).toBeVisible();
    expect(screen.getByRole("link", { name: "새 근무지" })).toHaveAttribute("href", "/cases/new?workplaceId=4");
    expect(screen.getByRole("link", { name: "새 근무지 근무지 정보" })).toHaveAttribute("href", "/workplaces/4");
    expect(screen.queryByRole("navigation", { name: "페이지 이동" })).not.toBeInTheDocument();
    const input = screen.getByLabelText("현재 페이지에서 검색");
    await user.type(input, "없는 이름");
    expect(screen.getByText("현재 페이지에 검색 결과가 없습니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "검색 초기화" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("link", { name: "이전 근무지" })).toBeVisible();
    expect(mocks.requests.some(request => request.method !== "GET")).toBe(false);
  });

  it("provides one registration action and no search or pagination for an empty workplace list", async () => {
    const { mount } = await setup(true);
    mount(<WorkplaceListScreen />);
    expect(await screen.findByRole("heading", { name: "첫 근무지를 등록해 주세요" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "근무지 등록" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "근무지 등록" })).toHaveAttribute("href", "/workplaces/new");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "페이지 이동" })).not.toBeInTheDocument();
  });

  it("reveals attention items three at a time within the fetched page", async () => {
    const { mount, app } = await setup();
    const data=await caseApi(app.api).list({page:1,size:20});
    server.use(http.get(`${testApiUrl}/cases`,()=>apiResponse({...data,items:data.items.map(item=>({...item,attentionRequired:true}))})));
    mount(<DashboardScreen />);
    await screen.findByText("확인 필요 여부가 제공된 20건 기준");
    const region=screen.getByRole("heading",{name:"확인할 작업"}).closest("section")!;
    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    const more=within(region).queryByRole("button",{name:/더 보기/});
    if(more){fireEvent.click(more);expect(within(region).getAllByRole("listitem").length).toBeGreaterThan(3);}
  });
  it("shows only response-derived totals and attention scope on the dashboard", async () => {
    const { mount } = await setup();
    mount(<DashboardScreen />);
    expect(await screen.findByRole("heading", { name: "내 급여, 이어서 살펴볼까요" })).toBeVisible();
    await screen.findByText("확인 필요 여부가 제공된 20건 기준");
    const current = screen.getByRole("region", { name: "현재 검토" });
    const step = within(current).getByRole("link", { current: "step" });
    expect(within(current).getByRole("link", { name: "현재 내역 이어가기" })).toHaveAttribute("href", step.getAttribute("href"));
    const heading = screen.getByRole("heading", { name: "전체 근무지" });
    expect(within(heading.parentElement!).getByText("21개")).toBeVisible();
    expect(screen.getByText("작업 완료", { exact: true })).toBeVisible();
    const scope = screen.getByText("목록과 통계의 조회 범위");
    expect(scope.closest("details")).not.toHaveAttribute("open");
    await userEvent.click(scope);
    expect(scope.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(/첫 페이지에 조회된 최대 20건/)).toBeVisible();
    expect(screen.getByText(/작업 단계는 검사 완료나 결과 일치를 의미하지 않습니다/)).toBeVisible();
  });

  it("offers first-workplace and first-Case CTAs for empty dashboard data", async () => {
    const { mount } = await setup(true);
    mount(<DashboardScreen />);
    const onboarding = await screen.findByRole("region", { name: "첫 근무지를 등록해 주세요" });
    expect(within(onboarding).getByRole("link", { name: "첫 근무지 등록" })).toHaveAttribute("href", "/workplaces/new");
    expect(screen.queryByRole("link", { name: "현재 내역 이어가기" })).toBeNull();
    expect(await screen.findByRole("link", { name: "첫 내역 준비하기" })).toHaveAttribute("href", "/workplaces/new");
  });

  it("searches only the current workplace page and supports server pagination", async () => {
    const { mount, mocks, user } = await setup();
    mount(<WorkplaceListScreen />);
    await screen.findByRole("link", { name: "카페 나무" });
    await user.type(screen.getByLabelText("현재 페이지에서 검색"), "없는 검색어");
    expect(screen.getByText("현재 페이지에 검색 결과가 없습니다")).toBeVisible();
    expect(mocks.requests.filter((item) => item.method === "GET" && item.path.startsWith("/api/v1/workplaces?"))).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByRole("link", { name: "근무지 23" })).toBeVisible();
    expect(screen.getByLabelText("현재 페이지에서 검색")).toHaveValue("");
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(mocks.requests.some((item) => item.path.includes("page=2&size=20"))).toBe(true);
  });

  it("paginates the Case list without requesting undocumented sort/filter fields", async () => {
    const { mount, user } = await setup();
    mount(<CaseList />);
    await screen.findByRole("button", { name: "다음" });
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 / 2 페이지"));
    expect(screen.getAllByRole("link", { name: "카페 나무" })).toHaveLength(1);
  });

  it("creates a workplace, sends explicit nullable optional fields, and invalidates lists", async () => {
    const { app, mount, mocks, user } = await setup();
    const key = keys.workplaceList(app.session.getSnapshot().generation, 1, 20);
    app.queryClient.setQueryData(key, { items: [], page: 1, size: 20, total: 0 });
    mount(<WorkplaceForm />);
    await user.type(screen.getByLabelText("사업장명"), "새 근무지");
    await user.selectOptions(screen.getByLabelText("재직 상태"), "FORMER");
    await user.click(screen.getByRole("button", { name: "근무지 등록" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/workplaces/24"));
    expect(mocks.requests.find((item) => item.method === "POST")?.body).toEqual({ name: "새 근무지", industry: null, region: null, employmentStatus: "FORMER" });
    expect(app.queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it("updates only changed workplace fields and refreshes the detail", async () => {
    const { mount, mocks, user } = await setup();
    mount(<WorkplaceDetailScreen id={3} />);
    await user.click(await screen.findByText("근무지 관리", { selector: "summary" }));
    await user.click(await screen.findByRole("button", { name: "근무지 수정" }));
    await user.clear(screen.getByLabelText("지역 (선택)"));
    await user.type(screen.getByLabelText("지역 (선택)"), "서울");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(await screen.findByText("근무지 정보를 저장했습니다.")).toBeVisible();
    expect(mocks.requests.find((item) => item.method === "PATCH")?.body).toEqual({ region: "서울" });
    expect(screen.getByText(/음식점 · 서울/)).toBeVisible();
  });

  it("shows server 422 field errors and restores keyboard focus", async () => {
    const { mount, user } = await setup();
    server.use(http.post(`${testApiUrl}/workplaces`, () => apiResponse({ errors: [{ field: "name", reason: "사업장명을 다시 확인해 주세요." }] }, 422)));
    mount(<WorkplaceForm />);
    await user.type(screen.getByLabelText("사업장명"), "서버 오류");
    await user.click(screen.getByRole("button", { name: "근무지 등록" }));
    expect(await screen.findByText("사업장명을 다시 확인해 주세요.")).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("사업장명")).toHaveFocus());
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation to delete a workplace and clears related cached entities", async () => {
    const { app, mount, mocks, user } = await setup();
    const generation = app.session.getSnapshot().generation;
    app.queryClient.setQueryData(keys.case(generation, 15), { private: true });
    mount(<WorkplaceDetailScreen id={4} />);
    await user.click(await screen.findByText("근무지 관리", { selector: "summary" }));
    await user.click(await screen.findByRole("button", { name: "근무지 삭제" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "근무지 삭제 요청" })).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "근무지 삭제 요청" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/workplaces"));
    expect(mocks.getWorkplace(4)).toBeUndefined();
    expect(app.queryClient.getQueryData(keys.case(generation, 15))).toBeUndefined();
    expect(app.queryClient.getQueryData(keys.caseList(generation, 1, 20, 4))).toBeUndefined();
  });

  it("keeps workplace deletion conflicts visible instead of claiming success", async () => {
    const { mount, user } = await setup();
    mount(<WorkplaceDetailScreen id={3} />);
    await user.click(await screen.findByText("근무지 관리", { selector: "summary" }));
    await user.click(await screen.findByRole("button", { name: "근무지 삭제" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/등록된 급여 내역은 21개/)).toBeVisible();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "근무지 삭제 요청" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("연결된 자료나 현재 상태");
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("selects a workplace then creates a cross-month Case and navigates to the upload notice", async () => {
    const { mount, mocks, user } = await setup();
    mount(<CaseForm />);
    await user.click(await screen.findByRole("radio", { name: "카페 나무" }));
    await screen.findByText("선택한 근무지: 카페 나무");
    await user.selectOptions(screen.getByLabelText("급여 형태"), "MONTHLY");
    fireEvent.change(screen.getByLabelText("산정 시작일"), { target: { value: "2026-10-03" } });
    fireEvent.change(screen.getByLabelText("산정 종료일"), { target: { value: "2026-11-02" } });
    await user.click(screen.getByRole("button", { name: "내역 만들기" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/cases/36/upload"));
    expect(mocks.requests.find((item) => item.method === "POST")?.body).toEqual({ workplaceId: 3, payType: "MONTHLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: null });
    expect(mocks.requests.some((item) => /calculations|comparisons|conditions/.test(item.path))).toBe(false);
  });

  it("does not submit a reversed date period", async () => {
    const { mount, mocks, user } = await setup();
    mount(<CaseForm defaultWorkplaceId={3} />);
    await screen.findByText("선택한 근무지: 카페 나무");
    fireEvent.change(screen.getByLabelText("산정 시작일"), { target: { value: "2026-11-02" } });
    fireEvent.change(screen.getByLabelText("산정 종료일"), { target: { value: "2026-10-03" } });
    await user.click(screen.getByRole("button", { name: "내역 만들기" }));
    expect(await screen.findByText("종료일은 시작일보다 빠를 수 없습니다.")).toBeVisible();
    expect(mocks.requests.some((item) => item.method === "POST")).toBe(false);
  });

  it("allows retry when a preselected workplace cannot initially be verified", async () => {
    const { mount, mocks, user } = await setup();
    server.use(http.get(`${testApiUrl}/workplaces/3`, () => apiResponse({}, 500)));
    mount(<CaseForm defaultWorkplaceId={3} />);
    const retry = await screen.findByRole("button", { name: "선택한 근무지 다시 확인" });
    expect(screen.getByRole("button", { name: "내역 만들기" })).toBeDisabled();
    server.use(...mocks.handlers);
    await user.click(retry);
    expect(await screen.findByText("선택한 근무지: 카페 나무")).toBeVisible();
    expect(screen.getByRole("button", { name: "내역 만들기" })).toBeEnabled();
  });

  it("updates a Case with its draft version and only the changed field", async () => {
    const { mount, mocks, user } = await setup();
    mount(<CaseDetailScreen id={15} />);
    await user.click(await screen.findByRole("button", { name: "내역 수정" }));
    await user.selectOptions(screen.getByLabelText("급여 형태"), "MONTHLY");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(await screen.findByText("내역 정보를 저장했습니다.")).toBeVisible();
    expect(mocks.requests.find((item) => item.method === "PATCH")?.body).toEqual({ payType: "MONTHLY", expectedInputVersion: 7 });
    expect(mocks.getCases()[0].inputVersion).toBe(8);
  });

  it("preserves a conflicting draft, blocks resend, and adopts a new version only after explicit reload", async () => {
    const { mount, mocks, user } = await setup();
    mount(<CaseDetailScreen id={15} />);
    await user.click(await screen.findByRole("button", { name: "내역 수정" }));
    mocks.getCases()[0].inputVersion = 8;
    await user.selectOptions(screen.getByLabelText("급여 형태"), "MONTHLY");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByRole("button", { name: "최신 정보 불러오기" });
    expect(screen.getByLabelText("급여 형태")).toHaveValue("MONTHLY");
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    expect(mocks.requests.filter((item) => item.method === "PATCH")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "최신 정보 불러오기" }));
    await waitFor(() => expect(screen.getByLabelText("급여 형태")).toHaveValue("HOURLY"));
    await user.selectOptions(screen.getByLabelText("급여 형태"), "MONTHLY");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("내역 정보를 저장했습니다.");
    expect(mocks.requests.filter((item) => item.method === "PATCH").at(-1)?.body).toEqual({ payType: "MONTHLY", expectedInputVersion: 8 });
  });

  it("loads deletion impact before enabling Case deletion, then clears detail and impact caches", async () => {
    const { app, mount, mocks, user } = await setup();
    const generation = app.session.getSnapshot().generation;
    mount(<CaseDetailScreen id={15} />);
    await user.click(await screen.findByRole("button", { name: "내역 삭제" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("근무지의 원본 문서는 보존됩니다. 다른 내역에서 다시 사용할 수 있습니다.");
    expect(within(dialog).getByRole("button", { name: "내역 삭제 확인" })).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "내역 삭제 확인" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/cases"));
    const events = mocks.requests.filter((item) => /cases\/15/.test(item.path));
    expect(events.map((item) => item.method)).toEqual(["GET", "DELETE"]);
    expect(app.queryClient.getQueryData(keys.case(generation, 15))).toBeUndefined();
    expect(app.queryClient.getQueryData(keys.impact(generation, 15))).toBeUndefined();
    expect(mocks.getWorkplace(3)?.caseCount).toBe(20);
  });

  it("blocks deletion when impact contradicts preservation of originals", async () => {
    const { mount, mocks, user } = await setup();
    server.use(http.get(`${testApiUrl}/cases/15/deletion-impact`, () => apiResponse({ linkedDocumentCount: 1, sharedDocumentCount: 1, reportCount: 0, willUnlinkSharedDocuments: true, willDeleteSharedOriginals: true, willRevokeCaseAccessImmediately: true })));
    mount(<CaseDetailScreen id={15} />);
    await user.click(await screen.findByRole("button", { name: "내역 삭제" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("alert");
    await user.click(within(dialog).getByRole("checkbox"));
    expect(within(dialog).getByRole("button", { name: "내역 삭제 확인" })).toBeDisabled();
    expect(mocks.requests.some((item) => item.method === "DELETE")).toBe(false);
  });

  it("blocks deletion when deletion impact cannot be loaded", async () => {
    const { mount, mocks, user } = await setup();
    server.use(http.get(`${testApiUrl}/cases/15/deletion-impact`, () => apiResponse({}, 503)));
    mount(<CaseDetailScreen id={15} />);
    await user.click(await screen.findByRole("button", { name: "내역 삭제" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("alert");
    await user.click(within(dialog).getByRole("checkbox"));
    expect(within(dialog).getByRole("button", { name: "내역 삭제 확인" })).toBeDisabled();
    expect(mocks.requests.some((item) => item.method === "DELETE")).toBe(false);
  });

  it("links Case details to the document registration route", async () => {
    const { mount } = await setup();
    mount(<CaseDetailScreen id={15} />);
    await screen.findByRole("heading", { name: /급여 내역$/ });
    expect(screen.queryByText("다른 작업으로 이동")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /이어서 검토하기/ })).toHaveAttribute("href", "/cases/15/upload");
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /업로드/ })).not.toBeInTheDocument();
  });

  it.each([403, 404])("handles inaccessible workplace details (%i)", async (status) => {
    const { mount } = await setup();
    server.use(http.get(`${testApiUrl}/workplaces/3`, () => apiResponse({}, status)));
    mount(<WorkplaceDetailScreen id={3} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(status === 403 ? "접근할 권한" : "자료를 찾을 수 없습니다");
    expect(screen.queryByRole("button", { name: "근무지 수정" })).not.toBeInTheDocument();
  });

  it("allows explicit retry after a server list failure", async () => {
    const { mount, mocks, user } = await setup();
    server.use(http.get(`${testApiUrl}/workplaces`, () => apiResponse({}, 500)));
    mount(<WorkplaceListScreen />);
    await screen.findByRole("alert");
    server.use(...mocks.handlers);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "카페 나무" })).toBeVisible();
  });

  it("removes management data and hides protected screens when authentication is revoked", async () => {
    const { app, mount } = await setup();
    mount(<WorkplaceListScreen />);
    await screen.findByRole("link", { name: "카페 나무" });
    expect(app.queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);
    act(() => app.session.clear());
    expect(screen.queryByRole("link", { name: "카페 나무" })).not.toBeInTheDocument();
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalled());
  });
});

it("returns to the current workplace and never requests removed payment cards", async () => {
  const { mount } = await setup();
  const requests: string[] = [];
  const record = ({request}: {request: Request}) => { requests.push(new URL(request.url).pathname); };
  server.events.on("request:start",record);
  try {
  mount(<CaseDetailScreen id={15} />);
  await screen.findByRole("heading", {name:/급여 내역$/});
  expect(screen.getByRole("link",{name:"급여 확인 내역"})).toHaveAttribute("href","/workplaces/3");
  expect(screen.queryByText("입금 대조 확인")).not.toBeInTheDocument();
  expect(screen.queryByText("입금 거래와 급여별 연결 관리")).not.toBeInTheDocument();
  expect(requests.some(path=>/payment-transactions|payment-allocations|deposit-comparisons/.test(path))).toBe(false);
  } finally { server.events.removeListener("request:start",record); }
});

it("requires an explicit consultation case and links all existing support features", async () => {
  const { mount, user } = await setup();
  mount(<ConsultationScreen />);
  await screen.findAllByRole("radio");
  expect(screen.queryByRole("navigation", { name: "후속 확인" })).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("radio")[0]);
  const links = screen.getByRole("navigation", { name: "후속 확인" });
  const selected = Number(screen.getAllByRole("radio")[0].closest("label")!.textContent!.match(/내역 #(\d+)/)![1]);
  expect(within(links).getByRole("link", {name:"확인 질문"})).toHaveAttribute("href", `/cases/${selected}/questions`);
  expect(within(links).getByRole("link", {name:"회사 문의 초안"})).toHaveAttribute("href", `/cases/${selected}/company-inquiry`);
  expect(within(links).getByRole("link", {name:"보고서"})).toHaveAttribute("href", `/cases/${selected}/reports`);
});

it("uses resolved authentication for the shared logo without requests per click", async () => {
  const { mount, app } = await setup();
  mount(<BrandLink>월급잇다</BrandLink>);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  act(() => app.session.clear());
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("keeps the five primary destinations in the requested order", async () => {
  const {mount} = await setup(); mount(<WorkspaceNavigation />);
  const links = screen.getAllByRole("link").slice(0,5);
  expect(links.map(link => link.getAttribute("href"))).toEqual(["/cases/new","/dashboard","/library","/consultation","/workplaces/new"]);
});
it("provides all case tasks without workflow locks and preserves workplace routes", async () => {
  const { mount } = await setup();
  mount(<><WorkspaceNavigation /><TaskNavigation id={15} /></>);
  const tasks = screen.getByRole("navigation", { name: "내역 작업" });
  expect(within(tasks).getByRole("link", { name: /결과 보기/ })).toHaveAttribute("href", "/cases/15/result");
  expect(within(tasks).queryByRole("link", { name: "상담 준비" })).not.toBeInTheDocument();
  expect(within(tasks).getAllByRole("link")).toHaveLength(6);
  expect(screen.getByRole("link", { name: "상담 준비" })).toHaveAttribute("href", "/consultation");
  const workplaceName = await screen.findByText("카페 나무", { selector: "summary strong" });
  expect(workplaceName.closest("summary")).toHaveTextContent("급여 내역");
  expect(screen.getAllByRole("link", { hidden: true }).some(link => link.getAttribute("href") === "/workplaces/3/documents")).toBe(false);
});
it("marks only the create route active and keeps workplace tree destinations accessible", async () => {
  const { mount, user } = await setup();
  navigation.pathname = "/cases/new";
  mount(<WorkspaceNavigation />);
  expect(screen.getByRole("link", { name: "새 급여" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByRole("link", { name: "급여 내역 전체 목록" })).not.toBeInTheDocument();
  const workplace = (await screen.findByText("카페 나무", { selector: "summary strong" })).closest("details")!;
  await user.click(within(workplace).getByText("카페 나무"));
  expect(workplace).toHaveAttribute("open");
  expect(within(workplace).getByRole("link", { name: "AI 자료 도우미" })).toHaveAttribute("href", "/workplaces/3/chats");
});

it("keeps overlapping attention/recent cases and server totals distinct", async () => {
  const { mount } = await setup();
  mount(<DashboardScreen />);
  await screen.findByText("확인 필요 여부가 제공된 20건 기준");
  expect(screen.getByRole("heading", { name: "현재 검토" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "확인할 작업" })).toBeVisible();
  const total = screen.getByRole("heading", { name: "전체 급여 내역" });
  expect(within(total.parentElement!).getByText("21개")).toBeVisible();
  expect(screen.getByRole("link", { name: "현재 내역 이어가기" })).toHaveAttribute("href", expect.stringMatching(/^\/cases\/\d+\//));
  expect(screen.queryByText(/원$/)).not.toBeInTheDocument();
});
it("renders one case with omitted attention and step without inventing results", async () => {
  const { mount, mocks } = await setup();
  const item: Partial<import("@/features/cases/schemas").CaseListDto> = { ...mocks.getCases()[1], caseId: 15 };
  delete item.currentStep;
  delete item.attentionRequired;
  server.use(http.get(`${testApiUrl}/cases`, () => apiResponse({ items: [item], page: 1, size: 20, total: 1 })));
  mount(<DashboardScreen />);
  expect(await screen.findByRole("alert")).toBeVisible();
});

it("opens the exact case overview from every list action", async () => {
 const {mount}=await setup(); mount(<CaseList />);
 const links=await screen.findAllByRole("link",{name:"시작하기"});
 expect(links.length).toBeGreaterThan(0);
 for(const link of links) expect(link.getAttribute("href")).toMatch(/^\/cases\/\d+$/);
});
