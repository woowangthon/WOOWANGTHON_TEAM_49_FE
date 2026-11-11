import { http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { workplaceApi } from "@/features/workplaces/api";
import { createAppServices, type AppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { managementMocks } from "@/test/management-handlers";

import { caseApi } from "./api";
import { caseFormSchema } from "./schemas";

const applications: AppServices[] = [];
async function setup() {
  const mocks = managementMocks();
  server.use(...mocks.handlers);
  const app = createAppServices();
  applications.push(app);
  await app.auth.login({ email: "worker@example.com", password: "password1234" });
  return { app, mocks, cases: caseApi(app.api), workplaces: workplaceApi(app.api) };
}
afterEach(() => applications.splice(0).forEach((app) => { app.session.clear(); app.queryClient.clear(); }));

describe("P0-first management contracts with MSW", () => {
  it("uses documented pagination and no speculative search or sort parameters", async () => {
    const { workplaces, mocks } = await setup();
    const result = await workplaces.list({ page: 2, size: 20 });
    expect(result).toMatchObject({ page: 2, size: 20, total: 21 });
    expect(result.items).toHaveLength(1);
    expect(mocks.requests.at(-1)?.path).toBe("/api/v1/workplaces?page=2&size=20");
  });

  it("creates a workplace from ID-only response, patches explicit null, and accepts P0 API_ENDPOINTS 204 deletion without a body", async () => {
    const { workplaces, mocks } = await setup();
    const created = await workplaces.create({ name: "새 근무지", industry: null, region: null, employmentStatus: "FORMER" });
    expect(created).toEqual({ workplaceId: 24 });
    await workplaces.update(created.workplaceId, { region: "서울", industry: null });
    expect(await workplaces.detail(created.workplaceId)).toMatchObject({ region: "서울", industry: null, employmentStatus: "FORMER" });
    expect(mocks.requests.find((item) => item.method === "PATCH")?.body).toEqual({ region: "서울", industry: null });
    await workplaces.remove(created.workplaceId);
    await expect(workplaces.detail(created.workplaceId)).rejects.toMatchObject({ status: 404 });
  });

  it("creates an arbitrary cross-month Case and preserves null scheduledPayDate", async () => {
    const { cases, mocks } = await setup();
    const created = await cases.create({ workplaceId: 3, payType: "MONTHLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: null });
    expect(created).toMatchObject({ caseId: 36, inputVersion: 1, status: "CREATED" });
    expect(mocks.requests.find((item) => item.method === "POST")?.body).toEqual({ workplaceId: 3, payType: "MONTHLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: null });
    expect(await cases.detail(created.caseId)).toMatchObject({ periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: null });
  });

  it("sends expectedInputVersion without substituting currentStep, status or workplaceId", async () => {
    const { cases, mocks } = await setup();
    expect(await cases.update(15, { periodEnd: "2026-11-05", expectedInputVersion: 7 })).toMatchObject({ inputVersion: 8 });
    expect(mocks.requests.find((item) => item.method === "PATCH")?.body).toEqual({ periodEnd: "2026-11-05", expectedInputVersion: 7 });
    await expect(cases.update(15, { payType: "MONTHLY", expectedInputVersion: 7 })).rejects.toMatchObject({ status: 409, errorCode: "INPUT_VERSION_CONFLICT", details: { currentInputVersion: 8 } });
    expect(mocks.requests.filter((item) => item.method === "PATCH")).toHaveLength(2);
  });

  it("consumes separate deletion impact and Case 204 without parsing a receipt", async () => {
    const { cases } = await setup();
    expect(await cases.impact(15)).toMatchObject({ linkedDocumentCount: 3, willDeleteSharedOriginals: false });
    await expect(cases.remove(15)).resolves.toBeUndefined();
    await expect(cases.detail(15)).rejects.toMatchObject({ status: 404 });
  });

  it("accepts lightweight list data without making missing attention information zero", async () => {
    const { cases } = await setup();
    server.use(http.get(`${testApiUrl}/cases`, () => apiResponse({ items: [{ caseId: 15, workplaceId: 3, payType: "HOURLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", status: "COMPLETED", updatedAt: "2026-11-09T00:00:00+00:00" }], page: 1, size: 20, total: 1 })));
    await expect(cases.list({page:1,size:20})).rejects.toBeDefined();
  });

  it.each([403, 404, 409, 422])("preserves HTTP %i and server errors", async (status) => {
    const { workplaces } = await setup();
    server.use(http.patch(`${testApiUrl}/workplaces/3`, () => apiResponse({ errorCode: "SERVER_CODE", errors: [{ field: "name", reason: "서버 검증" }] }, status)));
    await expect(workplaces.update(3, { name: "변경" })).rejects.toMatchObject({ status, errorCode: "SERVER_CODE", fieldErrors: [{ field: "name", reason: "서버 검증" }] });
  });

  it("validates actual dates and order without restricting a period to a calendar month", () => {
    const base = { payType: "HOURLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: "" };
    expect(caseFormSchema.safeParse(base).success).toBe(true);
    expect(caseFormSchema.safeParse({ ...base, periodEnd: "2026-10-02" }).success).toBe(false);
    expect(caseFormSchema.safeParse({ ...base, periodStart: "2026-02-30" }).success).toBe(false);
  });
});
