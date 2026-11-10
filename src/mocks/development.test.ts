// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { server, testApiUrl } from "@/test/server";
import { clearMockSession, createDevelopmentScenario, demoAccount } from "./development";

describe("browser development scenario through the existing MSW infrastructure", () => {
  let token: string;
  beforeEach(async () => {
    clearMockSession();
    server.use(...createDevelopmentScenario(testApiUrl).handlers);
    const response = await fetch(`${testApiUrl}/auth/login`, { method: "POST", body: JSON.stringify(demoAccount) });
    token = (await response.json()).data.accessToken;
  });
  const request = (path: string, token: string, method = "GET", body?: unknown) => fetch(`${testApiUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  it("restores the demo session and revokes refresh on 204 logout", async () => {
    expect((await fetch(`${testApiUrl}/auth/refresh`, { method: "POST" })).status).toBe(200);
    const result = await request("/auth/logout", token, "POST");
    expect(result.status).toBe(204); expect(await result.text()).toBe("");
    expect((await fetch(`${testApiUrl}/auth/refresh`, { method: "POST" })).status).toBe(401);
    expect((await request("/cases", token)).status).toBe(401);
  });
  it("rejects wrong passwords and duplicate signup", async () => {
    expect((await fetch(`${testApiUrl}/auth/login`, { method: "POST", body: JSON.stringify({ ...demoAccount, password: "wrong" }) })).status).toBe(401);
    expect((await fetch(`${testApiUrl}/auth/signup`, { method: "POST", body: JSON.stringify(demoAccount) })).status).toBe(409);
  });
  it("keeps newly created resources visible and returns 404 after deletion", async () => {
    const response = await request("/workplaces", token, "POST", { name: "가상 근무지", employmentStatus: "CURRENT", industry: null, region: null });
    const { workplaceId } = (await response.json()).data;
    expect((await (await request(`/workplaces/${workplaceId}`, token)).json()).data.name).toBe("가상 근무지");
    expect((await request(`/workplaces/${workplaceId}`, token, "DELETE")).status).toBe(204);
    expect((await request(`/workplaces/${workplaceId}`, token)).status).toBe(404);
  });
  it("persists shared null/zero field edits and enforces versions", async () => {
    expect((await request("/workplaces/3/documents/101/fields/502", token, "PATCH", { value: 0, confirmed: true })).status).toBe(200);
    for (const caseId of [15, 16]) {
      const response = await request(`/cases/${caseId}/documents/101/fields`, token);
      const fields = (await response.json()).data.fields;
      expect(fields.find((f: { fieldId: number }) => f.fieldId === 502).value).toBe(0);
    }
    expect((await request("/cases/15/documents/101/fields/501", token, "PATCH", { value: 1, expectedInputVersion: 7 })).status).toBe(409);
  });
  it("returns a PDF Blob without JSON wrapping and blocks unsupported APIs", async () => {
    const response = await request("/workplaces/3/documents/101/file", token);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect((await response.text()).startsWith("%PDF-1.4")).toBe(true);
    expect((await request("/cases/15/unsupported-feature", token)).status).toBe(501);
  });
  it("revokes Case document access after deletion while preserving the original", async () => {
    await request("/cases/15", token, "DELETE");
    expect((await request("/cases/15/documents/101/fields", token)).status).toBe(404);
    expect((await request("/workplaces/3/documents/101/file", token)).status).toBe(200);
    const doc = (await (await request("/workplaces/3/documents/101", token)).json()).data;
    expect(doc.linkedCaseIds).toEqual([16]);
  });
});
