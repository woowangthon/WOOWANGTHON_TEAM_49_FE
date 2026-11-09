import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppServices, type AppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl, testLogin, testUser } from "@/test/server";

import { authKeys } from "./query-keys";
import { userSchema } from "./schemas";

const services: AppServices[] = [];
function setup() {
  const app = createAppServices(testApiUrl);
  services.push(app);
  return app;
}
afterEach(() => services.splice(0).forEach((app) => { app.session.clear(); app.queryClient.clear(); }));
const credentials = { email: "worker@example.com", password: "password1234" };

describe("MSW authentication integration", () => {
  it("signs up without assuming a token or starting a session", async () => {
    const app = setup();
    await app.auth.restore();
    let body: unknown;
    server.use(http.post(`${testApiUrl}/auth/signup`, async ({ request }) => {
      body = await request.json();
      return apiResponse({ userId: 7 }, 201);
    }));
    await app.authApi.signup({ ...credentials, name: "근로자" });
    expect(body).toEqual({ ...credentials, name: "근로자" });
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(app.auth.getSnapshot().status).toBe("anonymous");
  });

  it("stores login token in memory and user in Query, without retaining credentials in mutations", async () => {
    const app = setup();
    await app.auth.login(credentials);
    const generation = app.session.getSnapshot().generation;
    expect(app.session.getSnapshot().accessToken).toBe(testLogin.accessToken);
    expect(app.auth.getSnapshot().status).toBe("authenticated");
    expect(app.queryClient.getQueryData(authKeys.me(generation))).toEqual(testUser);
    expect(app.queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it.each([401, 500])("does not authenticate a failed login (%i)", async (status) => {
    const app = setup();
    await app.auth.restore();
    server.use(http.post(`${testApiUrl}/auth/login`, () => apiResponse({ errorCode: "INVALID_CREDENTIALS" }, status)));
    await expect(app.auth.login(credentials)).rejects.toMatchObject({ status });
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(app.auth.getSnapshot().status).toBe("anonymous");
  });

  it("rejects malformed login data instead of assuming missing user fields", async () => {
    const app = setup();
    server.use(http.post(`${testApiUrl}/auth/login`, () => apiResponse({ accessToken: "token", user: { email: "worker@example.com" } })));
    await expect(app.auth.login(credentials)).rejects.toMatchObject({ kind: "protocol" });
    expect(app.session.getSnapshot().accessToken).toBeNull();
  });

  it("restores once, checks /users/me and uses the same refresh flight as an initial 401", async () => {
    const app = setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let refreshes = 0;
    server.use(http.post(`${testApiUrl}/auth/refresh`, async ({ request }) => {
      refreshes++;
      // Node interception reconstructs the Request; fetch init is checked by client unit tests.
      expect(request.headers.has("Authorization")).toBe(false);
      await pending;
      return apiResponse({ accessToken: "restored-token" });
    }));
    const first = app.auth.restore();
    const duplicate = app.auth.restore();
    const concurrent = app.api.requestJson("/users/me", (data) => userSchema.parse(data));
    expect(first).toBe(duplicate);
    expect(app.auth.getSnapshot().status).toBe("restoring");
    await vi.waitFor(() => expect(refreshes).toBe(1));
    release();
    await Promise.all([first, duplicate, concurrent]);
    expect(refreshes).toBe(1);
    expect(app.auth.getSnapshot().status).toBe("authenticated");
    expect(app.queryClient.getQueryData(authKeys.me(app.session.getSnapshot().generation))).toEqual(testUser);
  });

  it("clears private state after a failed cookie refresh", async () => {
    const app = setup();
    app.queryClient.setQueryData(["private"], { old: true });
    const before = app.session.getSnapshot();
    await app.auth.restore();
    expect(app.auth.getSnapshot()).toEqual({ status: "anonymous", notice: null });
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(before.signal.aborted).toBe(true);
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("shares a successful refresh across multiple authenticated 401 responses", async () => {
    const app = setup();
    await app.auth.login(credentials);
    const generation = app.session.getSnapshot().generation;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let refreshes = 0;
    let expiredRequests = 0;
    server.use(
      http.get(`${testApiUrl}/users/me`, ({ request }) => {
        if (request.headers.get("Authorization") === `Bearer ${testLogin.accessToken}`) {
          expiredRequests++;
          return apiResponse({ errorCode: "TOKEN_EXPIRED" }, 401);
        }
        return apiResponse(testUser);
      }),
      http.post(`${testApiUrl}/auth/refresh`, async () => {
        refreshes++;
        await pending;
        return apiResponse({ accessToken: "rotated-token" });
      }),
    );
    const completed = Promise.all([app.authApi.getMe(), app.authApi.getMe(), app.authApi.getMe()]);
    await vi.waitFor(() => expect(expiredRequests).toBe(3));
    release();
    expect(await completed).toEqual([testUser, testUser, testUser]);
    expect(refreshes).toBe(1);
    expect(app.session.getSnapshot()).toMatchObject({ accessToken: "rotated-token", generation });
    expect(app.auth.getSnapshot().status).toBe("authenticated");
    expect(app.queryClient.getQueryData(authKeys.me(generation))).toEqual(testUser);
  });

  it("does not keep a token when current-user verification fails", async () => {
    const app = setup();
    server.use(
      http.post(`${testApiUrl}/auth/refresh`, () => apiResponse({ accessToken: "restored-token" })),
      http.get(`${testApiUrl}/users/me`, () => apiResponse({}, 503)),
    );
    await app.auth.restore();
    expect(app.auth.getSnapshot().status).toBe("anonymous");
    expect(app.auth.getSnapshot().notice).toContain("확인하지 못했습니다");
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears queries, mutations and signals immediately while server logout is pending", async () => {
    const app = setup();
    await app.auth.login(credentials);
    const before = app.session.getSnapshot();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let logoutHeader: string | null = null;
    server.use(http.post(`${testApiUrl}/auth/logout`, async ({ request }) => {
      logoutHeader = request.headers.get("Authorization");
      await pending;
      return new HttpResponse(null, { status: 204 });
    }));
    app.queryClient.getMutationCache().build(app.queryClient, { mutationKey: ["private"] });
    const logout = app.auth.logout();
    expect(app.auth.logout()).toBe(logout);
    expect(app.auth.getSnapshot().status).toBe("signing-out");
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(before.signal.aborted).toBe(true);
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(app.queryClient.getMutationCache().getAll()).toHaveLength(0);
    await vi.waitFor(() => expect(logoutHeader).toBe(`Bearer ${testLogin.accessToken}`));
    release();
    await logout;
    expect(app.auth.getSnapshot()).toEqual({ status: "anonymous", notice: "로그아웃되었습니다." });
  });

  it.each([401, 500])("keeps the client signed out and reports server logout failure (%i) without refreshing", async (status) => {
    const app = setup();
    await app.auth.login(credentials);
    let refreshes = 0;
    server.use(
      http.post(`${testApiUrl}/auth/logout`, () => apiResponse({}, status)),
      http.post(`${testApiUrl}/auth/refresh`, () => { refreshes++; return apiResponse({ accessToken: "must-not-restore" }); }),
    );
    await app.auth.logout();
    await app.auth.restore();
    expect(app.auth.getSnapshot().status).toBe("anonymous");
    expect(app.auth.getSnapshot().notice).toContain("서버 세션 종료는 확인하지 못했으므로");
    expect(app.session.getSnapshot().accessToken).toBeNull();
    expect(refreshes).toBe(0);
  });

  it("a late startup refresh cannot sign the user back in after logout", async () => {
    const app = setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let started = false;
    server.use(http.post(`${testApiUrl}/auth/refresh`, async () => {
      started = true;
      await pending;
      return apiResponse({ accessToken: "late-token" });
    }));
    const restoring = app.auth.restore();
    await vi.waitFor(() => expect(started).toBe(true));
    await app.auth.logout();
    release();
    await restoring;
    expect(app.auth.getSnapshot().status).toBe("anonymous");
    expect(app.session.getSnapshot().accessToken).toBeNull();
  });

  it("notifies auth consumers when a terminal API 401 revokes the session", async () => {
    const app = setup();
    await app.auth.login(credentials);
    const listener = vi.fn();
    const unsubscribe = app.auth.subscribe(listener);
    server.use(http.get(`${testApiUrl}/users/me`, () => apiResponse({}, 401)));
    await expect(app.authApi.getMe()).rejects.toMatchObject({ status: 401 });
    expect(app.auth.getSnapshot().status).toBe("anonymous");
    expect(listener).toHaveBeenCalled();
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
    unsubscribe();
  });
});
