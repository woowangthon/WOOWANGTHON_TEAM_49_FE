import { describe, expect, it } from "vitest";

import { createOpenApiContract } from "@/test/openapi/contract";
import { errorDataSchema, readApiError } from "./response";

const contract = createOpenApiContract();
const fieldErrors = [{ field: "email", reason: "invalid" }];
const response = (data: unknown, status = 409) => Response.json(
  { code: status, message: "test", data }, { status, headers: { "retry-after": "3" } },
);

describe("A11 ErrorData wire contract and UI normalization", () => {
  for (const details of [null, "text", 0, 12.5, false, true, [], [null, { nested: [1, "value"] }], {}, { currentInputVersion: 2 }]) {
    it.each([undefined, null, [], fieldErrors])(`accepts details=${JSON.stringify(details)}, errors=%j`, async (errors) => {
      const data = { errorCode: "INPUT_VERSION_CONFLICT", details, ...(errors === undefined ? {} : { errors }) };
      expect(contract.component("ErrorData", data).valid).toBe(true);
      expect(contract.component("API_ErrorData_", { code: 409, message: "test", data }).valid).toBe(true);
      expect(errorDataSchema.parse(data)).toEqual(data);
      const error = await readApiError(response(data));
      expect(error).toMatchObject({ status: 409, kind: "conflict", errorCode: data.errorCode, fieldErrors: errors ?? [], retryAfter: "3" });
      expect(error.details).toEqual(details !== null && typeof details === "object" && !Array.isArray(details) ? details : undefined);
    });
  }

  it("accepts omitted optional fields", async () => {
    const data = { errorCode: "TOKEN_EXPIRED" };
    expect(contract.component("ErrorData", data).valid).toBe(true);
    expect(errorDataSchema.parse(data)).toEqual(data);
    expect(await readApiError(response(data, 401))).toMatchObject({ status: 401, kind: "unauthorized", errorCode: data.errorCode, fieldErrors: [] });
  });

  it.each([{}, { errorCode: null }, { errorCode: 1 }])("rejects missing/non-string required errorCode: %j", async (data) => {
    expect(contract.component("ErrorData", data).valid).toBe(false);
    expect(errorDataSchema.safeParse(data).success).toBe(false);
    expect(await readApiError(response(data))).toMatchObject({ status: 409, kind: "conflict", errorCode: undefined, message: "HTTP_409" });
  });

  it.each([{}, "invalid", [{ field: "email" }], [{ field: 1, reason: "invalid" }]])("rejects malformed errors but recovers the code: %j", async (errors) => {
    const data = { errorCode: "INPUT_VERSION_CONFLICT", errors };
    expect(contract.component("ErrorData", data).valid).toBe(false);
    expect(errorDataSchema.safeParse(data).success).toBe(false);
    expect(await readApiError(response(data))).toMatchObject({ errorCode: data.errorCode, fieldErrors: [], status: 409 });
  });

  it("preserves 422 field errors for form mapping", async () => {
    expect(await readApiError(response({ errorCode: "VALIDATION_ERROR", details: null, errors: fieldErrors }, 422)))
      .toMatchObject({ status: 422, kind: "validation", fieldErrors });
  });

  it("recovers form fields from an invalid DTO without inventing errorCode", async () => {
    const data = { errors: fieldErrors };
    expect(contract.component("ErrorData", data).valid).toBe(false);
    expect(errorDataSchema.safeParse(data).success).toBe(false);
    expect(await readApiError(response(data, 422)))
      .toMatchObject({ errorCode: undefined, fieldErrors, status: 422 });
  });
});
