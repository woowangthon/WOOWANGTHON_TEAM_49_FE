"use client";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { dangerButton, secondaryButton } from "@/components/ui/styles";
import { useCase } from "@/features/cases/queries";
import { ApiError } from "@/lib/api/error";
import { useDocumentAction, useDocumentImpact } from "../queries";
import { documentError } from "../view-models";
import type { DocumentDto } from "../schemas";

function OriginalDeletion({ dto, onClose }: { dto: DocumentDto; onClose: () => void }) {
  const impact = useDocumentImpact(dto.workplaceId, dto.documentId);
  const mutation = useDocumentAction();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const data = impact.data;
  return <ConfirmDialog title="공유 원본 삭제 영향 확인" busy={mutation.isPending} onClose={onClose} action={<button className={dangerButton} disabled={!checked || !data?.canDeleteOriginal || impact.isFetching || impact.isError || stale || mutation.isPending} onClick={async () => {
    try { await mutation.mutateAsync({ type: "remove", workplaceId: dto.workplaceId, documentId: dto.documentId }); onClose(); }
    catch (e) { setError(documentError(e)); setChecked(false); setStale(true); }
  }}>공유 원본 삭제 요청</button>}>
    <p className="break-all font-bold">{dto.fileName}</p>
    {impact.isPending ? <QueryFeedback pending /> : impact.isError ? <QueryFeedback error={impact.error} retry={() => { void impact.refetch(); }} /> : data && <>
      <p>이 원본을 참조하는 사례: {data.linkedCaseCount}개</p>
      <div className="flex flex-wrap gap-2">{data.linkedCaseIds.map(id => <Link key={id} className="underline" href={`/cases/${id}`}>사례 #{id}</Link>)}</div>
      <p>원본 삭제는 모든 연결 사례와 과거 보고서·검사 경로의 원본 접근에 영향을 줍니다. 특정 사례에서만 빼려면 연결 해제를 이용하세요. 외부에 다운로드한 파일은 회수되지 않습니다.</p>
      <p>삭제 접수는 자동 물리 파기 완료를 뜻하지 않습니다.</p>
      {!data.canDeleteOriginal && <p role="alert">서버가 원본 삭제를 허용하지 않았습니다. {data.reasonCode}</p>}
      <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={mutation.isPending || stale} /><span>모든 사례에 미치는 영향을 확인했으며 공유 원본 삭제를 요청합니다.</span></label>
    </>}
    {error && <p role="alert">{error}</p>}
    {stale && <button type="button" className={secondaryButton} onClick={async () => { const result = await impact.refetch(); if (!result.isError) { setStale(false); setError(""); } }}>삭제 영향 다시 확인</button>}
  </ConfirmDialog>;
}
function UnlinkConfirmation({ dto, caseId, version, onClose }: { dto: DocumentDto; caseId: number; version: number; onClose: () => void }) {
  const mutation = useDocumentAction();
  const latest = useCase(caseId);
  const [inputVersion, setInputVersion] = useState(version);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  return <ConfirmDialog title="이 사례에서 연결 해제" busy={mutation.isPending} onClose={onClose} action={<button className={dangerButton} disabled={conflict || mutation.isPending} onClick={async () => {
    if (!dto.link) return;
    try { await mutation.mutateAsync({ type: "unlink", caseId, linkId: dto.link.linkId, expectedInputVersion: inputVersion }); onClose(); }
    catch (e) { setError(documentError(e)); if (e instanceof ApiError && e.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true); }
  }}>연결만 해제</button>}>
    <p className="break-all">{dto.fileName}</p><p>이 사례의 연결과 적용 정보만 해제합니다. 근무지 공유 원본과 다른 사례의 연결은 보존됩니다.</p>
    {error && <p role="alert">{error}</p>}
    {conflict && <button type="button" className={secondaryButton} disabled={latest.isFetching} onClick={async () => { const result = await latest.refetch(); if (result.data && !result.isError) { setInputVersion(result.data.inputVersion); setConflict(false); setError(""); } }}>최신 사례 확인 후 다시 선택</button>}
  </ConfirmDialog>;
}
export function DocumentActions({ dto, caseId, inputVersion }: { dto: DocumentDto; caseId?: number; inputVersion?: number }) {
  const [mode, setMode] = useState<"remove" | "unlink">();
  return <><div className="mt-4 flex flex-wrap gap-2">
    {caseId && dto.link && inputVersion && <button type="button" className={secondaryButton} onClick={() => setMode("unlink")}>이 사례 연결 해제</button>}
    <button type="button" className={dangerButton} onClick={() => setMode("remove")}>공유 원본 삭제</button>
  </div>
  {mode === "remove" && <OriginalDeletion dto={dto} onClose={() => setMode(undefined)} />}
  {mode === "unlink" && caseId && inputVersion && <UnlinkConfirmation dto={dto} caseId={caseId} version={inputVersion} onClose={() => setMode(undefined)} />}</>;
}
