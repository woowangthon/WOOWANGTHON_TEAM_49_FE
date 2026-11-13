"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';

import { useTranslation } from '@/i18n/use-translation';

import { developmentDiagnostic } from "@/lib/api/diagnostic";

import { Section } from "./presentation";

import { secondaryButton } from "./styles";

export function QueryFeedback({ pending = false, error, retry }: { pending?: boolean; error?: unknown; retry?: () => void }) {
const {businessErrorMessage} = useLocalized(createLocalizedLibApiFormErrors);

 const {translate} = useTranslation();

  const diagnostic = developmentDiagnostic(error);
  return (
    <Section role={error ? "alert" : "status"} aria-busy={pending || undefined}>
      <h2 className="text-title font-bold">{pending ? translate("common.queryFeedback_record_load") : translate("common.queryFeedback_request_processing_failure")}</h2>
      <p className="mt-3 text-body text-muted">{pending ? translate("common.loading_description_main") : businessErrorMessage(error)}</p>
      {!pending && retry && <button type="button" onClick={retry} className={`mt-5 ${secondaryButton}`}>{translate("common.retry")}</button>}
      {diagnostic && <details><summary>API diagnostics (development)</summary><pre className="overflow-auto">{JSON.stringify(diagnostic,null,2)}</pre></details>}
    </Section>
  );
}
