import { createRefreshAccessToken } from "@/features/auth/api/refresh";
import { createMemorySession } from "@/features/auth/session";
import { createApiClient } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/config/env";
import { createQueryClient } from "@/lib/query/client";

export function createAppServices(baseUrl = getApiBaseUrl()) {
  const session = createMemorySession();
  const queryClient = createQueryClient();
  const api = createApiClient({
    baseUrl,
    session,
    refreshAccessToken: createRefreshAccessToken({ baseUrl, session }),
  });

  session.subscribe(() => {
    // Cancel before clearing so late requests cannot repopulate the old cache.
    void queryClient.cancelQueries();
    queryClient.clear();
  });

  return { api, session, queryClient };
}

export type AppServices = ReturnType<typeof createAppServices>;
