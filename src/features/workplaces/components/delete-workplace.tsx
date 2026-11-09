"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { dangerButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";

import { useDeleteWorkplace, useWorkplace } from "../queries";
import { QueryFeedback } from "@/components/ui/query-feedback";

function DeleteWorkplaceDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useWorkplace(id, true);
  const mutation = useDeleteWorkplace(id);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const checkId = useId();
  const router = useRouter();
  const busy = mutation.isPending || done;
  return (
    <ConfirmDialog title="근무지 삭제 요청" onClose={onClose} busy={busy} action={<button type="button" className={dangerButton} disabled={!checked || !query.isSuccess || query.isFetching || busy} onClick={async () => {
      try { await mutation.mutateAsync(); setDone(true); router.replace("/workplaces"); } catch { /* Mutation error is shown below. */ }
    }}>{busy ? "처리 중…" : "근무지 삭제 요청"}</button>}>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        <p><strong>{query.data.name}</strong>에 등록된 급여 사례는 {query.data.caseCount}개입니다.</p>
        <p>연결된 사례나 자료가 있으면 삭제가 제한될 수 있습니다. 필요한 자료를 확인한 뒤 삭제를 요청해 주세요.</p>
        <p>다른 사례에 필요한 문서 원본과 자료를 먼저 확인해 주세요. 삭제가 제한되면 연결된 사례를 확인해 주세요.</p>
      </>}
      {mutation.isError && <p role="alert" className="rounded-control bg-danger-soft p-3">{businessErrorMessage(mutation.error)}</p>}
      <label htmlFor={checkId} className="flex min-h-11 items-start gap-3"><input id={checkId} type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={busy} />삭제 영향과 연결된 자료를 확인했습니다.</label>
    </ConfirmDialog>
  );
}
export function DeleteWorkplace({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={dangerButton} onClick={() => setOpen(true)}>근무지 삭제</button>{open && <DeleteWorkplaceDialog id={id} onClose={() => setOpen(false)} />}</>;
}
