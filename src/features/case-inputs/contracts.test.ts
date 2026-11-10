import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { managementMocks } from "@/mocks/shared/management-handlers";
import { inputMocks } from "@/mocks/shared/input-handlers";
import { createAppServices } from "@/lib/app-services";
import { caseInputsApi } from "./api";
import { conditionsPutSchema, manualInputSchema, type ManualInput } from "./schemas";
import { manualDefaults, manualFormSchema, toManualInput } from "./manual-fields";
import { documentApi, recomputeActive, recomputeSchema } from "@/features/documents/api";

const fixtures: ManualInput[] = [
  { recordType: "CONTRACT", data: { hourlyWage: 0, monthlyBasePay: null }, source: "USER_INPUT" },
  { recordType: "ATTENDANCE", data: { workDate: "2026-10-10", clockIn: "2026-10-10T09:00:00+09:00", clockOut: "2026-10-10T18:00:00+09:00", breakMinutes: 60 }, source: "USER_INPUT" },
  { recordType: "PAYSLIP", data: { grossPay: 0, totalDeductions: 0, netPay: 0, paymentItems: [0], deductionItems: [0] }, source: "USER_INPUT" },
  { recordType: "DEPOSIT", data: { paymentMethod: "CASH", amount: 0, transactionDate: "2026-11-10", source: "USER_INPUT", confirmationStatus: "USER_REPORTED" }, source: "USER_INPUT" },
];
async function setup() {
  const management = managementMocks(); const mock = inputMocks(management.getCases); server.use(...mock.handlers, ...management.handlers);
  const app = createAppServices(); await app.auth.login({ email: "worker@example.com", password: "password1234" });
  return { app, api: caseInputsApi(app.api), mock, management };
}
describe("P0 manual inputs and conditions over MSW", () => {
  it.each(fixtures)("creates $recordType with P0 fields and USER_INPUT", async body => {
    const { api, app } = await setup(); const saved = await api.create(15, body);
    expect(saved.inputVersion).toBe(8);
    if ("canonicalResource" in saved) { expect(saved.recordId).toBeNull(); expect(saved.canonicalResource).toBe("PAYMENT_TRANSACTION"); expect((await api.list(15, 1)).items).toHaveLength(0); }
    else { expect((await api.record(15, saved.recordId)).data).toEqual(body.data); expect((await api.list(15, 1)).items).toHaveLength(1); }
    app.session.clear();
  });
  it("fully replaces same-type PATCH data, retains explicit null/zero and deletes with 204", async () => {
    const { api, mock } = await setup(); const saved = await api.create(15, fixtures[0]); if (!saved.recordId) throw new Error("record required");
    await api.update(15, saved.recordId, { recordType: "CONTRACT", source: "USER_INPUT", data: { hourlyWage: null } });
    expect((await api.record(15, saved.recordId)).data).toEqual({ hourlyWage: null });
    expect(mock.requests.at(-1)?.body).toEqual({ recordType: "CONTRACT", source: "USER_INPUT", data: { hourlyWage: null } });
    await api.remove(15, saved.recordId); expect((await api.list(15, 1)).total).toBe(0);
    await expect(api.record(15, saved.recordId)).rejects.toMatchObject({ status: 404 });
  });
  it("rejects type changes on PATCH and missing required fields", async () => {
    const { api } = await setup(); const saved = await api.create(15, fixtures[0]); if (!saved.recordId) throw new Error("record required");
    await expect(api.update(15, saved.recordId, fixtures[2])).rejects.toMatchObject({ status: 422 });
    await expect(api.create(15, { recordType: "ATTENDANCE", source: "USER_INPUT", data: {} })).rejects.toMatchObject({ status: 422 });
  });
  it("partially merges UNKNOWN, zero and false; conflicts retain prior answers", async () => {
    const { api } = await setup();
    await api.saveConditions(15, { expectedInputVersion: 7, answers: [{ conditionId: "workplace_size", value: "UNKNOWN" }, { conditionId: "regular_minutes", value: 0 }] });
    await api.saveConditions(15, { expectedInputVersion: 8, answers: [{ conditionId: "base_scope_confirmed", value: false }] });
    const data = await api.conditions(15);
    expect(data.conditions.find(c => c.conditionId === "workplace_size")).toMatchObject({ value: "UNKNOWN", status: "UNKNOWN" });
    expect(data.conditions.find(c => c.conditionId === "regular_minutes")?.value).toBe(0);
    expect(data.conditions.find(c => c.conditionId === "base_scope_confirmed")?.value).toBe(false);
    await expect(api.saveConditions(15, { expectedInputVersion: 7, answers: [{ conditionId: "regular_minutes", value: 60 }] })).rejects.toMatchObject({ errorCode: "INPUT_VERSION_CONFLICT" });
    expect((await api.conditions(15)).inputVersion).toBe(9);
  });
  it("independently moves readiness NONE → PARTIAL/FULL without calculating official wages", async () => {
    const { api } = await setup(); expect((await api.readiness(15)).checks.every(c => c.mode === "NONE")).toBe(true);
    await api.create(15, fixtures[2]);
    let readiness = await api.readiness(15);
    expect(readiness.checks.find(c => c.checkType === "PAYSLIP_VALIDATION")).toMatchObject({ available: true, mode: "FULL" });
    expect(readiness.checks.find(c => c.checkType === "WAGE_CALCULATION")?.available).toBe(false);
    await api.create(15, fixtures[0]);
    await api.saveConditions(15, { expectedInputVersion: 9, answers: [{ conditionId: "regular_minutes", value: 0 }] });
    readiness = await api.readiness(15);
    expect(readiness.checks.find(c => c.checkType === "WAGE_CALCULATION")).toMatchObject({ available: true, mode: "PARTIAL" });
    await api.create(15, fixtures[3]);
    expect((await api.readiness(15)).checks.find(c => c.checkType === "DEPOSIT_COMPARISON")).toMatchObject({ available: true, mode: "FULL" });
  });
  it("reuses recompute endpoint for pending/running/terminal and preserves server freshness", async () => {
    const { api, app, mock } = await setup(); await api.create(15, fixtures[0]);
    const statuses = [];
    for (let i = 0; i < 3; i++) { const status = await documentApi(app.api).recompute(15); statuses.push(status.latestJob?.status); expect(recomputeActive(status)).toBe(i < 2); }
    expect(statuses).toEqual(["PENDING", "RUNNING", "PARTIAL"]);
    mock.setJobStatus(15, "FAILED"); const failed = await documentApi(app.api).recompute(15);
    expect(failed.results?.calculation?.freshness).toBe("FAILED"); expect(recomputeActive(failed)).toBe(false);
    mock.setJobStatus(15, "SUPERSEDED"); expect(recomputeActive(await documentApi(app.api).recompute(15))).toBe(false);
  });
});
describe("input validation and lossless draft conversion", () => {
  it("preserves optional missing and explicit zero without coercing empty to zero", () => {
    expect(toManualInput("CONTRACT", { hourlyWage: "0", monthlyBasePay: "" }).data).toEqual({ hourlyWage: 0 });
    expect(toManualInput("CONTRACT", { hourlyWage: "", monthlyBasePay: "" }, { hourlyWage: 0, extra: "preserve" }).data).toEqual({ hourlyWage: null, extra: "preserve" });
    expect(toManualInput("PAYSLIP", { paymentItems: "" }, { paymentItems: [] }).data.paymentItems).toEqual([]);
  });
  it.each(["1.5", "abc", "9007199254740992"])("rejects non-integer/unsafe currency %s", value => {
    expect(manualFormSchema("CONTRACT", "2026-10-03", "2026-11-02").safeParse({ values: { hourlyWage: value } }).success).toBe(false);
  });
  it.each([
    { workDate: "2026-09-01" }, { clockOut: "2026-10-10T08:00:00" }, { breakMinutes: "9999" }, { breakMinutes: "" }, { workDate: "2026-02-30" }, { clockIn: "invalid" },
  ])("rejects invalid attendance %j", patch => {
    const values = { ...manualDefaults("ATTENDANCE", fixtures[1].data).values, ...patch };
    expect(manualFormSchema("ATTENDANCE", "2026-10-03", "2026-11-02").safeParse({ values }).success).toBe(false);
  });
  it("converts explicit UTC to Korean datetime and sends timezone-bearing instants", () => {
    const values = manualDefaults("ATTENDANCE", { ...fixtures[1].data, clockIn: "2026-10-10T00:00:00Z" }).values;
    expect(values.clockIn).toBe("2026-10-10T09:00:00");
    expect(toManualInput("ATTENDANCE", values).data.clockIn).toBe("2026-10-10T09:00:00+09:00");
  });
  it("rejects numeric strings in JSON, negative deposits and missing timezone", () => {
    expect(manualInputSchema.safeParse({ ...fixtures[0], data: { hourlyWage: "0" } }).success).toBe(false);
    expect(manualInputSchema.safeParse({ ...fixtures[3], data: { ...fixtures[3].data, amount: -1 } }).success).toBe(false);
    expect(manualInputSchema.safeParse({ ...fixtures[1], data: { ...fixtures[1].data, clockIn: "2026-10-10T09:00:00" } }).success).toBe(false);
  });
  it.each([-1, 1000001, 0.5, false, null])("rejects invalid regular_minutes %j", value => {
    expect(conditionsPutSchema.safeParse({ expectedInputVersion: 7, answers: [{ conditionId: "regular_minutes", value }] }).success).toBe(false);
  });
  it("rejects invented condition IDs and accepts UNKNOWN for supported IDs", () => {
    expect(conditionsPutSchema.safeParse({ expectedInputVersion: 7, answers: [{ conditionId: "made_up", value: true }] }).success).toBe(false);
    expect(conditionsPutSchema.safeParse({ expectedInputVersion: 7, answers: [{ conditionId: "regular_minutes", value: "UNKNOWN" }] }).success).toBe(true);
  });
  it.each(["PARTIAL", "SUCCEEDED", "FAILED", "SUPERSEDED", "CANCELLED"])("stops polling terminal job %s", status => {
    expect(recomputeActive(recomputeSchema.parse({ caseId: 15, pending: 0, running: 0, activeJob: null, latestJob: { status } }))).toBe(false);
  });
});
