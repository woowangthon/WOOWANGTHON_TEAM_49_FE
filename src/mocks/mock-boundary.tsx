"use client";
import { useEffect, useState, type ReactNode } from "react";

export default function MockBoundary({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<{ reset: () => void }>();
  const [error, setError] = useState(false);
  const [unhandled, setUnhandled] = useState(false);
  useEffect(() => {
    let disposed = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; if (!disposed) setError(true); }, 10_000);
    import("./browser").then(m => m.startMockWorker()).then(value => {
      window.clearTimeout(timeout);
      if (!disposed && !timedOut) setRuntime(value);
    }).catch(() => { window.clearTimeout(timeout); if (!disposed) setError(true); });
    const notify = () => setUnhandled(true);
    window.addEventListener("wageitda:mock-unhandled", notify);
    return () => { disposed = true; window.clearTimeout(timeout); window.removeEventListener("wageitda:mock-unhandled", notify); };
  }, []);
  if (error) return <main className="mx-auto max-w-xl space-y-4 p-6" role="alert"><h1 className="text-xl font-bold">개발 Mock 초기화 실패</h1><p>API 요청을 시작하지 않았습니다. Service Worker 설정과 /mockServiceWorker.js 응답을 확인한 뒤 새로고침해 주세요.</p><button className="min-h-11 underline" onClick={() => location.reload()}>다시 시도</button></main>;
  if (!runtime) return <p role="status" className="p-6">개발 Mock Service Worker 준비 중…</p>;
  // A full navigation intentionally discards every in-memory query, token and fixture.
  const reset = () => { runtime.reset(); window.location.href = new URL("/login", window.location.origin).href; };
  return <><aside aria-label="개발 Mock Mode" className="flex flex-wrap items-center justify-between gap-2 break-words bg-amber-100 px-4 py-2 text-sm text-amber-950"><span><strong>개발 전용 MOCK ON</strong> · 가상 인증·OCR 데이터 · 실제 분석 아님</span><button type="button" className="min-h-11 rounded border px-3 underline" onClick={reset}>샘플 데이터 초기화</button>{unhandled && <p role="alert" className="w-full">미등록 Mock API 요청을 차단했습니다. 실제 서버로 전송하지 않았습니다.</p>}</aside>{children}</>;
}
