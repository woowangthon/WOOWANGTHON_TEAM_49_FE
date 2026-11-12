"use client";
import { translate } from "@/i18n/translate";


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
    <ConfirmDialog title={translate("workplaces.deleteWorkplace_workplace_delete_request")} onClose={onClose} busy={busy} action={<button type="button" className={dangerButton} disabled={!checked || !query.isSuccess || query.isFetching || busy} onClick={async () => {
      try { await mutation.mutateAsync(); setDone(true); router.replace("/workplaces"); } catch { /* Mutation error is shown below. */ }
    }}>{busy ? translate("workplaces.deleteWorkplace_processing") : translate("workplaces.deleteWorkplace_workplace_delete_request")}</button>}>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        <p><strong>{query.data.name}</strong>{translate("workplaces.deleteWorkplace_create_wageCase")}{query.data.caseCount}{translate("workplaces.deleteWorkplace_p2")}</p>
        <p>{translate("workplaces.deleteWorkplace_link_case_record_delete_count_required_confirm")}</p>
        <p>{translate("workplaces.deleteWorkplace_case_required_document_original_record_confirm_delete")}</p>
      </>}
      {mutation.isError && <p role="alert" className="rounded-control bg-danger-soft p-3">{businessErrorMessage(mutation.error)}</p>}
      <label htmlFor={checkId} className="flex min-h-11 items-start gap-3"><input id={checkId} type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={busy} />{translate("workplaces.deleteWorkplace_delete_impact_link_record_confirm")}</label>
    </ConfirmDialog>
  );
}
export function DeleteWorkplace({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={dangerButton} onClick={() => setOpen(true)}>{translate("workplaces.deleteWorkplace_workplace_delete")}</button>{open && <DeleteWorkplaceDialog id={id} onClose={() => setOpen(false)} />}</>;
}
