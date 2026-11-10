// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server, testApiUrl } from "@/test/server";
import { createDevelopmentScenario, clearMockSession, demoAccount, readDevelopmentResetToken } from "@/mocks/development";
import { createAppServices } from "@/lib/app-services";

describe("account lifecycle on isolated MSW", () => {
  let app: ReturnType<typeof createAppServices>;
  beforeEach(() => { clearMockSession(); server.use(...createDevelopmentScenario(testApiUrl).handlers); app = createAppServices(testApiUrl); });
  it("reads only the documented current user", async () => { await app.auth.login(demoAccount); expect(await app.authApi.getMe()).toEqual({ userId: 7, email: demoAccount.email, name: demoAccount.name }); });
  it("accepts recovery without revealing account existence", async () => {
    const send = (email: string) => fetch(testApiUrl + "/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    const known = await send(demoAccount.email), unknown = await send("unknown@example.com");
    expect(known.status).toBe(202); expect(unknown.status).toBe(202); expect(await known.json()).toEqual(await unknown.json());
  });
  it("resets once, rejects old password and revokes old sessions", async () => {
    await app.auth.login(demoAccount); await app.authApi.forgotPassword(demoAccount.email);
    const token = readDevelopmentResetToken(); expect(token).toBeTruthy();
    await app.authApi.resetPassword(token, "replacement");
    await expect(app.authApi.getMe()).rejects.toBeDefined();
    await expect(app.authApi.login(demoAccount)).rejects.toMatchObject({ status: 401 });
    await expect(app.authApi.login({ email: demoAccount.email, password: "replacement" })).resolves.toBeDefined();
    await expect(app.authApi.resetPassword(token, "again")).rejects.toMatchObject({ status: 422 });
  });
  it("rejects invalid reset tokens", async () => { await expect(app.authApi.resetPassword("invalid", "new")).rejects.toMatchObject({ status: 422 }); });
  it("rejects tokens after thirty minutes", async () => {
    await app.authApi.forgotPassword(demoAccount.email); const token = readDevelopmentResetToken();
    const now = Date.now(); const clock = vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60_000);
    try { await expect(app.authApi.resetPassword(token, "new")).rejects.toMatchObject({ status: 422 }); } finally { clock.mockRestore(); }
  });
  it("deletion accepts 202 and receipt works without restoring access", async () => {
    await app.auth.login(demoAccount); await app.authApi.deleteAccount(); app.session.clear();
    await expect(app.authApi.deletionStatus()).resolves.toBeDefined();
    await expect(app.authApi.getMe()).rejects.toBeDefined();
    await expect(app.authApi.login(demoAccount)).rejects.toMatchObject({ status: 401 });
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it("rejects deletion without confirmation and leaves session intact", async () => {
    await app.auth.login(demoAccount);
    await expect(app.api.requestAccepted("/users/me", { method: "DELETE", body: {} })).rejects.toMatchObject({ status: 422 });
    await expect(app.authApi.getMe()).resolves.toBeDefined();
  });
  it("does not refresh a missing receipt", async () => { await expect(app.authApi.deletionStatus()).rejects.toMatchObject({ status: 401 }); });
  it("isolates new accounts from seed business data", async () => {
    const user = { email: "new@example.com", password: "new", name: "New" };
    await app.authApi.signup(user); await app.auth.login(user);
    await expect(app.api.requestJson("/cases", v => v)).rejects.toMatchObject({ status: 404 });
    await expect(app.authApi.getMe()).resolves.toMatchObject({ email: user.email });
  });
});
