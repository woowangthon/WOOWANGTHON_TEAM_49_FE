// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { StrictMode, Suspense, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAppServices } from "@/hooks/use-app-services";
import type { AppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl, testLogin, testUser } from "@/test/server";

import { authKeys } from "../query-keys";
import { AuthForm } from "./auth-form";
import { AuthGate } from "./auth-gate";

const navigation = vi.hoisted(() => ({
  pathname: "/login", search: "", router: { replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

let services: AppServices;
function Capture() {
  const current = useAppServices();
  useEffect(() => { services = current; }, [current]);
  return null;
}

function mount(mode: "login" | "signup" | "protected" = "login", strict = false) {
  navigation.pathname = mode === "protected" ? "/dashboard" : `/${mode}`;
  const tree = (
    <AppProviders>
      <Capture />
      <Suspense fallback={<p>route pending</p>}>
        <AuthGate mode={mode === "protected" ? "protected" : "guest"}>
          {mode === "protected" ? <p>민감한 보호 화면</p> : <AuthForm mode={mode} />}
        </AuthGate>
      </Suspense>
    </AppProviders>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

async function fill(mode: "login" | "signup" = "login", password = "password1234") {
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: mode === "login" ? "로그인" : "회원가입" });
  if (mode === "signup") await user.type(screen.getByLabelText("이름"), "근로자");
  await user.type(screen.getByLabelText("이메일"), "worker@example.com");
  await user.type(screen.getByLabelText("비밀번호"), password);
  return user;
}

beforeEach(() => { navigation.search = ""; navigation.router.replace.mockReset(); });
afterEach(() => {
  cleanup();
  services?.session.clear();
  services?.queryClient.clear();
});

describe("authentication UI with React Testing Library + MSW", () => {
  it("validates signup fields and focuses the first invalid input", async () => {
    mount("signup");
    await screen.findByRole("button", { name: "가입하기" });
    await userEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이름을 입력해 주세요.")).toBeVisible();
    expect(screen.getByLabelText("이름")).toHaveFocus();
    expect(screen.getByLabelText("이메일")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password");
  });

  it("signs up then navigates to login, preserving the return destination without storing a token", async () => {
    navigation.search = "next=%2Fcases%2F15%2Freview";
    mount("signup");
    const user = await fill("signup");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/login?next=%2Fcases%2F15%2Freview&registered=1"));
    expect(services.session.getSnapshot().accessToken).toBeNull();
    expect(services.auth.getSnapshot().status).toBe("anonymous");
  });

  it("shows duplicate-email errors and focuses email", async () => {
    server.use(http.post(`${testApiUrl}/auth/signup`, () => apiResponse({ errorCode: "EMAIL_ALREADY_EXISTS" }, 409)));
    mount("signup");
    const user = await fill("signup");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이미 가입된 이메일입니다. 로그인해 주세요.")).toBeVisible();
    expect(screen.getByLabelText("이메일")).toHaveFocus();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("maps server password policy errors after passing P0 client constraints", async () => {
    server.use(http.post(`${testApiUrl}/auth/signup`, () => apiResponse({
      errorCode: "VALIDATION_ERROR", errors: [{ field: "password", reason: "비밀번호가 서버 정책에 맞지 않습니다." }],
    }, 422)));
    mount("signup");
    const user = await fill("signup", "abcdefgh");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("비밀번호가 서버 정책에 맞지 않습니다.")).toBeVisible();
    expect(screen.getByLabelText("비밀번호")).toHaveFocus();
  });

  it("signs in, updates current-user cache and returns to a validated protected URL", async () => {
    navigation.search = "next=%2Fdashboard%3Ftab%3Dmine";
    mount();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/dashboard?tab=mine"));
    expect(services.auth.getSnapshot().status).toBe("authenticated");
    expect(services.queryClient.getQueryData(authKeys.me(services.session.getSnapshot().generation))).toEqual(testUser);
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
  });

  it("rejects an external return destination after login", async () => {
    navigation.search = "next=https%3A%2F%2Fevil.example";
    mount();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows invalid credentials without refreshing them or navigating", async () => {
    let refreshes = 0;
    server.use(
      http.post(`${testApiUrl}/auth/refresh`, () => { refreshes++; return apiResponse({}, 401); }),
      http.post(`${testApiUrl}/auth/login`, () => apiResponse({ errorCode: "INVALID_CREDENTIALS" }, 401)),
    );
    mount();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 또는 비밀번호를 확인해 주세요.");
    expect(refreshes).toBe(1); // Startup only.
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
  });

  it.each([500, 429])("announces server errors and allows retry (%i)", async (status) => {
    server.use(http.post(`${testApiUrl}/auth/login`, () => apiResponse({}, status)));
    mount();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(status === 429 ? "요청이 많습니다" : "요청을 처리하지 못했습니다");
    expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
    expect(services.auth.getSnapshot().status).toBe("anonymous");
  });

  it("disables the form and prevents duplicate submissions while login is pending", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let logins = 0;
    server.use(http.post(`${testApiUrl}/auth/login`, async () => { logins++; await pending; return apiResponse(testLogin); }));
    mount();
    const user = await fill();
    await user.dblClick(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(logins).toBe(1));
    expect(screen.getByRole("button", { name: "로그인 중…" })).toBeDisabled();
    expect(screen.getByLabelText("비밀번호")).toBeDisabled();
    release();
    await waitFor(() => expect(services.auth.getSnapshot().status).toBe("authenticated"));
  });

  it("restores in StrictMode only once and hides protected content until /users/me completes", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let refreshes = 0;
    server.use(
      http.post(`${testApiUrl}/auth/refresh`, () => { refreshes++; return apiResponse({ accessToken: "restored" }); }),
      http.get(`${testApiUrl}/users/me`, async () => { await pending; return apiResponse(testUser); }),
    );
    mount("protected", true);
    expect(screen.queryByText("민감한 보호 화면")).not.toBeInTheDocument();
    expect(screen.getByText("로그인 상태를 확인하고 있습니다")).toBeVisible();
    await waitFor(() => expect(refreshes).toBe(1));
    release();
    expect(await screen.findByText("민감한 보호 화면")).toBeVisible();
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(refreshes).toBe(1);
  });

  it("redirects an unauthenticated protected visit to login with its original query", async () => {
    navigation.search = "tab=mine";
    mount("protected");
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/login?next=%2Fdashboard%3Ftab%3Dmine"));
    expect(screen.queryByText("민감한 보호 화면")).not.toBeInTheDocument();
  });

  it("redirects a restored user away from guest pages", async () => {
    server.use(http.post(`${testApiUrl}/auth/refresh`, () => apiResponse({ accessToken: "restored" })));
    navigation.search = "next=%2Fdashboard%3Ftab%3Dmine";
    mount("signup");
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/dashboard?tab=mine"));
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
  });

  it("shows the signup success message on login", async () => {
    navigation.search = "registered=1";
    mount();
    expect(await screen.findByText("회원가입이 완료되었습니다. 로그인해 주세요.")).toBeVisible();
  });

  it("removes protected content immediately on logout and redirects after server termination", async () => {
    server.use(http.post(`${testApiUrl}/auth/refresh`, () => apiResponse({ accessToken: "restored" })));
    mount("protected");
    await screen.findByText("민감한 보호 화면");
    await act(async () => { await services.auth.logout(); });
    expect(screen.queryByText("민감한 보호 화면")).not.toBeInTheDocument();
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/login?next=%2Fdashboard"));
    expect(services.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("keeps password entry out of persistent browser storage", async () => {
    const persist = vi.spyOn(Storage.prototype, "setItem");
    mount();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(services.auth.getSnapshot().status).toBe("authenticated"));
    expect(persist).not.toHaveBeenCalled();
  });
});
