import { describe, expect, it } from "vitest";
import { createMemorySession } from "@/features/auth/session";
import { createApiClient } from "@/lib/api/client";
import { createOpenApiContract } from "@/test/openapi/contract";
import { documentApi } from "./api";
import { documentSchema, uploadDocumentTypes } from "./schemas";

const contract = createOpenApiContract("contracts/openapi.json");
const dto = { documentId: 102, workplaceId: 3, documentType: "AUTO", fileName: "입금내역.pdf", processingStatus: "REVIEW_REQUIRED", progress: 100, reviewStatus: "NOT_STARTED", linkId: null, linkedCaseIds: [15], uploadedAt: "2026-11-13T00:00:00+00:00", errorCode: "DOCUMENT_TYPE_UNRESOLVED", aiMetadata: { legacyAutoExtract: true } };

describe("document type (AUTO) against P0", () => {
  it("accepts AUTO DocumentDTOs and every upload type", () => {
    expect(contract.component("DocumentDTO", dto)).toMatchObject({ valid: true });
    expect(documentSchema.parse(dto).documentType).toBe("AUTO");
    for (const documentType of uploadDocumentTypes) expect(contract.component("DocumentTypePatch", { documentType }).valid).toBe(true);
    expect(contract.component("DocumentTypePatch", { documentType: "OTHER" }).valid).toBe(false);
  });
  it("serializes the type change PATCH exactly as declared", async () => {
    const session = createMemorySession(); session.start("test");
    const seen: unknown[] = [];
    const client = createApiClient({ baseUrl: "http://127.0.0.1:8000/api/v1", session, fetch: async (input, init) => {
      const request = { url: String(input), method: init?.method ?? "GET", body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) };
      expect(contract.request(request)).toMatchObject({ valid: true, errors: [] }); seen.push(request);
      const body = { code: 202, message: "test", data: { ...dto, documentType: "DEPOSIT", processingStatus: "PROCESSING", errorCode: null } };
      expect(contract.response(request, 202, body).valid).toBe(true);
      return Response.json(body, { status: 202 });
    } });
    const updated = await documentApi(client).changeType(3, 102, "DEPOSIT");
    expect(seen).toEqual([{ url: "http://127.0.0.1:8000/api/v1/workplaces/3/documents/102", method: "PATCH", body: { documentType: "DEPOSIT" } }]);
    expect(updated).toMatchObject({ documentType: "DEPOSIT", processingStatus: "PROCESSING" });
  });
});
