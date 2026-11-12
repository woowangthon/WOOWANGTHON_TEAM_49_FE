import { developmentDiagnostic } from "@/lib/api/diagnostic";
import { businessErrorMessage } from "@/lib/api/form-errors";

import { Section } from "./presentation";

import { secondaryButton } from "./styles";

export function QueryFeedback({ pending = false, error, retry }: { pending?: boolean; error?: unknown; retry?: () => void }) {
  const diagnostic = developmentDiagnostic(error);
  return (
    <Section role={error ? "alert" : "status"} aria-busy={pending || undefined}>
      <h2 className="text-title font-bold">{pending ? "자료를 불러오는 중입니다" : "요청을 처리하지 못했습니다"}</h2>
      <p className="mt-3 text-body text-muted">{pending ? "잠시만 기다려 주세요." : businessErrorMessage(error)}</p>
      {!pending && retry && <button type="button" onClick={retry} className={`mt-5 ${secondaryButton}`}>다시 시도</button>}
      {diagnostic && <details><summary>API diagnostics (development)</summary><pre className="overflow-auto">{JSON.stringify(diagnostic,null,2)}</pre></details>}
    </Section>
  );
}
