"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function MobileNavigation({ children, label="메뉴", title="월급잇다 메뉴" }: { children: ReactNode; label?:string; title?:string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const titleId = useId();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const closeOnDesktop = () => { if (desktop.matches) dialog?.close(); };
    const restoreScroll = () => { document.body.style.overflow = previousOverflow; };
    const updateScroll = () => {
      document.body.style.overflow = dialog?.open ? "hidden" : previousOverflow;
    };
    desktop.addEventListener("change", closeOnDesktop);
    dialog?.addEventListener("toggle", updateScroll);
    dialog?.addEventListener("close", restoreScroll);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog?.removeEventListener("toggle", updateScroll);
      dialog?.removeEventListener("close", restoreScroll);
      restoreScroll();
    };
  }, []);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} 열기`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        className="grid size-11 place-items-center rounded-control"
        onClick={() => { dialogRef.current?.showModal(); document.body.style.overflow="hidden"; }}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        onClose={() => triggerRef.current?.focus()}
        onKeyDown={event => {
          if (event.key !== "Tab") return;
          const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(node => node.getClientRects().length > 0);
          const first = nodes[0], last = nodes.at(-1);
          if (!first || !last) return;
          if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) {
            event.preventDefault(); first.focus();
          }
        }}
        aria-labelledby={titleId}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-80 max-w-[calc(100vw-2rem)] border-0 bg-surface p-5 text-foreground backdrop:bg-primary/40 open:flex open:flex-col"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-bold">{title}</h2>
          <button
            type="button"
            aria-label={`${label} 닫기`}
            autoFocus
            className="grid size-11 shrink-0 place-items-center rounded-control"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) dialogRef.current?.close();
        }}>
          {children}
        </div>
      </dialog>
    </div>
  );
}
