"use client";
import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleAlert, FileText, LoaderCircle } from "lucide-react";
import { secondaryButton } from "@/components/ui/styles";
import { useDocumentAction, useDocumentStatus } from "../queries";
import type { DocumentContext } from "../schemas";
import { documentCard, processingErrorMessage, documentError, documentTypeIssue, isProcessing, type DocumentViewModel } from "../view-models";
import { DocumentTypeResolution } from "./document-type-resolution";
import { DocumentActions } from "./document-actions";
import { LinkForm } from "./link-form";
export function DocumentCard({ dto, context, linkDetails, inputVersion, selectableCaseId, canConnect = true, onEditingChange }: DocumentViewModel & { context: DocumentContext; inputVersion?: number; selectableCaseId?: number; canConnect?: boolean; onEditingChange?: (editing: boolean) => void }) {
  const status = useDocumentStatus(context.kind === "library" ? { kind: "workplace", id: dto.workplaceId } : context, dto);
  const item = documentCard(dto, status.data);
  const [visibleLinks, setVisibleLinks] = useState(5);
  const [editing, setEditing] = useState(false);
  const mutation = useDocumentAction();
  const [error, setError] = useState("");
  const active = isProcessing(item.processingStatus);
  const Icon = active ? LoaderCircle : item.processingStatus === "READY" ? CircleCheck : CircleAlert;
  const caseId = context.kind === "case" ? context.id : undefined;
  const link = linkDetails && linkDetails.linkId === dto.linkId && linkDetails.documentId === dto.documentId && linkDetails.caseId === caseId ? linkDetails : undefined;
  const retryCaseId = caseId ?? dto.linkedCaseIds?.[0];
  const typeIssue = active ? undefined : documentTypeIssue(dto, item.errorCode);
  return <article className={`document-row min-w-0`} aria-label={dto.fileName}>
    <div className="flex min-w-0 items-start gap-3"><FileText aria-hidden="true" className="mt-1 size-6 shrink-0" /><div className="min-w-0"><h3 className="break-all text-body font-bold">{dto.fileName}</h3><p className="mt-1 text-caption text-muted">{item.typeLabel}{context.kind === "library" && ` · ${dto.workplaceName ?? `근무지 #${dto.workplaceId}`}`}</p></div></div>
    <p className="document-status flex flex-wrap items-center gap-2 text-body"><Icon aria-hidden="true" className={`size-4 shrink-0 ${active ? "animate-spin motion-reduce:animate-none" : ""}`} /><span>처리: {item.statusLabel}</span><span>검토: {item.reviewLabel}</span></p>
    {active && item.progress != null && <label className="mt-3 block text-caption">서버 문서 처리 {item.progress}%<progress className="mt-2 block w-full" max={100} value={item.progress} /></label>}
    {status.isError && <div role="alert" className="mt-3 text-body">{documentError(status.error)}<button className={`mt-2 ${secondaryButton}`} onClick={() => { void status.refetch(); }}>상태 다시 조회</button></div>}
    <p className="document-date text-caption text-muted">{item.uploadedLabel}</p>
    {typeIssue && <DocumentTypeResolution key={typeIssue.code} dto={dto} issue={typeIssue} />}
    {item.processingStatus === "FAILED" && <div className="mt-3"><p className="break-all text-body">{processingErrorMessage(item.errorCode)}</p>{retryCaseId ? <button className={`mt-2 ${secondaryButton}`} disabled={mutation.isPending} onClick={async () => { setError(""); try { await mutation.mutateAsync({ type: "retry", caseId: retryCaseId, documentId: dto.documentId }); } catch (e) { setError(documentError(e)); } }}>문서 재처리</button> : <p className="text-caption">실패 재처리는 내역에 연결한 뒤 사용할 수 있습니다.</p>}</div>}
    {error && <p role="alert" className="mt-3">{error}</p>}
    <details className="document-management mt-3"><summary className="cursor-pointer text-body font-bold">자료 관리 상세</summary>
    <Link className="mt-2 inline-flex min-h-11 items-center break-all text-body underline" href={`/workplaces/${dto.workplaceId}/documents`}>{dto.workplaceName ?? `근무지 #${dto.workplaceId}`} 자료함</Link>
    {dto.linkedCaseIds === undefined ? <p className="text-caption text-muted">연결 내역 정보 미제공</p> : <div className="text-caption"><p>연결 내역 {dto.linkedCaseIds.length}개</p><div className="flex flex-wrap gap-x-3">{dto.linkedCaseIds.slice(0, visibleLinks).map(id => <Link className="inline-flex min-h-11 items-center underline" key={id} href={`/cases/${id}/upload`}>내역 #{id}</Link>)}</div>{dto.linkedCaseIds.length > visibleLinks && <button className={secondaryButton} onClick={() => setVisibleLinks(n => n + 5)}>연결 내역 더 보기</button>}</div>}
    {caseId&&<Link className={`mt-3 ${secondaryButton}`} href={`/cases/${caseId}/review?documentId=${dto.documentId}`}>원문·추출값 검토</Link>}
    {caseId && !link && <p className="mt-3 text-caption text-muted">연결 목적·기간 정보가 제공되지 않아 연결 정보를 수정할 수 없습니다.</p>}
    {link && <div className="mt-3 break-words text-body"><p>이 내역에 연결됨 · 목적: {link.purpose}</p><p>적용기간: {link.applicableFrom ?? "시작 미지정"} ~ {link.applicableTo ?? "종료 미지정"}</p></div>}

    {selectableCaseId && inputVersion ? <div className="mt-auto pt-4">{!editing && <button className={secondaryButton} disabled={!canConnect || dto.linkedCaseIds?.includes(selectableCaseId)} onClick={() => { setEditing(true); onEditingChange?.(true); }}>{dto.linkedCaseIds?.includes(selectableCaseId) ? "이미 연결됨" : "기존 원본 선택"}</button>}
      {editing && <LinkForm caseId={selectableCaseId} documentId={dto.documentId} inputVersion={inputVersion} onDone={() => { setEditing(false); onEditingChange?.(false); }} />}</div> : <>
      {caseId && link && inputVersion && <div className="mt-4">{!editing && <button className={secondaryButton} onClick={() => { setEditing(true); onEditingChange?.(true); }}>연결 정보 수정</button>}{editing && <LinkForm caseId={caseId} documentId={dto.documentId} link={link} inputVersion={inputVersion} onDone={() => { setEditing(false); onEditingChange?.(false); }} />}</div>}
      <div className="mt-auto"><DocumentActions dto={dto} caseId={caseId} inputVersion={inputVersion} /></div>
    </>}
    </details>
  </article>;
}
