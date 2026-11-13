import { createStore } from "zustand/vanilla";
import { createRefreshAccessToken } from "@/features/auth/api/refresh";
import { createMemorySession } from "@/features/auth/session";
import { createAuthApi } from "@/features/auth/api/auth";
import { createAuthController } from "@/features/auth/controller";
import { createApiClient } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/config/env";
import { createQueryClient } from "@/lib/query/client";

export function createAppServices(baseUrl = getApiBaseUrl()) {
  const session = createMemorySession();
  // Explicit UI selection only; scoped to this app tree and never persisted.
  const consultationSelection = createStore<{ caseId?: number; page: number }>(() => ({ page: 1 }));
  const queryClient = createQueryClient();
  const api = createApiClient({
    baseUrl,
    session,
    refreshAccessToken: createRefreshAccessToken({ baseUrl, session }),
  });

  session.subscribe(() => {
    consultationSelection.setState({ caseId: undefined, page: 1 });
    // Cancel before clearing so late requests cannot repopulate the old cache.
    void queryClient.cancelQueries();
    queryClient.clear();
  });

  const authApi = createAuthApi(api, baseUrl);
  const auth = createAuthController({ api, authApi, session, queryClient });
  return { api, session, queryClient, authApi, auth, consultationSelection };
}

export type AppServices = ReturnType<typeof createAppServices>;
