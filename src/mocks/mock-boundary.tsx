"use client";
import { translate } from "@/i18n/translate";
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
  if (error) return <main className="mx-auto max-w-xl space-y-4 p-6" role="alert"><h1 className="text-xl font-bold">{translate("common.mockInitializationFailed")}</h1><p>{translate("common.mockInitializationHelp")}</p><button className="min-h-11 underline" onClick={() => location.reload()}>{translate("common.retry")}</button></main>;
  if (!runtime) return <p role="status" className="p-6">{translate("common.mockPreparing")}</p>;
  // A full navigation intentionally discards every in-memory query, token and fixture.
  const reset = () => { runtime.reset(); window.location.href = new URL("/login", window.location.origin).href; };
  return <><aside aria-label={translate("common.mockModeLabel")} className="flex flex-wrap items-center justify-between gap-2 break-words bg-amber-100 px-4 py-2 text-sm text-amber-950"><span><strong>{translate("common.mockModeEnabled")}</strong>{translate("common.mockSyntheticData")}</span><button type="button" className="min-h-11 rounded border px-3 underline" onClick={reset}>{translate("common.mockReset")}</button>{unhandled && <p role="alert" className="w-full">{translate("common.mockUnhandledBlocked")}</p>}</aside>{children}</>;
}
