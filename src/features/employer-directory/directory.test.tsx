// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { managementMocks } from "@/test/management-handlers";
import { server } from "@/test/server";

import { DirectorySearchScreen } from "./directory-search-screen";
import { EmployerDetailScreen } from "./employer-detail-screen";
import { EmployerRegistrationScreen } from "./employer-registration-screen";
import { directoryBackHref, parseDirectoryFilters } from "./models";

const state = vi.hoisted(() => ({
  mockEnabled: true,
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("@/lib/config/mock", () => ({ get mockEnabled() { return state.mockEnabled; } }));
vi.mock("next/navigation", () => ({ useRouter: () => state.router }));

const clients: QueryClient[] = [];
const apps: AppServices[] = [];

beforeEach(() => {
  state.mockEnabled = true;
  state.router.push.mockReset();
  state.router.replace.mockReset();
});
afterEach(() => {
  cleanup();
  apps.splice(0).forEach(app => { app.session.clear(); app.queryClient.clear(); });
  clients.splice(0).forEach(client => client.clear());
});

function mount(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}

describe("employer directory", () => {
  it("shows paginated example records with dates and an explicit example notice", async () => {
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({})} />);
    expect(await screen.findByRole("complementary", { name: "예시 데이터 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "검색 결과 6곳" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByText(/자료 기준 2026-09-01/)[0]).toBeVisible();
    expect(screen.getByRole("link", { name: /김해시 공장기업 현황 원문/ })).toHaveAttribute("href", "https://www.data.go.kr/data/15126955/fileData.do");
  });

  it("submits the name, region and industry together and resets pagination", async () => {
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({ page: "2" })} />);
    await screen.findByRole("complementary", { name: "예시 데이터 안내" });
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox", { name: "사업장명 또는 주소" }), "  김해  ");
    await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "경남 김해시");
    await user.selectOptions(screen.getByRole("combobox", { name: "업종" }), "금속가공");
    await user.click(screen.getByRole("button", { name: "검색" }));
    const url = new URL(state.router.push.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/employers");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "김해", region: "경남 김해시", industry: "금속가공" });
  });

  it("combines region, industry and whitespace-insensitive keyword filtering", async () => {
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({ q: "김 해", region: "경남 김해시", industry: "금속가공" })} />);
    await screen.findByRole("heading", { name: "검색 결과 1곳" });
    expect(screen.getByRole("heading", { name: "예시 김해 금속공장 A" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "예시 김해 식품공장 E" })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("offers filter reset when no employer matches", async () => {
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({ q: "없는 사업장" })} />);
    expect(await screen.findByRole("heading", { name: "조건에 맞는 사업장이 없어요" })).toBeVisible();
    expect(screen.getByRole("link", { name: "조건 초기화" })).toHaveAttribute("href", "/employers");
    expect(screen.getByRole("link", { name: "전체 예시 사업장 보기" })).toHaveAttribute("href", "/employers");
  });

  it("retains the search term in pagination and the detail return link", async () => {
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({ q: "예시" })} />);
    await screen.findByRole("heading", { name: "검색 결과 6곳" });
    const next = screen.getByRole("link", { name: "다음" });
    const nextUrl = new URL(next.getAttribute("href")!, "http://localhost");
    expect(Object.fromEntries(nextUrl.searchParams)).toEqual({ q: "예시", page: "2" });
    const rowLink = screen.getByRole("link", { name: /예시 김해 금속공장 A/ });
    const detailUrl = new URL(rowLink.getAttribute("href")!, "http://localhost");
    expect(detailUrl.searchParams.get("from")).toBe("/employers?q=" + encodeURIComponent("예시"));
  });

  it("keeps the original search context from detail through registration and back", async () => {
    const searchParams = new URLSearchParams({ q: "김해", region: "경남 김해시", industry: "금속가공", page: "2" });
    const backHref = "/employers?" + searchParams;
    mount(<EmployerDetailScreen employerId="demo-gimhae-metal" backHref={backHref} />);
    await screen.findByRole("heading", { name: "공장등록 정보" });
    expect(screen.getByRole("link", { name: "검색 결과로" })).toHaveAttribute("href", backHref);
    const register = new URL(screen.getByRole("link", { name: "내 근무지로 등록" }).getAttribute("href")!, "http://localhost");
    const review = new URL(screen.getByRole("link", { name: "월급 확인하기" }).getAttribute("href")!, "http://localhost");
    expect(register.pathname).toBe("/employers/demo-gimhae-metal/register");
    expect(register.searchParams.get("from")).toBe(backHref);
    expect(review.searchParams.get("from")).toBe(backHref);
    expect(review.searchParams.get("next")).toBe("review");
    cleanup();
    const app = createAppServices();
    apps.push(app);
    mount(<AppServicesContext value={app}>
      <EmployerRegistrationScreen employerId="demo-gimhae-metal" startReview backHref={directoryBackHref(register.searchParams.get("from") ?? undefined)} />
    </AppServicesContext>);
    await screen.findByRole("textbox", { name: "사업장명" });
    const detail = new URL(screen.getByRole("link", { name: "사업장 정보로" }).getAttribute("href")!, "http://localhost");
    expect(detail.pathname).toBe("/employers/demo-gimhae-metal");
    expect(detail.searchParams.get("from")).toBe(backHref);
  });

  it("normalizes return destinations and rejects external, script and repeated from values", () => {
    expect(directoryBackHref("https://example.com/employers?q=other")).toBe("/employers");
    expect(directoryBackHref("//example.com/employers?q=other")).toBe("/employers");
    expect(directoryBackHref("javascript:alert(1)")).toBe("/employers");
    expect(directoryBackHref(["/employers?q=one", "/employers?q=two"])).toBe("/employers");
    const safe = new URL(directoryBackHref("/employers?q=test&region=invalid&industry=invalid&page=-1&next=https://example.com"), "http://localhost");
    expect(safe.pathname).toBe("/employers");
    expect(Object.fromEntries(safe.searchParams)).toEqual({ q: "test" });
  });

  it.each([
    ["demo-chungbuk-machine", "0명"],
    ["demo-busan-metal", "정보 없음"],
  ])("preserves zero versus unknown employee counts for %s", async (employerId, expected) => {
    mount(<EmployerDetailScreen employerId={employerId} />);
    await screen.findByRole("heading", { name: "공장등록 정보" });
    expect(screen.getByText(expected, { exact: true })).toBeVisible();
  });

  it.each([
    ["demo-gimhae-metal", "명단공개 대상"],
    ["demo-chungnam-machine", "명단공개 미대상"],
    ["demo-chungbuk-plastic", "조회 불가"],
    ["demo-gimhae-food", "확인 전"],
    ["demo-busan-metal", "조회 오류"],
  ])("keeps the wage disclosure state distinct for %s", async (employerId, expected) => {
    mount(<EmployerDetailScreen employerId={employerId} />);
    const title = await screen.findByRole("heading", { name: "임금체불 명단공개 여부" });
    const article = title.closest("article")!;
    expect(within(article).getByText(expected, { exact: true })).toBeVisible();
    expect(within(article).getByRole("link", { name: /공식 공표자료 확인하기/ })).toHaveAttribute("href", "https://moel.go.kr/info/defaulter/defaulterList.do");
    expect(screen.getByRole("heading", { name: "이용자 제보는 공개하지 않아요" })).toBeVisible();
  });

  it("does not show fictitious employers when Mock mode is disabled", async () => {
    state.mockEnabled = false;
    mount(<DirectorySearchScreen filters={parseDirectoryFilters({})} />);
    expect(await screen.findByRole("heading", { name: "사업장 정보 연계를 준비하고 있어요" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /검색 결과/ })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "예시 데이터 안내" })).toBeNull();
  });

  it("labels industrial safety publication separately from wage disclosure", async () => {
    mount(<EmployerDetailScreen employerId="demo-chungnam-machine" />);
    const title = await screen.findByRole("heading", { name: "산업재해 공표 여부" });
    const article = title.closest("article")!;
    expect(within(article).getByText("공표 대상", { exact: true })).toBeVisible();
    expect(within(article).queryByText("명단공개 대상", { exact: true })).toBeNull();
    expect(within(article).getByRole("link", { name: /공식 공표자료 확인하기/ })).toHaveAttribute("href", "https://moel.go.kr/info/publict/publictDataView.do?bbs_seq=20260101157");
  });

  it("recovers from a directory query error using retry", async () => {
    const client = mount(<DirectorySearchScreen filters={parseDirectoryFilters({})} />);
    await screen.findByRole("heading", { name: "검색 결과 6곳" });
    const query = client.getQueryCache().find({ queryKey: ["employer-directory", "example"] })!;
    act(() => query.setState({ data: undefined, status: "error", error: new Error("example load error"), fetchStatus: "idle" }));
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    await userEvent.click(retry);
    expect(await screen.findByRole("heading", { name: "검색 결과 6곳" })).toBeVisible();
  });

  it("offers a safe search return when the employer ID is unknown", async () => {
    mount(<EmployerDetailScreen employerId="missing-employer" />);
    expect(await screen.findByRole("heading", { name: "사업장 정보를 찾을 수 없어요" })).toBeVisible();
    expect(screen.getByRole("link", { name: "사업장 다시 찾기" })).toHaveAttribute("href", "/employers");
    expect(screen.queryByRole("link", { name: "내 근무지로 등록" })).toBeNull();
  });

  it("does not mount a registration form for an unknown employer ID", async () => {
    mount(<EmployerRegistrationScreen employerId="missing-employer" startReview />);
    expect(await screen.findByRole("alert")).toHaveTextContent("사업장 정보를 찾을 수 없어요");
    expect(screen.queryByRole("button", { name: "근무지 등록" })).toBeNull();
  });

  it.each([true, false])("registers selected fields through the existing workplace contract, review=%s", async startReview => {
    const mocks = managementMocks({ empty: true });
    server.use(...mocks.handlers);
    const app = createAppServices();
    apps.push(app);
    await app.auth.login({ email: "worker@example.com", password: "password1234" });
    render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>
      <EmployerRegistrationScreen employerId="demo-gimhae-metal" startReview={startReview} />
    </QueryClientProvider></AppServicesContext>);
    expect(await screen.findByRole("textbox", { name: "사업장명" })).toHaveValue("예시 김해 금속공장 A");
    expect(screen.getByRole("textbox", { name: "업종 (선택)" })).toHaveValue("금속가공");
    expect(screen.getByRole("textbox", { name: "지역 (선택)" })).toHaveValue("경남 김해시");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "재직 상태" }), "FORMER");
    await user.click(screen.getByRole("button", { name: "근무지 등록" }));
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith(startReview ? "/cases/new?workplaceId=3" : "/workplaces/3"));
    expect(mocks.requests.filter(request => request.method === "POST").map(request => request.body)).toEqual([
      { name: "예시 김해 금속공장 A", industry: "금속가공", region: "경남 김해시", employmentStatus: "FORMER" },
    ]);
  });
});
