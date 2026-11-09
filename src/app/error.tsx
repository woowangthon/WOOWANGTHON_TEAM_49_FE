"use client";

import { StatePanel } from "@/components/ui/state-panel";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel
        title="화면을 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
        live
        action={<button type="button" onClick={reset} className="min-h-11 rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">다시 시도</button>}
      />
    </main>
  );
}
