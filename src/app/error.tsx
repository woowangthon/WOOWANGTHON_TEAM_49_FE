"use client";
import { useTranslations } from "next-intl";

import { StatePanel } from "@/components/ui/state-panel";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel
        title={t("error_loadFailure")}
        description={t("error_retry")}
        live
        action={<button type="button" onClick={reset} className="min-h-11 rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">{t("retry")}</button>}
      />
    </main>
  );
}
