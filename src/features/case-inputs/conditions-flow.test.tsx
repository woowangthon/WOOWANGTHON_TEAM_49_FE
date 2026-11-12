// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { caseInputsApi } from "./api";
import { ConditionsForm, ConditionsScreen } from "./components/conditions-screen";
import { inputKeys } from "./queries";
import type { Conditions } from "./schemas";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const apps: AppServices[] = [];
afterEach(() => {
  cleanup();
  apps.splice(0).forEach(app => { app.session.clear(); app.queryClient.clear(); });
});

async function setup() {
  const management = managementMocks();
  const mock = inputMocks(management.getCases);
  server.use(...mock.handlers, ...management.handlers);
  const app = createAppServices(); apps.push(app);
  await app.auth.login({ email: "worker@example.com", password: "password1234" });
  const api = caseInputsApi(app.api);
  const mount = (ui: ReactNode) => render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{ui}</QueryClientProvider></AppServicesContext>);
  const initial = await api.conditions(15);
  const only = (...ids: string[]): Conditions => ({ ...initial, conditions: initial.conditions.filter(condition => ids.includes(condition.conditionId)) });
  return { app, api, mock, management, mount, only, user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;
const begin = async (user: User) => {
  await waitFor(() => expect(screen.queryByRole("button", { name: "조건 확인하기" }) ?? screen.queryAllByRole("radio")[0] ?? screen.queryByRole("textbox", { name: "약정 근로시간 (시간)" })).not.toBeNull());
  const start = screen.queryByRole("button", { name: "조건 확인하기" });
  if (start) await user.click(start);
};
const next = async (user: User) => user.click(screen.getByRole("button", { name: "다음" }));
const review = async (user: User) => user.click(screen.getByRole("button", { name: "답변 검토하기" }));
const save = async (user: User) => user.click(screen.getByRole("button", { name: "답변 저장하고 결과 보기" }));
const hours = () => screen.getByRole("textbox", { name: "약정 근로시간 (시간)" });
const minutes = () => screen.getByRole("textbox", { name: "약정 근로시간 (분)" });

describe("focused calculation condition flow", () => {
  it("starts with a summary and keeps question navigation free of mutations", async () => {
    const { mount, user, api, mock, only } = await setup();
    const data = only("workplace_size", "regular_minutes");
    mount(<ConditionsForm caseId={15} initial={data} reload={() => api.conditions(15)} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "직접 입력한 자료 확인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "문서 자료 보완" })).not.toBeInTheDocument();
    expect(screen.queryByText("현재 가능한 검사와 갱신 상태")).not.toBeInTheDocument();
    await begin(user);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: "5인 이상" }));
    await next(user);
    expect(screen.queryByRole("radio", { name: "5인 이상" })).not.toBeInTheDocument();
    expect(mock.requests).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("radio", { name: "5인 이상" })).toBeChecked();
    expect(mock.requests).toHaveLength(0);
  });

  it("saves UNKNOWN, explicit zero and false together in exactly one versioned request", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("workplace_size", "regular_minutes", "base_scope_confirmed")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.click(screen.getByRole("radio", { name: "잘 모르겠어요" }));
    await next(user);
    await user.type(hours(), "0");
    await next(user);
    await user.click(screen.getByRole("radio", { name: /아니요/ }));
    await review(user);
    expect(mock.requests).toHaveLength(0);
    expect(screen.getByText("미저장 답변이 있어요. 질문 이동은 저장하지 않아요.")).toBeVisible();
    await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/cases/15/result"));
    expect(mock.requests.filter(request => request.method === "PUT")).toEqual([{
      method: "PUT", path: "/api/v1/cases/15/conditions",
      body: { expectedInputVersion: 7, answers: [
        { conditionId: "workplace_size", value: "UNKNOWN" },
        { conditionId: "regular_minutes", value: 0 },
        { conditionId: "base_scope_confirmed", value: false },
      ] },
    }]);
    expect((await api.conditions(15)).conditions.find(condition => condition.conditionId === "comparison_basis_confirmed")?.value).toBeNull();
  });

  it("keeps blank minutes unanswered and accepts UNKNOWN without turning it into zero", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    expect(hours()).toHaveValue("");
    expect(minutes()).toHaveValue("");
    expect(screen.getByRole("button", { name: "답변 검토하기" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
    await review(user);
    await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(mock.requests.at(-1)?.body).toEqual({ expectedInputVersion: 7, answers: [{ conditionId: "regular_minutes", value: "UNKNOWN" }] });
  });

  it("requires explicit confirmation of a non-null REQUIRED candidate and submits that unchanged candidate", async () => {
    const { mount, user, api, mock, only } = await setup();
    const initial = only("workplace_size");
    initial.conditions[0] = { ...initial.conditions[0], value: "LESS_THAN_5", status: "REQUIRED" };
    mount(<ConditionsForm caseId={15} initial={initial} reload={() => api.conditions(15)} />);
    await begin(user);
    expect(screen.getByRole("radio", { name: "5인 미만" })).toBeChecked();
    expect(mock.requests).toHaveLength(0);
    await review(user);
    expect(mock.requests).toHaveLength(0);
    await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/cases/15/result"));
    expect(mock.requests.at(-1)?.body).toEqual({ expectedInputVersion: 7, answers: [{ conditionId: "workplace_size", value: "LESS_THAN_5" }] });
  });

  it("does not submit or navigate when Enter is pressed while answering a question", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user); await user.type(hours(), "1"); await user.keyboard("{Enter}");
    expect(hours()).toBeVisible();
    expect(hours()).toHaveValue("1");
    expect(mock.requests).toHaveLength(0);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it.each(["-1", "1.5", "16667", "abc"])("blocks invalid hours %s before review without a request", async value => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    fireEvent.change(hours(), { target: { value } });
    await user.click(screen.getByRole("button", { name: "답변 검토하기" }));
    expect(hours()).toHaveValue(value);
    expect(mock.requests).toHaveLength(0);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("converts explicit hours and minutes to the existing integer-minute API contract", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.type(hours(), "160");
    await user.type(minutes(), "30");
    await review(user); await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(mock.requests.at(-1)?.body).toEqual({ expectedInputVersion: 7, answers: [{ conditionId: "regular_minutes", value: 9630 }] });
  });

  it("rejects invalid minute remainders without losing the typed hours", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.type(hours(), "1");
    await user.type(minutes(), "60");
    await user.click(screen.getByRole("button", { name: "답변 검토하기" }));
    expect(hours()).toHaveValue("1");
    expect(minutes()).toHaveValue("60");
    expect(mock.requests).toHaveLength(0);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("can review and save only the answers already supplied while leaving missing values null", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("workplace_size", "regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.click(screen.getByRole("radio", { name: "5인 이상" }));
    await user.click(screen.getByRole("button", { name: "지금까지 답변 검토" }));
    await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(mock.requests.at(-1)?.body).toEqual({ expectedInputVersion: 7, answers: [{ conditionId: "workplace_size", value: "AT_LEAST_5" }] });
    expect((await api.conditions(15)).conditions.find(condition => condition.conditionId === "regular_minutes")?.value).toBeNull();
  });

  it("can save conditions without navigating or claiming that calculations have finished", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user); await user.type(hours(), "0"); await review(user);
    await user.click(screen.getByRole("button", { name: "조건만 저장" }));
    await screen.findByText("변경된 조건을 저장했습니다. 서버가 관련 검사 상태를 자동 갱신합니다.");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(mock.requests.filter(request => request.method === "PUT")).toHaveLength(1);
    expect(screen.queryByText("모든 계산이 완료됐어요")).not.toBeInTheDocument();
  });

  it("prioritizes unanswered conditions while keeping saved UNKNOWN, zero and false in the summary", async () => {
    const { mount, user, api, only, mock } = await setup();
    const data = only("workplace_size", "regular_minutes", "base_scope_confirmed", "hours_basis_confirmed");
    data.conditions[0] = { ...data.conditions[0], value: "UNKNOWN", status: "UNKNOWN" };
    data.conditions[1] = { ...data.conditions[1], value: 0, status: "ANSWERED" };
    data.conditions[2] = { ...data.conditions[2], value: false, status: "ANSWERED" };
    mount(<ConditionsForm caseId={15} initial={data} reload={() => api.conditions(15)} />);
    await begin(user);
    expect(screen.getByRole("group",{name:/실근로시간|근무시간/})).toHaveAccessibleName(/실근로시간|근무시간/);
    await user.click(screen.getByRole("button", { name: "지금까지 답변 검토" }));
    expect(screen.getByText("모름·확인 예정", { exact: true })).toBeVisible();
    expect(screen.getByText("0시간 0분", { exact: true })).toBeVisible();
    expect(screen.getByText("아니요", { exact: true })).toBeVisible();
    expect(mock.requests).toHaveLength(0);
  });

  it("returns from a single edited answer to review and preserves other drafts", async () => {
    const { mount, user, api, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("workplace_size", "regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.click(screen.getByRole("radio", { name: "5인 미만" }));
    await next(user);
    await user.type(hours(), "1");
    await review(user);
    await user.click(screen.getAllByRole("button", { name: /수정/ })[0]);
    await user.click(screen.getByRole("radio", { name: "5인 이상" }));
    await user.click(screen.getByRole("button", { name: "검토로 돌아가기" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/1시간/)).toBeVisible();
    expect(mock.requests).toHaveLength(0);
    await save(user);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(mock.requests.at(-1)?.body).toEqual({ expectedInputVersion: 7, answers: [
      { conditionId: "workplace_size", value: "AT_LEAST_5" }, { conditionId: "regular_minutes", value: 60 },
    ] });
  });

  it("reveals and focuses the first 422 condition while preserving all submitted drafts", async () => {
    const { mount, user, api, only } = await setup();
    server.use(http.put(`${testApiUrl}/cases/15/conditions`, () => apiResponse({ errorCode: "VALIDATION_ERROR", errors: [
      { field: "answers.0.value", reason: "근로시간을 다시 확인해 주세요" },
      { field: "answers.1.value", reason: "적용 범위를 다시 확인해 주세요" },
    ] }, 422)));
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes", "base_scope_confirmed")} reload={() => api.conditions(15)} />);
    await begin(user);
    await user.type(hours(), "1");
    await next(user);
    await user.click(screen.getByRole("radio", { name: /아니요/ }));
    await review(user); await save(user);
    await screen.findByText("근로시간을 다시 확인해 주세요");
    const time = hours();
    await waitFor(() => expect(time).toHaveFocus());
    expect(time).toHaveValue("1");
    expect(navigation.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "지금까지 답변 검토" }));
    await user.click(screen.getByRole("button", { name: /임금의 기본 적용 범위를 확인했나요\? 수정/ }));
    expect(screen.getByRole("radio", { name: /아니요/ })).toBeChecked();
    expect(screen.getByText("적용 범위를 다시 확인해 주세요")).toBeVisible();
  });

  it("preserves a conflicted draft and requires explicit reload before any retry", async () => {
    const { mount, user, api, management, mock, only } = await setup();
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={() => api.conditions(15)} />);
    await begin(user); await user.type(hours(), "0"); await review(user);
    management.getCases()[0].inputVersion++;
    await save(user);
    await screen.findByText(/최신 입력과 달라 저장을 중단했어요/);
    expect(screen.getByRole("button", { name: "답변 저장하고 결과 보기" })).toBeDisabled();
    expect(mock.requests.filter(request => request.method === "PUT")).toHaveLength(1);
    expect(navigation.push).not.toHaveBeenCalled();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "최신 질문·답변 다시 불러오기" }));
    await screen.findByText("최신 질문과 답변을 불러왔습니다.");
    expect(mock.requests.filter(request => request.method === "PUT")).toHaveLength(1);
  });

  it("does not repeat an accepted save when the subsequent reload fails", async () => {
    const { mount, user, api, mock, only } = await setup();
    const reload = vi.fn(async (): Promise<Conditions> => { throw new Error("reload unavailable"); });
    mount(<ConditionsForm caseId={15} initial={only("regular_minutes")} reload={reload} />);
    await begin(user); await user.type(hours(), "0"); await review(user); await save(user);
    await screen.findByText(/조건은 저장했지만 최신 질문 조회에 실패/);
    expect(screen.getByRole("button", { name: "답변 저장하고 결과 보기" })).toBeDisabled();
    expect(mock.requests.filter(request => request.method === "PUT")).toHaveLength(1);
    expect((await api.conditions(15)).conditions.find(condition => condition.conditionId === "regular_minutes")?.value).toBe(0);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("retains the screen form when background conditions refetch fails after an accepted save", async () => {
    const { mount, user, api, mock } = await setup();
    const initial = await api.conditions(15); let reads = 0;
    server.use(http.get(`${testApiUrl}/cases/15/conditions`, () => ++reads === 1 ? apiResponse(initial) : apiResponse({ errorCode: "INTERNAL_ERROR" }, 500)));
    mount(<ConditionsScreen caseId={15} />);
    await begin(user);
    await user.click(screen.getByRole("radio", { name: "잘 모르겠어요" }));
    await next(user); await user.type(hours(), "0");
    await user.click(screen.getByRole("button", { name: "지금까지 답변 검토" }));
    await save(user);
    await screen.findByText(/조건은 저장했지만 최신 질문 조회에 실패/);
    expect(screen.getByRole("form", { name: "계산 조건 폼" })).toBeVisible();
    expect(screen.getByRole("button", { name: "답변 저장하고 결과 보기" })).toBeDisabled();
    expect(mock.requests.filter(request => request.method === "PUT")).toHaveLength(1);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it.each([422, 500])("clears discarded duration parts after %s on a same-version explicit reload", async status => {
    const { mount, user, only } = await setup();
    const initial = only("regular_minutes");
    server.use(http.put(`${testApiUrl}/cases/15/conditions`, () => apiResponse(status === 422
      ? { errorCode: "VALIDATION_ERROR", errors: [{ field: "answers.0.value", reason: "시간을 다시 확인해 주세요" }] }
      : { errorCode: "INTERNAL_ERROR" }, status)));
    mount(<ConditionsForm caseId={15} initial={initial} reload={async () => initial} />);
    await begin(user); await user.type(hours(), "2"); await review(user); await save(user);
    await screen.findAllByRole("alert");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "최신 질문·답변 다시 불러오기" }));
    await screen.findByText("최신 질문과 답변을 불러왔습니다.");
    await user.click(screen.getByRole("button", { name: "이 기간에 일하기로 한 시간을 알려주세요 수정" }));
    expect(hours()).toHaveValue("");
    expect(minutes()).toHaveValue("");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("keeps a dirty screen draft when the conditions query refetches", async () => {
    const { app, mount, user } = await setup();
    mount(<ConditionsScreen caseId={15} />);
    await begin(user); await user.click(screen.getByRole("radio", { name: "5인 이상" })); await next(user);
    await user.type(hours(), "1");
    await app.queryClient.invalidateQueries({ queryKey: inputKeys.conditions(app.session.getSnapshot().generation, 15) });
    expect(hours()).toHaveValue("1");
  });

  it("does not offer invented answers for unsupported and not applicable questions", async () => {
    const { mount, api, mock } = await setup();
    mount(<ConditionsForm caseId={15} initial={{ inputVersion: 7, conditions: [{ conditionId: "future_text", question: "추가 계약 질문", type: "TEXT", options: null, requiredFor: [], value: null, status: "NOT_APPLICABLE", source: null }] }} reload={() => api.conditions(15)} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("해당 없음", { exact: true })).toBeVisible();
    expect(mock.requests).toHaveLength(0);
  });

  it("offers result navigation without claiming all calculations complete when there are no questions", async () => {
    const { mount, api, mock } = await setup();
    mount(<ConditionsForm caseId={15} initial={{ inputVersion: 7, conditions: [] }} reload={() => api.conditions(15)} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "결과 확인" })).toHaveAttribute("href", "/cases/15/result");
    expect(mock.requests).toHaveLength(0);
  });
});
