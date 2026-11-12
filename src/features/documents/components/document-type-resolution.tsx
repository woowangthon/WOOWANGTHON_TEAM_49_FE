"use client";
import { useId, useState } from "react";
import { SelectField } from "@/components/ui/select-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { useDocumentAction } from "../queries";
import { documentTypes, type ConcreteDocumentType, type DocumentDto } from "../schemas";
import { documentError, documentTypeIssue, typeLabels } from "../view-models";

type Issue = NonNullable<ReturnType<typeof documentTypeIssue>>;

/** Resolves DOCUMENT_TYPE_MISMATCH / DOCUMENT_TYPE_UNRESOLVED through the P0 document type PATCH. */
export function DocumentTypeResolution({ dto, issue, disabled = false }: { dto: DocumentDto; issue: Issue; disabled?: boolean }) {
  const id = useId();
  const mutation = useDocumentAction();
  const [choosing, setChoosing] = useState(!issue.detected);
  const [selected, setSelected] = useState<ConcreteDocumentType | "">("");
  const [error, setError] = useState("");
  const busy = mutation.isPending || disabled;
  const change = async (documentType: ConcreteDocumentType) => {
    setError("");
    try { await mutation.mutateAsync({ type: "changeType", workplaceId: dto.workplaceId, documentId: dto.documentId, documentType }); }
    catch (e) { setError(documentError(e)); }
  };
  return <section aria-labelledby={`${id}-title`} className="mt-3 min-w-0 space-y-3 rounded-control border border-border bg-neutral-soft p-4">
    <h4 id={`${id}-title`} className="text-body font-bold">문서 유형 확인 필요</h4>
    <p className="break-words text-body">{issue.message}</p>
    {issue.detected && !choosing && <div className="flex flex-wrap gap-2">
      <button type="button" className={primaryButton} disabled={busy} onClick={() => { void change(issue.detected!); }}>{typeLabels[issue.detected]}(으)로 바꿔 다시 추출</button>
      <button type="button" className={secondaryButton} disabled={busy} onClick={() => setChoosing(true)}>유형 직접 선택</button>
    </div>}
    {choosing && <form className="space-y-3" aria-label="문서 유형 직접 선택" onSubmit={event => { event.preventDefault(); if (selected) void change(selected); }}>
      <SelectField id={`${id}-type`} label="문서 유형" value={selected} disabled={busy} onChange={event => setSelected(event.target.value as ConcreteDocumentType | "")}>
        <option value="">유형을 선택해 주세요</option>
        {documentTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}
      </SelectField>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton} disabled={busy || !selected}>이 유형으로 다시 추출</button>
        {issue.detected && <button type="button" className={secondaryButton} disabled={busy} onClick={() => { setChoosing(false); setSelected(""); }}>선택 취소</button>}
      </div>
    </form>}
    {mutation.isPending && <p role="status" className="text-body">문서 유형 변경을 요청하는 중…</p>}
    {error && <p role="alert" className="break-words text-body">{error}</p>}
    <p className="text-caption text-muted">유형을 바꾸면 아직 확인하지 않은 추출값을 지우고 새 유형으로 다시 추출합니다. 원본 파일은 그대로 유지됩니다.</p>
  </section>;
}
