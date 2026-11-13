"use client";
import { useTranslation } from '@/i18n/use-translation';

import { useId, useRef, type ReactNode } from "react";
import { secondaryButton } from "./styles";

export function ResultCarousel({ count, index, onIndexChange, title, children }: {
  count: number; index: number; onIndexChange: (index: number) => void;
  title: string; children: ReactNode;
}) {
 const {translate} = useTranslation();

  const id = useId();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = Math.max(0, Math.min(index, count - 1));
  const move = (next: number) => onIndexChange(Math.max(0, Math.min(next, count - 1)));
  return <section aria-label={title} aria-roledescription={translate("common.resultCarousel_ariaRoledescription_section")} className="min-w-0 space-y-4">
    {count > 1 && <div className="flex flex-wrap items-center justify-between gap-3">
      <button className={secondaryButton} aria-controls={id} disabled={current === 0} onClick={() => move(current - 1)}>{translate("common.resultCarousel_previous_card")}</button>
      <span aria-live="polite" aria-atomic="true">{current + 1} / {count}</span>
      <button className={secondaryButton} aria-controls={id} disabled={current === count - 1} onClick={() => move(current + 1)}>{translate("common.resultCarousel_next_card")}</button>
    </div>}
    <div id={id} tabIndex={count ? 0 : undefined} aria-label={count ? `${title} ${current + 1} / ${count}` : undefined}
      className="min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      onKeyDown={e => {
        if (e.target !== e.currentTarget || count < 2) return;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault(); move(e.key === "Home" ? 0 : e.key === "End" ? count - 1 : current + (e.key === "ArrowRight" ? 1 : -1));
      }} onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        const start = touch.current; touch.current = null;
        if (!start || count < 2 || (e.target as HTMLElement).closest("button,a,input,summary")) return;
        const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(current + (dx < 0 ? 1 : -1));
      }}>
      {count ? children : <p className="rounded-2xl bg-neutral-soft p-6">{translate("common.resultCarousel_result_empty_status_check_type_select")}</p>}
    </div>
  </section>;
}
