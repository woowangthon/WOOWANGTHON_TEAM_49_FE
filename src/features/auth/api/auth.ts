import { createMemorySession } from "@/features/auth/session";
import { createApiClient, type ApiClient } from "@/lib/api/client";
import { protocolError } from "@/lib/api/response";

import { loginResponseSchema, userSchema } from "../schemas";
import type { LoginRequest, SignupRequest } from "../types";

function decode<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  return (value: unknown): T => {
    const result = schema.safeParse(value);
    if (!result.success) throw protocolError();
    return result.data;
  };
}

export function createAuthApi(api: ApiClient, baseUrl: string) {
  return {
    signup: (body: SignupRequest, signal?: AbortSignal) => api.requestJson(
      "/auth/signup", () => undefined, { method: "POST", body, auth: "none", signal },
    ),
    login: (body: LoginRequest, signal?: AbortSignal) => api.requestJson(
      "/auth/login", decode(loginResponseSchema), { method: "POST", body, auth: "none", signal },
    ),
    getMe: (signal?: AbortSignal) => api.requestJson("/users/me", decode(userSchema), { signal }),
    async logout(accessToken: string | null) {
      // Main session is revoked immediately. Keep only this bounded logout request alive.
      const isolatedSession = createMemorySession();
      if (accessToken) isolatedSession.start(accessToken);
      const logoutClient = createApiClient({ baseUrl, session: isolatedSession });
      try {
        await logoutClient.requestNoContent("/auth/logout", {
          method: "POST", refresh: false, signal: AbortSignal.timeout(10_000),
        });
      } finally {
        isolatedSession.clear();
      }
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
