"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function MobileNavigation({ children }: { children: ReactNode }) {
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
        type="button"
        aria-label="메뉴 열기"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        className="grid size-11 place-items-center rounded-control"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-80 max-w-[calc(100vw-2rem)] border-0 bg-surface p-5 text-foreground backdrop:bg-primary/40 open:flex open:flex-col"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-bold">월급잇다 메뉴</h2>
          <button
            type="button"
            aria-label="메뉴 닫기"
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
