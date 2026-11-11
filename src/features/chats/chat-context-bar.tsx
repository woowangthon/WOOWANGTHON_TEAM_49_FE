import type { ChatScope } from './api';
import './chat.css';

export function scopeLabel(scope: ChatScope) {
  return scope.scopeType === 'CASE' ? `Case #${scope.caseId}` : '근무지 전체';
}

export function ChatContextBar({workplaceId, scope, all, busy, onAll}: {
  workplaceId: number; scope: ChatScope; all: boolean; busy: boolean; onAll: (value: boolean) => void;
}) {
  return <div className="v2-chat-context">
    <p>근무지 #{workplaceId} · <strong>참조: {all ? '근무지 전체' : scopeLabel(scope)}</strong></p>
    <details><summary>참조 범위 변경</summary>
      <label><input type="checkbox" checked={all} disabled={busy} onChange={e => onAll(e.target.checked)}/>근무지 전체 참조</label>
      <p>{all ? '현재 근무지의 모든 Case로 참조 범위가 넓어집니다.' : `기본 범위: ${scopeLabel(scope)}`}</p>
    </details>
  </div>;
}
