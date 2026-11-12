"use client";
import { translate } from "@/i18n/translate";


import { useEffect, useId, useRef, type ReactNode } from "react";

import { secondaryButton } from "./styles";

export function ConfirmDialog({ title, children, action, onClose, busy = false }: { title: string; children: ReactNode; action: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      // React can remove the open dialog before passive cleanup; native restoration alone
      // then loses the trigger. Never focus a trigger that was removed by navigation.
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return (
    <dialog ref={ref} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); event.currentTarget.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} aria-labelledby={titleId} aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-panel border-0 bg-surface p-5 text-foreground shadow-card backdrop:bg-primary/40 sm:p-8">
      <h2 id={titleId} className="text-title font-extrabold">{title}</h2>
      <div className="mt-5 space-y-4 text-body">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus className={secondaryButton} onClick={onClose} disabled={busy}>{translate("common.cancel")}</button>
        {action}
      </div>
    </dialog>
  );
}
