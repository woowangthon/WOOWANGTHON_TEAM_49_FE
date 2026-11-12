
import { translate } from "@/i18n/translate";
import type { ChatScope } from './api';
import './chat.css';

export function scopeLabel(scope: ChatScope) {
  return scope.scopeType === 'CASE' ? `Case #${scope.caseId}` : translate("chats.chatContextBar_workplace_all");
}

export function ChatContextBar({workplaceId, scope, all, busy, onAll, caseLabel}: {
  caseLabel?: string; workplaceId: number; scope: ChatScope; all: boolean; busy: boolean; onAll: (value: boolean) => void;
}) {
  return <div className="v2-chat-context">
    <p><span className="sr-only">{translate("chats.chatContextBar_workplace", { value1: workplaceId })}</span><strong>{translate("chats.chatContextBar_reference", { value1: all ? translate("chats.chatContextBar_workplace_all") : caseLabel ?? scopeLabel(scope) })}</strong></p>
    <details><summary>{translate("chats.chatContextBar_reference_scope_change")}</summary>
      <label><input type="checkbox" checked={all} disabled={busy} onChange={e => onAll(e.target.checked)}/>{translate("chats.chatContextBar_workplace_all_reference")}</label>
      <p>{all ? translate("chats.chatContextBar_current_workplace_all_reference_scope") : translate("chats.chatContextBar_scope", { value1: scopeLabel(scope) })}</p>
    </details>
  </div>;
}
