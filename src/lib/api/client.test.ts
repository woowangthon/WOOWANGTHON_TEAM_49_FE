import { describe, expect, it, vi } from "vitest";

import { createMemorySession } from "@/features/auth/session";
import { createRefreshAccessToken } from "@/features/auth/api/refresh";

import { createApiClient } from "./client";
import { ApiError } from "./error";

const baseUrl = "http://127.0.0.1:8000/api/v1";
const identity = (value: unknown) => value;
const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(
  { code: status, message: "test", data }, { status, headers },
);
const unauthorized = () => json({ errorCode: "TOKEN_EXPIRED" }, 401);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(refreshAccessToken?: (signal: AbortSignal) => Promise<string>) {
  const session = createMemorySession();
  session.start("old-token");
  const fetcher = vi.fn<typeof fetch>();
  const api = createApiClient({ baseUrl, session, fetch: fetcher, refreshAccessToken });
  return { session, fetcher, api };
}

describe("JSON / no-content / binary transports", () => {
  it.each([null, 0, { amount: null, zero: 0, unknown: "UNKNOWN" }])("unwraps data without substituting missing values: %j", async (data) => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json(data));
    await expect(api.requestJson("/cases", identity)).resolves.toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/cases`, expect.objectContaining({
      credentials: "include", cache: "no-store", redirect: "error",
    }));
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer old-token");
    expect(headers.get("Content-Type")).toBeNull();
  });

  it("serializes explicit JSON and preserves supplied version/idempotency fields", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json({ inputVersion: 9 }, 202));
    await api.requestJson("/cases/15/recompute", identity, {
      method: "POST", body: { expectedInputVersion: 8, confirmed: true },
      headers: { "Idempotency-Key": "retry-same-request" },
    });
    const init = fetcher.mock.calls[0][1]!;
    expect(init.body).toBe('{"expectedInputVersion":8,"confirmed":true}');
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("retry-same-request");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("never parses a 204 response as JSON", async () => {
    const { api, fetcher } = setup();
    const response = new Response(null, { status: 204 });
    const parse = vi.spyOn(response, "json");
    fetcher.mockResolvedValueOnce(response);
    await expect(api.requestNoContent("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
    expect(parse).not.toHaveBeenCalled();
  });

  it("requires callers to select the correct no-content transport", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ kind: "protocol" });
    fetcher.mockResolvedValueOnce(json({}));
    await expect(api.requestNoContent("/resource")).rejects.toMatchObject({ kind: "protocol" });
  });

  it.each([
    { message: "missing code", data: {} },
    { code: 200, message: "missing data" },
    { code: 201, message: "wrong status", data: {} },
  ])("rejects a malformed JSON envelope", async (body) => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(Response.json(body));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ kind: "protocol" });
  });

  it("rejects non-JSON and invalid JSON success responses", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("<html>proxy</html>", { headers: { "content-type": "text/html" } }));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ kind: "protocol" });
    fetcher.mockResolvedValueOnce(new Response("{", { headers: { "content-type": "application/json" } }));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ kind: "protocol" });
  });

  it("downloads raw Blob without a JSON wrapper", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("pdf-content", { headers: { "content-type": "application/pdf" } }));
    const blob = await api.requestBlob("/cases/15/reports/1/pdf");
    expect(await blob.text()).toBe("pdf-content");
    expect(blob.type).toBe("application/pdf");
  });

  it("does not disguise a JSON success response as a file", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json({}));
    await expect(api.requestBlob("/file")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("does not disguise an HTML proxy page as a successful download", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("<html>proxy</html>", { headers: { "content-type": "text/html" } }));
    await expect(api.requestBlob("/file")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("returns a separate SSE stream and validates its content type", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("event: message_done\ndata: {}\n\n", {
      headers: { "content-type": "text/event-stream; charset=utf-8" },
    }));
    const stream = await api.requestSse("/stream", { method: "POST", body: { content: "질문" } });
    expect(await new Response(stream).text()).toContain("message_done");
    fetcher.mockResolvedValueOnce(json({}));
    await expect(api.requestSse("/stream")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("decodes JSON errors before accepting an SSE or Blob response", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json({ errorCode: "CHAT_RUN_IN_PROGRESS" }, 409));
    await expect(api.requestSse("/stream")).rejects.toMatchObject({ status: 409, errorCode: "CHAT_RUN_IN_PROGRESS" });
    fetcher.mockResolvedValueOnce(json({ errorCode: "REPORT_NOT_READY" }, 409));
    await expect(api.requestBlob("/file")).rejects.toMatchObject({ status: 409, errorCode: "REPORT_NOT_READY" });
  });
});

describe("HTTP and network errors", () => {
  it.each([
    [401, "unauthorized"], [403, "forbidden"], [404, "not-found"],
    [409, "conflict"], [422, "validation"], [429, "rate-limited"], [503, "server"],
  ])("preserves status %i and classifies it as %s", async (status, kind) => {
    const refresh = vi.fn(async () => "new-token");
    const { api, fetcher } = setup(status === 401 ? undefined : refresh);
    fetcher.mockResolvedValueOnce(json({ errorCode: "SERVER_ERROR_CODE" }, status as number));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ status, kind, errorCode: "SERVER_ERROR_CODE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("preserves version conflict details and 422 field errors", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json({
      errorCode: "INPUT_VERSION_CONFLICT", details: { expectedInputVersion: 7, currentInputVersion: 8 },
    }, 409));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({
      details: { expectedInputVersion: 7, currentInputVersion: 8 },
    });
    fetcher.mockResolvedValueOnce(json({ errors: [{ field: "periodEnd", reason: "invalid" }] }, 422));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({
      fieldErrors: [{ field: "periodEnd", reason: "invalid" }],
    });
  });

  it("exposes Retry-After without automatically retrying rate limits", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(json({ errorCode: "RATE_LIMITED" }, 429, { "Retry-After": "30" }));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ status: 429, retryAfter: "30" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retains HTTP status for non-JSON proxy errors", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("upstream failed", { status: 502 }));
    await expect(api.requestJson("/resource", identity)).rejects.toMatchObject({ status: 502, kind: "server" });
  });

  it("normalizes network failures without retaining sensitive exception text or replaying POST", async () => {
    const { api, fetcher } = setup();
    fetcher.mockRejectedValueOnce(new TypeError("private-url-and-token"));
    const error = await api.requestJson("/cases", identity, { method: "POST", body: {} }).catch(identity);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "network", status: 0 });
    expect(String(error)).not.toContain("private-url-and-token");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(["https://other.example/steal", "//other.example", "/../admin", "/%2e%2e/admin", "/cases#fragment", "/\\other"]) (
    "rejects paths outside the configured API prefix: %s", async (path) => {
      const { api, fetcher } = setup();
      await expect(api.requestJson(path, identity)).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});

describe("authentication concurrency", () => {
  it("shares one refresh across concurrent 401 responses", async () => {
    const gate = deferred<string>();
    const refresh = vi.fn<(signal: AbortSignal) => Promise<string>>(() => gate.promise);
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockImplementation(async (_url, init) => new Headers(init?.headers).get("Authorization") === "Bearer old-token"
      ? unauthorized() : json({ ok: true }));
    const requests = Array.from({ length: 5 }, () => api.requestJson("/cases", identity));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    gate.resolve("new-token");
    await expect(Promise.all(requests)).resolves.toEqual(Array(5).fill({ ok: true }));
    expect(fetcher).toHaveBeenCalledTimes(10);
    expect(session.getSnapshot()).toMatchObject({ accessToken: "new-token", generation: 1 });
  });

  it("reuses the new token for a delayed 401 from the old token", async () => {
    const delayed = deferred<Response>();
    const refresh = vi.fn(async () => "new-token");
    const { api, fetcher } = setup(refresh);
    fetcher.mockResolvedValueOnce(unauthorized()).mockImplementationOnce(() => delayed.promise).mockImplementation(async () => json({ ok: true }));
    const first = api.requestJson("/cases", identity);
    const second = api.requestJson("/workplaces", identity);
    await first;
    delayed.resolve(unauthorized());
    await expect(second).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("clears authentication after the retry also returns 401 without a refresh loop", async () => {
    const refresh = vi.fn(async () => "new-token");
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockImplementation(async () => unauthorized());
    await expect(api.requestJson("/cases", identity)).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().accessToken).toBeNull();
  });

  it("fails all waiting requests and clears the session when refresh fails", async () => {
    const gate = deferred<string>();
    const refresh = vi.fn<(signal: AbortSignal) => Promise<string>>(() => gate.promise);
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockImplementation(async () => unauthorized());
    const completed = Promise.allSettled([
      api.requestJson("/cases", identity), api.requestJson("/workplaces", identity),
    ]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    gate.reject(new ApiError(401));
    const results = await completed;
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(session.getSnapshot().accessToken).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not allow an old refresh to restore authentication after logout", async () => {
    const gate = deferred<string>();
    const refresh = vi.fn<(signal: AbortSignal) => Promise<string>>(() => gate.promise);
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockResolvedValueOnce(unauthorized());
    const outcome = api.requestJson("/cases", identity).catch(identity);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    session.clear();
    gate.resolve("old-user-refreshed-token");
    expect(await outcome).toMatchObject({ name: "AbortError" });
    expect(session.getSnapshot().accessToken).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not clear a new user's session when the old user's refresh fails", async () => {
    const gate = deferred<string>();
    const refresh = vi.fn<(signal: AbortSignal) => Promise<string>>(() => gate.promise);
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockResolvedValueOnce(unauthorized());
    const outcome = api.requestJson("/cases", identity).catch(identity);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    session.start("new-user-token");
    gate.reject(new ApiError(401));
    await outcome;
    expect(session.getSnapshot().accessToken).toBe("new-user-token");
  });

  it("does not cancel other callers' shared refresh when one caller is aborted", async () => {
    const gate = deferred<string>();
    const refresh = vi.fn<(signal: AbortSignal) => Promise<string>>(() => gate.promise);
    const { api, fetcher } = setup(refresh);
    fetcher.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json({ ok: true }));
    const controller = new AbortController();
    const first = api.requestJson("/cases", identity, { signal: controller.signal }).catch(identity);
    const second = api.requestJson("/workplaces", identity);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    controller.abort();
    gate.resolve("new-token");
    expect(await first).toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toEqual({ ok: true });
    expect(refresh.mock.calls[0][0].aborted).toBe(false);
  });

  it("rejects late results from a previous session even if fetch ignores cancellation", async () => {
    const delayed = deferred<Response>();
    const { api, fetcher, session } = setup();
    fetcher.mockImplementationOnce(() => delayed.promise);
    const outcome = api.requestJson("/cases", identity).catch(identity);
    session.start("new-user-token");
    delayed.resolve(json({ private: "previous-user" }));
    expect(await outcome).toMatchObject({ name: "AbortError" });
  });

  it("keeps public 401 errors out of refresh and strips any caller-supplied Bearer header", async () => {
    const refresh = vi.fn(async () => "new-token");
    const { api, fetcher, session } = setup(refresh);
    fetcher.mockResolvedValueOnce(unauthorized());
    await expect(api.requestJson("/auth/login", identity, {
      method: "POST", auth: "none", headers: { Authorization: "Bearer stale-token" },
    })).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
    expect(session.getSnapshot().accessToken).toBe("old-token");
  });

  it("refresh uses POST, cookie credentials, no body and no Bearer", async () => {
    const session = createMemorySession();
    session.start("expired-token");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ accessToken: "replacement" }));
    const refresh = createRefreshAccessToken({ baseUrl, session, fetch: fetcher });
    await expect(refresh(session.getSnapshot().signal)).resolves.toBe("replacement");
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/auth/refresh`, expect.objectContaining({
      method: "POST", credentials: "include", body: undefined,
    }));
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });

  it("rejects an undocumented/missing refresh token field instead of substituting it", async () => {
    const session = createMemorySession();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ token: "wrong-field" }));
    const refresh = createRefreshAccessToken({ baseUrl, session, fetch: fetcher });
    await expect(refresh(session.getSnapshot().signal)).rejects.toMatchObject({ kind: "protocol" });
  });
});
