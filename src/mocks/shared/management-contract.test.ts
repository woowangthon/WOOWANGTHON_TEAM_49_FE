// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { server, testApiUrl } from "@/test/server";
import { createOpenApiContract } from "@/test/openapi/contract";
import { clearMockSession, createDevelopmentScenario, demoAccount } from "../development";
import { managementMocks } from "./management-handlers";

const oracle = createOpenApiContract();
const minimum = { workplaceId: 3, payType: "HOURLY", periodStart: "2026-01-01", periodEnd: "2026-01-31" };

describe.each(["shared", "development"])("N04/N05 %s actual HTTP contracts", mode => {
  let token: string;
  beforeEach(async () => {
    token = "";
    clearMockSession();
    server.use(...(mode === "shared" ? managementMocks({ count: 2 }).handlers : createDevelopmentScenario(testApiUrl).handlers));
    if (mode === "development") {
      const login = await fetch(`${testApiUrl}/auth/login`, { method: "POST", body: JSON.stringify(demoAccount) });
      token = (await login.json()).data.accessToken;
    }
  });
  async function exchange(path: string, method = "GET", body?: unknown, status = 200, validRequest = true) {
    const input = { method, url: `${testApiUrl}${path}`, ...(body === undefined ? {} : { body }) };
    const checked = oracle.request(input);
    expect(checked.valid, checked.errors.join("\n")).toBe(validRequest);
    const response = await fetch(input.url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    expect(response.status).toBe(status);
    const json = await response.json();
    const result = oracle.response(input, response.status, json, response.headers.get("Content-Type")!);
    expect(result.valid, result.errors.join("\n")).toBe(true);
    if (method === "GET") expect(result.coverage).toBe("concrete");
    return json.data;
  }
  async function views(caseId: number, workplaceId: number) {
    const detail = await exchange(`/cases/${caseId}`);
    const list = await exchange("/cases");
    const nested = await exchange(`/workplaces/${workplaceId}/cases`);
    expect(list.items.find((row: { caseId: number }) => row.caseId === caseId)).toEqual(detail);
    expect(nested.items.find((row: { caseId: number }) => row.caseId === caseId)).toEqual(detail);
    return detail;
  }
  it("normalizes minimal creates and preserves DTOs through nullable and omitted PATCH", async () => {
    const { workplaceId } = await exchange("/workplaces", "POST", { name: "minimal" }, 201);
    const initial = await exchange(`/workplaces/${workplaceId}`);
    expect(initial).toMatchObject({ name: "minimal", industry: null, region: null, employmentStatus: "CURRENT" });
    expect((await exchange("/workplaces")).items.find((w: { workplaceId: number }) => w.workplaceId === workplaceId)).toEqual(initial);
    await exchange(`/workplaces/${workplaceId}`, "PATCH", { name: null, employmentStatus: null, industry: "food", region: "Seoul" });
    await exchange(`/workplaces/${workplaceId}`, "PATCH", { industry: null });
    expect(await exchange(`/workplaces/${workplaceId}`)).toMatchObject({ name: "minimal", employmentStatus: "CURRENT", industry: null, region: "Seoul" });
    const { caseId } = await exchange("/cases", "POST", { ...minimum, workplaceId }, 201);
    const created = await views(caseId, workplaceId);
    expect(created.scheduledPayDate).toBeNull();
    await exchange(`/cases/${caseId}`, "PATCH", { expectedInputVersion: 1, payType: "MONTHLY", periodEnd: "2026-02-28", scheduledPayDate: "2026-03-01" });
    expect(await views(caseId, workplaceId)).toMatchObject({ payType: "MONTHLY", periodEnd: "2026-02-28", scheduledPayDate: "2026-03-01", inputVersion: 2 });
    await exchange(`/cases/${caseId}`, "PATCH", { expectedInputVersion: 2, payType: null, periodStart: null, periodEnd: null });
    expect(await views(caseId, workplaceId)).toMatchObject({ payType: "MONTHLY", periodStart: minimum.periodStart, periodEnd: "2026-02-28", scheduledPayDate: "2026-03-01", inputVersion: 3 });
    await exchange(`/cases/${caseId}`, "PATCH", { expectedInputVersion: 3, scheduledPayDate: null });
    expect((await views(caseId, workplaceId)).scheduledPayDate).toBeNull();
    await exchange(`/workplaces/${workplaceId}`, "PATCH", { region: null });
    expect((await exchange(`/workplaces/${workplaceId}`)).region).toBeNull();
    await exchange("/workplaces");
    await views(caseId, workplaceId);
  });
  const badCreates = [
    {}, null, [], { ...minimum, unexpected: "forbidden" }, { ...minimum, documentId: 999999 },
    { ...minimum, workplaceId: 0 }, { ...minimum, workplaceId: "3" }, { ...minimum, workplaceId: 1.5 },
    { ...minimum, payType: null }, { ...minimum, payType: "DAILY" },
    { ...minimum, periodStart: null }, { ...minimum, periodEnd: 0 },
    { ...minimum, periodStart: "2026-02-30" }, { ...minimum, periodEnd: "2026-1-31" },
    { ...minimum, scheduledPayDate: "invalid" }, { ...minimum, scheduledPayDate: false },
  ];
  it.each(badCreates)("rejects invalid create %j without changing stored data", async body => {
    const before = await exchange("/cases");
    await exchange("/cases", "POST", body, 422, false);
    expect(await exchange("/cases")).toEqual(before);
  });
  const badPatches = [
    null, [], { unexpected: "forbidden" }, { status: "ARCHIVED" }, { workplaceId: 999999 },
    { payType: "DAILY" }, { periodStart: "2026-02-29" }, { periodEnd: false },
    { scheduledPayDate: "2026-13-01" }, { scheduledPayDate: 0 },
    { expectedInputVersion: 0 }, { expectedInputVersion: "7" }, { expectedInputVersion: 1.5 },
  ];
  it.each(badPatches)("rejects invalid PATCH %j before mutation/version checking", async body => {
    const before = await views(15, 3);
    await exchange("/cases/15", "PATCH", body, 422, false);
    expect(await views(15, 3)).toEqual(before);
  });
  it("preserves valid version conflicts and subsequent successful writes", async () => {
    const before = await views(15, 3);
    for (const expectedInputVersion of [6, null, undefined]) {
      const error = await exchange("/cases/15", "PATCH", { expectedInputVersion, payType: "MONTHLY" }, 409);
      expect(error.errorCode).toBe("INPUT_VERSION_CONFLICT");
      expect(await views(15, 3)).toEqual(before);
    }
    await exchange("/cases/15", "PATCH", { expectedInputVersion: 7, payType: "MONTHLY" });
    expect(await views(15, 3)).toMatchObject({ inputVersion: 8, payType: "MONTHLY" });
    await exchange("/cases", "POST", { ...minimum, workplaceId: 999999 }, 404);
  });
});
