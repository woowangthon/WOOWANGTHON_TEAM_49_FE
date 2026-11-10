import { setupWorker } from "msw/browser";
import { http, HttpResponse } from "msw";
import { getApiBaseUrl } from "@/lib/config/env";
import { clearMockSession, createDevelopmentScenario } from "./development";

const state = globalThis as typeof globalThis & { wageitdaMock?: Promise<{ reset: () => void }> };
export function startMockWorker() {
  return state.wageitdaMock ??= (async () => {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) throw new Error("Mock Mode에는 localhost 또는 HTTPS와 Service Worker가 필요합니다.");
    const base = new URL(getApiBaseUrl());
    const blockedApi = http.all("*", ({ request }) => {
      const url = new URL(request.url);
      if ((url.origin === base.origin && (base.origin !== location.origin || url.pathname.startsWith(base.pathname) || url.pathname === "/health")) || url.pathname.startsWith("/api/")) {
        window.dispatchEvent(new Event("wageitda:mock-unhandled"));
        return HttpResponse.json({ code: 501, message: "개발 Mock에 등록되지 않은 API입니다. 실제 서버로 전달하지 않았습니다.", data: { errorCode: "MOCK_NOT_IMPLEMENTED" } }, { status: 501 });
      }
    });
    const worker = setupWorker(...createDevelopmentScenario().handlers, blockedApi);
    await worker.start({ quiet: true, serviceWorker: { url: "/mockServiceWorker.js" }, onUnhandledFrame: "bypass" });
    if (!navigator.serviceWorker.controller) throw new Error("Mock Service Worker가 페이지를 제어하지 못했습니다. 새로고침해 주세요.");
    return { reset() { clearMockSession(); worker.resetHandlers(...createDevelopmentScenario().handlers, blockedApi); } };
  })();
}
