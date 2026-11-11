import { z } from "zod";
import type { ApiErrorData } from "@/types/api";

import { ApiError } from "./error";

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown(),
});

export const errorDataSchema = z.object({
  errorCode: z.string(),
  details: z.json().optional(),
  errors: z.array(z.object({ field: z.string(), reason: z.string() })).nullable().optional(),
});

export function protocolError(): ApiError {
  return new ApiError(0, { kind: "protocol" });
}

export function hasMediaType(response: Response, expected: string): boolean {
  return response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() === expected;
}

export async function readJsonData(response: Response): Promise<unknown> {
  if (response.status === 204 || !hasMediaType(response, "application/json")) {
    throw protocolError();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw protocolError();
  }

  const parsed = envelopeSchema.safeParse(payload);
  if (
    !parsed.success ||
    parsed.data.code !== response.status ||
    !Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    throw protocolError();
  }

  return parsed.data.data;
}

export async function readApiError(response: Response): Promise<ApiError> {
  let data: Partial<ApiErrorData> = {};
  if (hasMediaType(response, "application/json")) {
    try {
      const envelope = envelopeSchema.safeParse(await response.json());
      if (envelope.success) {
        const parsed = errorDataSchema.safeParse(envelope.data.data);
        if (parsed.success) data = parsed.data;
        else {
          // Recover the business code without accepting a malformed wire DTO.
          const code = z.object({ errorCode: z.string() }).safeParse(envelope.data.data);
          if (code.success) data = code.data;
          const ancillary = errorDataSchema.omit({ errorCode: true }).safeParse(envelope.data.data);
          if (ancillary.success) data = { ...data, ...ancillary.data };
        }
      }
    } catch {
      // Proxies may return an empty/malformed error body. HTTP status remains authoritative.
    }
  }

  return new ApiError(response.status, {
    ...data,
    retryAfter: response.headers.get("retry-after"),
  });
}
