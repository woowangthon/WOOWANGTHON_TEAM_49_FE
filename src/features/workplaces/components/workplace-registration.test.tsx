// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http } from "msw";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { createDevelopmentScenario, demoAccount } from "@/mocks/development";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { loadPublicationCatalog, publicationSource, type PublicationCatalog } from "../publication-catalog";
import { WorkplaceRegistrationScreen } from "./workplace-registration-screen";
import { PublicationLookup } from "./publication-lookup";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
let app: ReturnType<typeof createAppServices>;
beforeEach(async () => {
  navigation.replace.mockReset();
  server.use(...createDevelopmentScenario(testApiUrl).handlers);
  app = createAppServices(testApiUrl);
  await app.auth.login(demoAccount);
});
afterEach(() => { cleanup(); app.session.clear(); app.queryClient.clear(); });
function mount(node: ReactNode = <WorkplaceRegistrationScreen />) {
  return render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{node}</QueryClientProvider></AppServicesContext>);
}

it("registers directly with the unchanged P0 DTO in development MSW mode", async () => {
  let sent: unknown;
  server.use(http.post(`${testApiUrl}/workplaces`, async ({ request }) => { sent = await request.json(); return apiResponse({ workplaceId: 73 }, 201); }));
  mount();
  const user = userEvent.setup();
  expect(screen.getByRole("button", { name: "공표자료 찾아보기" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "근무지 목록" })).toHaveAttribute("href", "/workplaces");
  await user.type(screen.getByRole("textbox", { name: "사업장명" }), "새로운 근무지");
  await user.selectOptions(screen.getByRole("combobox", { name: "재직 상태" }), "FORMER");
  await user.click(screen.getByRole("button", { name: "근무지 등록" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/workplaces/73"));
  expect(sent).toEqual({ name: "새로운 근무지", industry: null, region: null, employmentStatus: "FORMER" });
});

it("shows source-matched entries without changing registration fields or posting public reference data", async () => {
  let sent: unknown;
  server.use(http.post(`${testApiUrl}/workplaces`, async ({ request }) => { sent = await request.json(); return apiResponse({ workplaceId: 74 }, 201); }));
  mount();
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "사업장명" }), "포스플레이트");
  await user.type(screen.getByRole("textbox", { name: "지역 (선택)" }), "전남 광양시");
  await user.click(screen.getByRole("button", { name: "공표자료 찾아보기" }));
  const heading = await screen.findByRole("heading", { name: "㈜포스플레이트" });
  const record = heading.closest("li")!;
  expect(within(record).getByText("산업재해 은폐")).toBeVisible();
  expect(within(record).getByText("은폐 적발 기준: 2024년")).toBeVisible();
  expect(within(record).getByRole("link")).toHaveAttribute("href", `${publicationSource.pdfUrl}#page=26`);
  expect(within(record).getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("textbox", { name: "업종 (선택)" })).toHaveValue("");
  expect(navigation.replace).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "근무지 등록" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/workplaces/74"));
  expect(sent).toEqual({ name: "포스플레이트", region: "전남 광양시", industry: null, employmentStatus: "CURRENT" });
});

it("keeps no-match wording qualified and invalidates results when the form changes", async () => {
  mount();
  const input = screen.getByRole("textbox", { name: "사업장명" });
  fireEvent.change(input, { target: { value: "자료에 없는 사업장" } });
  fireEvent.click(screen.getByRole("button", { name: "공표자료 찾아보기" }));
  expect(await screen.findByText("보유한 공표자료에서 일치하는 항목을 찾지 못했습니다.")).toBeVisible();
  expect(screen.getByText(/이 결과는 산업재해나 위반 이력이 없다는 뜻이 아닙니다/)).toBeVisible();
  expect(screen.getByRole("button", { name: "근무지 등록" })).toBeEnabled();
  fireEvent.change(input, { target: { value: "포스플레이트" } });
  expect(screen.getByText(/입력한 사업장명 또는 지역이 바뀌었습니다/)).toBeVisible();
  expect(screen.queryByText("보유한 공표자료에서 일치하는 항목을 찾지 못했습니다.")).toBeNull();
});

it("supports catalog load errors and retry independently of workplace registration", async () => {
  const loader = vi.fn().mockRejectedValueOnce(new Error("chunk unavailable")).mockImplementation(loadPublicationCatalog);
  mount(<><PublicationLookup name="포스플레이트" region="" loadCatalog={loader} /><button>등록 흐름 유지</button></>);
  fireEvent.click(screen.getByRole("button", { name: "공표자료 찾아보기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("근무지 등록은 계속할 수 있습니다.");
  expect(screen.getByRole("button", { name: "등록 흐름 유지" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByRole("heading", { name: "㈜포스플레이트" })).toBeVisible();
  expect(loader).toHaveBeenCalledTimes(2);
});

it("shows a loading state and never presents a previous input's result as current", async () => {
  let resolve!: (value: PublicationCatalog) => void;
  const promise = new Promise<PublicationCatalog>(done => { resolve = done; });
  const ui = render(<PublicationLookup name="포스플레이트" region="" loadCatalog={() => promise} />);
  fireEvent.click(screen.getByRole("button", { name: "공표자료 찾아보기" }));
  expect(screen.getByRole("button", { name: "공표자료 확인 중…" })).toBeDisabled();
  ui.rerender(<PublicationLookup name="다른 사업장" region="" loadCatalog={() => promise} />);
  await act(async () => resolve(await loadPublicationCatalog()));
  expect(screen.queryByRole("heading", { name: "㈜포스플레이트" })).toBeNull();
  expect(screen.getByText(/입력한 사업장명 또는 지역이 바뀌었습니다/)).toBeVisible();
});

it("paginates the local list, retaining separate years and contractor roles", async () => {
  mount(<PublicationLookup name="에이치디현대중공업" region="울산" />);
  fireEvent.click(screen.getByRole("button", { name: "공표자료 찾아보기" }));
  await screen.findByRole("navigation", { name: "페이지 이동" });
  const first = screen.getAllByRole("listitem")[0].textContent;
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  expect(screen.getAllByRole("listitem")[0].textContent).not.toBe(first);
  fireEvent.click(screen.getByRole("button", { name: "이전" }));
  expect(screen.getAllByRole("listitem")[0].textContent).toBe(first);
});

it("focuses the required field and recovers from a registration error", async () => {
  server.use(http.post(`${testApiUrl}/workplaces`, () => apiResponse({ errorCode: "INTERNAL_SERVER_ERROR" }, 500)));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "근무지 등록" }));
  expect(await screen.findByText("사업장명을 입력해 주세요.")).toBeVisible();
  await waitFor(() => expect(screen.getByRole("textbox", { name: "사업장명" })).toHaveFocus());
  fireEvent.change(screen.getByRole("textbox", { name: "사업장명" }), { target: { value: "새 근무지" } });
  fireEvent.click(screen.getByRole("button", { name: "근무지 등록" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "근무지 등록" })).toBeEnabled());
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeVisible();
});
