import { afterAll, afterEach, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const testApiUrl = "http://127.0.0.1:8000/api/v1";
export const testUser = { userId: 7, email: "worker@example.com", name: "테스트 근로자" };
export const testLogin = { accessToken: "msw-access-token", tokenType: "Bearer", expiresIn: 1800, user: testUser };

export function apiResponse(data: unknown, status = 200) {
  return HttpResponse.json({ code: status, message: "MSW test fixture", data }, { status });
}

// Test-only handlers. Never loaded into the application or a service worker.
export const server = setupServer(
  http.post(`${testApiUrl}/auth/refresh`, () => apiResponse({ errorCode: "AUTH_REQUIRED" }, 401)),
  http.post(`${testApiUrl}/auth/login`, () => apiResponse(testLogin)),
  http.post(`${testApiUrl}/auth/signup`, () => apiResponse(testUser, 201)),
  http.get(`${testApiUrl}/users/me`, ({ request }) => request.headers.get("Authorization")
    ? apiResponse(testUser) : apiResponse({ errorCode: "AUTH_REQUIRED" }, 401)),
  http.post(`${testApiUrl}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
