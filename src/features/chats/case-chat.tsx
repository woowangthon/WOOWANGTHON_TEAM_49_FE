"use client";
import { useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useCase } from "@/features/cases/queries";
import { useSessionScope } from "@/hooks/use-session-scope";
import { ChatScreen } from "./chat-screen";
import styles from "./case-chat.module.css";

export function CaseChat({ caseId }: { caseId: number }) {
  const session = useSessionScope();
  const owner = useCase(caseId);
  return session.enabled && owner.data ? <CaseChatPanel key={`${session.generation}:${caseId}`} caseId={caseId} workplaceId={owner.data.workplaceId} /> : null;
}

function CaseChatPanel({ caseId, workplaceId }: { caseId: number; workplaceId: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [visited, setVisited] = useState(false);
  const [open, setOpen] = useState(false);
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  return <>
    <button ref={trigger} className={styles.trigger} aria-label="AI 자료 도우미 열기" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      if (open) { close(); return; }
      setVisited(true); setOpen(true); dialog.current?.showModal();
    }}><MessageCircle aria-hidden="true" /></button>
    <dialog ref={dialog} className={styles.panel} aria-label="현재 급여 사례 AI 자료 도우미" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)}>
      <header className={styles.header}><strong>AI 자료 도우미 · 사례 #{caseId}</strong><button autoFocus aria-label="AI 자료 도우미 닫기" onClick={close}><X aria-hidden="true" /></button></header>
      <div className={styles.body}>{visited && <ChatScreen workplaceId={workplaceId} embeddedCaseId={caseId} />}</div>
    </dialog>
  </>;
}
