"use client";
import { useTranslation } from '@/i18n/use-translation';

import { secondaryButton } from "./styles";
export function StepFormNavigation({ steps, current, onChange, errors = [], busy = false }: { steps: string[]; current: number; onChange: (step: number) => void; errors?: boolean[]; busy?: boolean }) {
 const {translate} = useTranslation();

  return <nav data-ui="common-stepFormNavigation_ariaLabel_nav" aria-label={translate("common.stepFormNavigation_input_step")} className="min-w-0 space-y-3 rounded-2xl bg-soft p-4">
    <p aria-live="polite" className="font-bold">{current + 1} / {steps.length} · {steps[current]}</p>
    <ol className="flex flex-wrap gap-2">{steps.map((label, index) => <li key={index}><button type="button" disabled={busy} aria-current={current === index ? "step" : undefined} className={`${secondaryButton} ${current === index ? "border-primary bg-white font-bold" : ""}`} onClick={() => onChange(index)}>{index + 1}. {label}{errors[index] ? translate("common.stepFormNavigation_error") : ""}</button></li>)}</ol>
    <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={busy || current === 0} onClick={() => onChange(current - 1)}>{translate("common.previous")}</button><button type="button" className={secondaryButton} disabled={busy || current === steps.length - 1} onClick={() => onChange(current + 1)}>{translate("common.next")}</button></div>
  </nav>;
}
