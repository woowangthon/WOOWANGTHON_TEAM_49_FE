import { loginResponseSchema } from "../schemas";
import { requireUsableSession } from "../session-validation";

import { createApiClient } from "@/lib/api/client";
import { protocolError } from "@/lib/api/response";
import type { MemorySession } from "@/features/auth/session";

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
      const parsed = loginResponseSchema.safeParse(data);
      if (!parsed.success) throw protocolError();
      return requireUsableSession(parsed.data).accessToken;
    },
    { method: "POST", auth: "none", signal, expectedStatus: 200 },
  );
}
