"use client";
import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";

import { useWorkplaces } from "../queries";

export function WorkplacePicker({ value, onChange, action }: { action?: ReactNode; value: number | null; onChange: (id: number, name: string) => void }) {
 const {translate} = useTranslation();

  const [page, setPage] = useState(1);
  const id = useId();
  const query = useWorkplaces(page);
  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-4 text-title font-bold">{translate("workplaces.workplacePicker_workplace_select")}</legend>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {query.data.items.length === 0 && <p className="text-body">{translate("workplaces.workplacePicker_create_workplace_empty")}</p>}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {query.data.items.map((item) => <label key={item.workplaceId} className="flex min-w-0 items-start gap-3 rounded-control border border-border p-4 text-body"><input type="radio" name={`${id}-workplace`} className="mt-1 size-5 shrink-0" value={item.workplaceId} checked={value === item.workplaceId} onChange={() => onChange(item.workplaceId, item.name)} /><span className="min-w-0">{item.name}</span></label>)}
        </div>
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} onPage={(next) => { setPage(next); }} busy={query.isFetching} />
      </>}
      <div className="flex flex-wrap items-center gap-2"><Link href="/workplaces/new" className={secondaryButton}>{translate("workplaces.workplacePicker_new_workplace_create")}</Link>{action}</div>
    </fieldset>
  );
}
