import { expect, it } from "vitest";
import { http } from "msw";
import fixture from "@/test/fixtures/remaining-api-responses.json";
import { server, testApiUrl } from "@/test/server";
import { apiResponse } from "@/mocks/shared/response";
import { createApiClient } from "@/lib/api/client";
import { createMemorySession } from "@/features/auth/session";
import { documentApi } from "@/features/documents/api";
import { supportApi } from "@/features/case-support/api";
import { centersSchema, centerSchema } from "@/features/case-support/schemas";
import { uploadSchema } from "@/features/documents/schemas";

// Hand-authored supplementary HTML DTO examples, independent of application Mock builders.
it("preserves candidate IDs, required center metadata and nullable JSON values", () => {
  expect(uploadSchema.parse(fixture.upload)).toEqual(fixture.upload);
  expect(centersSchema.parse(fixture.centers)).toEqual(fixture.centers);
  expect(centersSchema.parse({ ...fixture.centers, dataStatus: "AVAILABLE" }).dataStatus).toBe("AVAILABLE");
  expect(centerSchema.parse({ ...fixture.centers.items[0], languages: ["ko"], visitInformation: { appointment: true }, businessHours: "09:00" }).languages).toEqual(["ko"]);
});

it.each([undefined, null, "17", ["17"], [1.5], [Number.MAX_SAFE_INTEGER + 1]])("rejects missing or malformed candidates: %j", async value => {
  server.use(http.post(`${testApiUrl}/workplaces/1/documents`, () => apiResponse({ ...fixture.upload, duplicateCandidateIds: value }, 202)));
  const api = documentApi(createApiClient({ baseUrl: testApiUrl, session: createMemorySession() }));
  await expect(api.upload({ kind: "workplace", id: 1 }, new File(["pdf"], "test.pdf", { type: "application/pdf" }), "PAYSLIP")).rejects.toMatchObject({ kind: "protocol", status: 202, diagnostic: { phase: "dto", issues: expect.arrayContaining([expect.objectContaining({ path: expect.stringContaining("duplicateCandidateIds"), actualType: value === undefined ? "undefined" : value === null ? "null" : Array.isArray(value) ? typeof value[0] : typeof value })]) } });
});

it.each(["nationwideFallbackUsed", "dataStatus"])("rejects missing or invalid list metadata %s through the API diagnostic", async key => {
  const api = supportApi(createApiClient({ baseUrl: testApiUrl, session: createMemorySession() }));
  for (const value of [undefined, null, 1, "INVALID"]) {
    server.use(http.get(`${testApiUrl}/consultation-centers`, () => apiResponse({ ...fixture.centers, [key]: value })));
    await expect(api.centers("", "", 1)).rejects.toMatchObject({ kind: "protocol", status: 200, diagnostic: { phase: "dto", issues: expect.arrayContaining([expect.objectContaining({ path: key })]) } });
  }
});

it("enforces required, nullable and primitive center fields without substituting values", () => {
  const center = fixture.centers.items[0];
  for (const key of Object.keys(center)) expect(centerSchema.safeParse({ ...center, [key]: undefined }).success).toBe(false);
  for (const key of ["phone", "website", "sourceUrl", "verifiedAt", "dataSource", "isNationwide", "notes"]) expect(centerSchema.safeParse({ ...center, [key]: null }).success).toBe(false);
  expect(centerSchema.safeParse({ ...center, centerId: 1.5 }).success).toBe(false);
  expect(centerSchema.safeParse({ ...center, verifiedAt: "yesterday" }).success).toBe(false);
  expect(uploadSchema.parse({ ...fixture.upload, duplicateCandidateIds: [] }).duplicateCandidateIds).toEqual([]);
});
