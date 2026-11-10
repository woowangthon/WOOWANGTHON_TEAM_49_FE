import { z } from "zod";

import { createApiClient } from "@/lib/api/client";
import { protocolError } from "@/lib/api/response";
import type { MemorySession } from "@/features/auth/session";

// P0 confirms token rotation; P4 API v0.5 B-03 documents accessToken.
// Only the required field is consumed. Recheck against live OpenAPI before auth UI integration.
const refreshTokenSchema = z.object({ accessToken: z.string().trim().min(1) });

export function createRefreshAccessToken(options: {
  baseUrl: string;
  session: MemorySession;
  fetch?: typeof fetch;
}) {
  // This client has no refresh handler, preventing recursive refresh requests.
  const client = createApiClient(options);
  return (signal: AbortSignal) => client.requestJson(
    "/auth/refresh",
    (data) => {
      const parsed = refreshTokenSchema.safeParse(data);
      if (!parsed.success) throw protocolError();
      return parsed.data.accessToken;
    },
    { method: "POST", auth: "none", signal, expectedStatus: 200 },
  );
}
