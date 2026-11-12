"use client";
import { translate } from "@/i18n/translate";


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
    <ConfirmDialog title={translate("cases.deleteCase_wageCase_delete")} onClose={onClose} busy={busy} action={<button type="button" className={dangerButton} disabled={!checked || !safe || query.isFetching || busy} onClick={async () => {
      try { await mutation.mutateAsync(); setDone(true); router.replace("/cases"); } catch { /* Mutation error is shown below. */ }
    }}>{busy ? translate("cases.deleteCase_delete") : translate("cases.deleteCase_case_delete_confirm")}</button>}>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        <dl className="grid grid-cols-2 gap-3"><dt>{translate("cases.deleteCase_link_document")}</dt><dd>{translate("cases.deleteCase_dl2", { value1: query.data.linkedDocumentCount })}</dd><dt>{translate("cases.deleteCase_document")}</dt><dd>{translate("cases.deleteCase_dl2", { value1: query.data.sharedDocumentCount })}</dd><dt>{translate("cases.deleteCase_report")}</dt><dd>{translate("cases.deleteCase_dl2", { value1: query.data.reportCount })}</dd></dl>
        {query.data.willDeleteSharedOriginals ? <p role="alert">{translate("cases.deleteCase_document_original_delete_impact_confirm_progress_count")}</p> : <p>{translate("cases.deleteCase_workplace_original_document_case_retry_use_count")}</p>}
        <p>{query.data.willUnlinkSharedDocuments ? translate("cases.deleteCase_document_case_link_release") : translate("cases.deleteCase_document_link_release_empty")}</p>
        <p>{query.data.willRevokeCaseAccessImmediately ? translate("cases.deleteCase_delete_case_report_access_count_none") : translate("cases.deleteCase_access_confirm")}</p>
      </>}
      {mutation.isError && <p role="alert" className="rounded-control bg-danger-soft p-3">{businessErrorMessage(mutation.error)}</p>}
      <label htmlFor={checkId} className="flex min-h-11 items-start gap-3"><input id={checkId} type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={busy} />{translate("cases.deleteCase_delete_impact_case_access_confirm")}</label>
    </ConfirmDialog>
  );
}
export function DeleteCase({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={dangerButton} onClick={() => setOpen(true)}>{translate("cases.deleteCase_case_delete")}</button>{open && <DeleteCaseDialog id={id} onClose={() => setOpen(false)} />}</>;
}
