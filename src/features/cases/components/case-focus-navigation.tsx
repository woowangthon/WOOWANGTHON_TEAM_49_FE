import { primaryButton, secondaryButton } from "@/components/ui/styles";

export function CaseFocusNavigation({ label, index, count, onChange, busy = false, emphasizeNext = false }: {
  label: string;
  index: number;
  count: number;
  onChange: (index: number) => void;
  busy?: boolean;
  emphasizeNext?: boolean;
}) {
  if (count === 0) return null;
  return <nav data-case-focus-navigation aria-label={`${label} 이동`}>
    <div><p aria-live="polite">{label} {index + 1} / {count}</p><progress aria-label={`${label} 위치`} value={index + 1} max={count} /></div>
    <div className="flex gap-2">
      <button type="button" className={secondaryButton} disabled={busy || index === 0} onClick={() => onChange(index - 1)}>이전</button>
      <button type="button" className={emphasizeNext && index < count - 1 ? primaryButton : secondaryButton} disabled={busy || index >= count - 1} onClick={() => onChange(index + 1)}>다음</button>
    </div>
  </nav>;
}
