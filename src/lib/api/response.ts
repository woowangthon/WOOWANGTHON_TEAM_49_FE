import { z } from "zod";

import { ApiError } from "./error";

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown(),
});

const errorDataSchema = z.object({
  errorCode: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.object({ field: z.string(), reason: z.string() })).optional(),
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
  let data = {};
  if (hasMediaType(response, "application/json")) {
    try {
      const envelope = envelopeSchema.safeParse(await response.json());
      if (envelope.success) {
        const parsed = errorDataSchema.safeParse(envelope.data.data);
        if (parsed.success) data = parsed.data;
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
