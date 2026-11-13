"use client";
import { useTranslation } from '@/i18n/use-translation';

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
 const {translate} = useTranslation();

  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [visited, setVisited] = useState(false);
  const [open, setOpen] = useState(false);
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  return <>
    <button ref={trigger} className={styles.trigger} aria-label={translate("chats.caseChat_record_assistant")} aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      if (open) { close(); return; }
      setVisited(true); setOpen(true); dialog.current?.showModal();
    }}><MessageCircle aria-hidden="true" /></button>
    <dialog ref={dialog} className={styles.panel} aria-label={translate("chats.caseChat_current_wage_record_assistant")} onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)}>
      <header className={styles.header}><strong>{translate("chats.caseChat_record_assistant_2", { value1: caseId })}</strong><button autoFocus aria-label={translate("chats.caseChat_record_assistant_close")} onClick={close}><X aria-hidden="true" /></button></header>
      <div className={styles.body}>{visited && <ChatScreen workplaceId={workplaceId} embeddedCaseId={caseId} />}</div>
    </dialog>
  </>;
}
