"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { dangerButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";

import { useCaseImpact, useDeleteCase } from "../queries";

function DeleteCaseDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useCaseImpact(id);
  const mutation = useDeleteCase(id);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const checkId = useId();
  const router = useRouter();
  const busy = mutation.isPending || done;
  const safe = query.isSuccess && !query.data.willDeleteSharedOriginals && query.data.willRevokeCaseAccessImmediately;
  return (
    <ConfirmDialog title="급여 사례 삭제" onClose={onClose} busy={busy} action={<button type="button" className={dangerButton} disabled={!checked || !safe || query.isFetching || busy} onClick={async () => {
      try { await mutation.mutateAsync(); setDone(true); router.replace("/cases"); } catch { /* Mutation error is shown below. */ }
    }}>{busy ? "삭제 중…" : "사례 삭제 확인"}</button>}>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        <dl className="grid grid-cols-2 gap-3"><dt>연결된 문서</dt><dd>{query.data.linkedDocumentCount}개</dd><dt>공유 문서</dt><dd>{query.data.sharedDocumentCount}개</dd><dt>보고서</dt><dd>{query.data.reportCount}개</dd></dl>
        {query.data.willDeleteSharedOriginals ? <p role="alert">문서 원본의 삭제 영향이 안전하게 확인되지 않았습니다. 이 화면에서는 삭제를 진행할 수 없습니다.</p> : <p>근무지의 원본 문서는 보존됩니다. 다른 사례에서 다시 사용할 수 있습니다.</p>}
        <p>{query.data.willUnlinkSharedDocuments ? "공유 문서는 이 사례와의 연결이 해제됩니다." : "공유 문서 연결 해제 대상이 없습니다."}</p>
        <p>{query.data.willRevokeCaseAccessImmediately ? "삭제하면 이 사례와 보고서에 즉시 접근할 수 없게 됩니다." : "접근 차단 시점이 즉시로 확인되지 않았습니다."}</p>
      </>}
      {mutation.isError && <p role="alert" className="rounded-control bg-danger-soft p-3">{businessErrorMessage(mutation.error)}</p>}
      <label htmlFor={checkId} className="flex min-h-11 items-start gap-3"><input id={checkId} type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={busy} />삭제 영향과 사례 접근 차단을 확인했습니다.</label>
    </ConfirmDialog>
  );
}
export function DeleteCase({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={dangerButton} onClick={() => setOpen(true)}>사례 삭제</button>{open && <DeleteCaseDialog id={id} onClose={() => setOpen(false)} />}</>;
}
