
import { translate } from "@/i18n/translate";
import type { QueryClient } from "@tanstack/react-query";

import type { ApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";

import type { AuthApi } from "./api/auth";
import { requireUsableSession } from "./session-validation";
import { authKeys } from "./query-keys";
import type { MemorySession } from "./session";
import type { AuthSnapshot, CurrentUser, LoginRequest } from "./types";

export function createAuthController({ api, authApi, session, queryClient }: {
  api: ApiClient;
  authApi: AuthApi;
  session: MemorySession;
  queryClient: QueryClient;
}) {
  const initial: AuthSnapshot = { status: "restoring", notice: null };
  let snapshot = initial;
  const listeners = new Set<() => void>();
  let initialized = false;
  let restoration: Promise<void> | undefined;
  let logoutFlight: Promise<void> | undefined;
  let operation = 0;

  function update(next: AuthSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  session.subscribe(() => {
    if (!session.getSnapshot().accessToken && snapshot.status !== "signing-out") {
      update({ status: "anonymous", notice: null });
    }
  });

  function remember(user: CurrentUser) {
    queryClient.setQueryData(authKeys.me(session.getSnapshot().generation), user);
    update({ status: "authenticated", notice: null });
  }

  return {
    getSnapshot: () => snapshot,
    acceptDeletion() {
      ++operation;
      initialized = true;
      session.clear();
      update({ status: "deletion-accepted", notice: null });
    },
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    restore(): Promise<void> {
      if (restoration) return restoration;
      if (initialized) return Promise.resolve();
      initialized = true;
      const current = ++operation;
      restoration = (async () => {
        try {
          await api.refreshSession();
          if (current !== operation) return;
          const generation = session.getSnapshot().generation;
          const user = await queryClient.fetchQuery({
            queryKey: authKeys.me(generation),
            queryFn: ({ signal }) => authApi.getMe(signal),
          });
          if (current === operation) remember(user);
        } catch (error) {
          if (current !== operation) return;
          session.clear();
          update({
            status: "anonymous",
            notice: error instanceof ApiError && error.status === 401
              ? null : translate("auth.controller_previous_login_status_confirm_failure_retry"),
          });
        }
      })().finally(() => { restoration = undefined; });
      return restoration;
    },
    async login(body: LoginRequest) {
      if (snapshot.status === "signing-out") throw new Error(translate("auth.controller_logout_processing"));
      const current = ++operation;
      initialized = true;
      const result = await authApi.login(body);
      if (current !== operation) throw new DOMException(translate("auth.controller_authentication_request_cancel"), "AbortError");
      try { requireUsableSession(result); } catch (error) { session.clear(); throw error; }
      session.start(result.accessToken);
      remember(result.user);
    },
    logout(): Promise<void> {
      if (logoutFlight) return logoutFlight;
      ++operation;
      initialized = true;
      const token = session.getSnapshot().accessToken;
      update({ status: "signing-out", notice: null });
      // Cancels user requests, clears query/mutation caches, and hides protected content now.
      session.clear();
      logoutFlight = authApi.logout(token).then(
        () => update({ status: "anonymous", signedOut: true, notice: translate("auth.controller_logout") }),
        () => update({ status: "anonymous", signedOut: true, notice: translate("auth.controller_logout_confirm_failure_retry_login_count") }),
      ).finally(() => { logoutFlight = undefined; });
      return logoutFlight;
    },
  };
}
