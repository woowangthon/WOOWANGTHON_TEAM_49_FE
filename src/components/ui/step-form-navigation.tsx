"use client";
import { secondaryButton } from "./styles";
export function StepFormNavigation({ steps, current, onChange, errors = [], busy = false }: { steps: string[]; current: number; onChange: (step: number) => void; errors?: boolean[]; busy?: boolean }) {
  return <nav aria-label="입력 단계" className="min-w-0 space-y-3 rounded-2xl bg-soft p-4">
    <p aria-live="polite" className="font-bold">{current + 1} / {steps.length} · {steps[current]}</p>
    <ol className="flex flex-wrap gap-2">{steps.map((label, index) => <li key={index}><button type="button" disabled={busy} aria-current={current === index ? "step" : undefined} className={`${secondaryButton} ${current === index ? "border-primary bg-white font-bold" : ""}`} onClick={() => onChange(index)}>{index + 1}. {label}{errors[index] ? " · 오류" : ""}</button></li>)}</ol>
    <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={busy || current === 0} onClick={() => onChange(current - 1)}>이전</button><button type="button" className={secondaryButton} disabled={busy || current === steps.length - 1} onClick={() => onChange(current + 1)}>다음</button></div>
  </nav>;
}
