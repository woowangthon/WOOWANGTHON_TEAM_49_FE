"use client";
import { useTranslation } from '@/i18n/use-translation';

import { primaryButton, secondaryButton } from "@/components/ui/styles";

export function CaseFocusNavigation({ label, index, count, onChange, busy = false, emphasizeNext = false }: {
  label: string;
  index: number;
  count: number;
  onChange: (index: number) => void;
  busy?: boolean;
  emphasizeNext?: boolean;
}) {
 const {translate} = useTranslation();

  if (count === 0) return null;
  return <nav data-case-focus-navigation aria-label={translate("cases.caseFocusNavigation_navigate", { value1: label })}>
    <div><p aria-live="polite">{label} {index + 1} / {count}</p><progress aria-label={translate("cases.caseFocusNavigation_ariaLabel_div", { value1: label })} value={index + 1} max={count} /></div>
    <div className="flex gap-2">
      <button type="button" className={secondaryButton} disabled={busy || index === 0} onClick={() => onChange(index - 1)}>{translate("common.previous")}</button>
      <button type="button" className={emphasizeNext && index < count - 1 ? primaryButton : secondaryButton} disabled={busy || index >= count - 1} onClick={() => onChange(index + 1)}>{translate("common.next")}</button>
    </div>
  </nav>;
}
