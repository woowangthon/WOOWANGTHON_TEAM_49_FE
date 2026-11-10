import type { MemorySession } from "@/features/auth/session";
import { parseApiBaseUrl } from "@/lib/config/env";
import type { JsonValue } from "@/types/api";

import { ApiError } from "./error";
import { hasMediaType, protocolError, readApiError, readJsonData } from "./response";

export interface ApiRequestOptions {
  /** A documented success status, checked after HTTP error handling. */
  expectedStatus?: number;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: JsonValue;
  formData?: FormData;
  signal?: AbortSignal;
  /** Public endpoints (login/refresh/etc.) must opt out of Bearer and refresh. */
  auth?: "session" | "none";
  /** For session termination: a 401 must not rotate a cookie and recreate a session. */
  refresh?: boolean;
}

interface ClientOptions {
  baseUrl: string;
  session: MemorySession;
  fetch?: typeof fetch;
  refreshAccessToken?: (signal: AbortSignal) => Promise<string>;
}

export function createApiClient(options: ClientOptions) {
  const baseUrl = parseApiBaseUrl(options.baseUrl);
  const fetcher = options.fetch ?? globalThis.fetch;
  let refreshFlight: { generation: number; promise: Promise<void> } | undefined;

  function resolvePath(path: string) {
    const url = new URL(`${baseUrl}${path}`);
    // A token-bearing client only accepts paths within its configured API prefix.
    if (
      !path.startsWith("/") || path.startsWith("//") || path.includes("\\") ||
      url.origin !== new URL(baseUrl).origin ||
      !url.pathname.startsWith(`${new URL(baseUrl).pathname.replace(/\/$/, "")}/`) ||
      url.hash
    ) {
      throw new Error("API 경로는 Base URL 내부의 /로 시작하는 상대 경로여야 합니다.");
    }
    return url.toString();
  }

  function assertCurrent(generation: number, signal: AbortSignal) {
    signal.throwIfAborted();
    if (options.session.getSnapshot().generation !== generation) {
      throw new DOMException("세션이 변경되었습니다.", "AbortError");
    }
  }

  function refresh(generation: number, signal: AbortSignal): Promise<void> {
    if (refreshFlight?.generation === generation) return refreshFlight.promise;

    const flight = {
      generation,
      promise: Promise.resolve().then(async () => {
        try {
          const token = await options.refreshAccessToken!(signal);
          assertCurrent(generation, signal);
          if (!options.session.rotate(token, generation)) throw protocolError();
        } catch (error) {
          if (options.session.getSnapshot().generation === generation) options.session.clear();
          throw error;
        }
      }).finally(() => {
        if (refreshFlight === flight) refreshFlight = undefined;
      }),
    };
    refreshFlight = flight;
    return flight.promise;
  }

  async function request<T>(
    path: string,
    init: ApiRequestOptions,
    accept: string,
    read: (response: Response) => Promise<T>,
  ): Promise<T> {
    const url = resolvePath(path);
    const initial = options.session.getSnapshot();
    const authenticated = init.auth !== "none";
    const signal = AbortSignal.any([
      initial.signal,
      ...(init.signal ? [init.signal] : []),
    ]);

    const send = async () => {
      assertCurrent(initial.generation, signal);
      const headers = new Headers(init.headers);
      // Callers cannot accidentally retain a previous user's Authorization header.
      headers.delete("Authorization");
      headers.set("Accept", accept);
      const token = authenticated ? options.session.getSnapshot().accessToken : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (init.body !== undefined && init.formData) throw new Error("JSON과 multipart 본문은 함께 보낼 수 없습니다.");
      if (init.formData) headers.delete("Content-Type");
      else if (init.body !== undefined) headers.set("Content-Type", "application/json");

      let response: Response;
      try {
        response = await fetcher(url, {
          method: init.method ?? "GET",
          headers,
          body: init.formData ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
          credentials: "include",
          cache: "no-store",
          redirect: "error",
          signal,
        });
      } catch (error) {
        assertCurrent(initial.generation, signal);
        if (error instanceof Error && error.name === "AbortError") throw error;
        throw new ApiError(0, { kind: "network" });
      }
      assertCurrent(initial.generation, signal);
      return { response, token };
    };

    let { response, token } = await send();
    if (response.status === 401 && authenticated && init.refresh !== false && options.refreshAccessToken) {
      await response.body?.cancel();
      // A delayed 401 for an old token must reuse the already refreshed token.
      if (options.session.getSnapshot().accessToken === token) {
        // Caller cancellation must not cancel the shared refresh for other requests.
        await refresh(initial.generation, initial.signal);
      }
      assertCurrent(initial.generation, signal);
      ({ response, token } = await send());
    }

    if (!response.ok) {
      const error = await readApiError(response);
      assertCurrent(initial.generation, signal);
      if (response.status === 401 && authenticated) options.session.clear();
      throw error;
    }

    const result = await read(response);
    assertCurrent(initial.generation, signal);
    return result;
  }

  return {
    /** Startup restoration and reactive 401s share the same per-session flight. */
    refreshSession(): Promise<void> {
      if (!options.refreshAccessToken) return Promise.reject(protocolError());
      const snapshot = options.session.getSnapshot();
      return refresh(snapshot.generation, snapshot.signal);
    },
    /** A feature-level schema validates data; no unchecked requestJson<T> assertion. */
    requestJson<T>(path: string, decode: (data: unknown) => T, init: ApiRequestOptions = {}) {
      return request(path, init, "application/json", async (response) => {
        if (init.expectedStatus !== undefined && response.status !== init.expectedStatus) throw protocolError();
        return decode(await readJsonData(response));
      });
    },
    requestNoContent(path: string, init: ApiRequestOptions = {}): Promise<void> {
      return request(path, init, "application/json", async (response) => {
        if (response.status !== 204) throw protocolError();
      });
    },
    /** An accepted operation whose P0 contract does not specify a response DTO. */
    requestAccepted(path: string, init: ApiRequestOptions = {}): Promise<void> {
      return request(path, init, "application/json", async (response) => {
        if (response.status !== 202) throw protocolError();
        await response.body?.cancel();
      });
    },
    requestBlob(path: string, init: ApiRequestOptions = {}): Promise<Blob> {
      return request(path, init, "application/octet-stream, application/pdf, application/zip, image/*", async (response) => {
        const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
        if (
          response.status === 204 ||
          !mediaType ||
          (!["application/octet-stream", "application/pdf", "application/zip"].includes(mediaType) && !mediaType.startsWith("image/"))
        ) throw protocolError();
        return response.blob();
      });
    },
    requestSse(path: string, init: ApiRequestOptions = {}): Promise<ReadableStream<Uint8Array>> {
      return request(path, init, "text/event-stream", async (response) => {
        if (response.status !== (init.expectedStatus ?? 200) || !hasMediaType(response, "text/event-stream") || !response.body) throw protocolError();
        return response.body;
      });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
