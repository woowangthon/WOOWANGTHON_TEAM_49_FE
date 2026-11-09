"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";

import { useWorkplaces } from "../queries";

export function WorkplacePicker({ value, onChange }: { value: number | null; onChange: (id: number) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const id = useId();
  const query = useWorkplaces(page);
  const filtered = query.data?.items.filter((item) => item.name.toLocaleLowerCase("ko").includes(search.trim().toLocaleLowerCase("ko")));
  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-4 text-title font-bold">근무지 선택</legend>
      <TextField id={id} label="현재 페이지의 근무지 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {query.data.items.length === 0 && <p className="text-body">등록된 근무지가 없습니다. 먼저 근무지를 등록해 주세요.</p>}
        {query.data.items.length > 0 && filtered?.length === 0 && <p className="text-body">현재 페이지에 검색 결과가 없습니다. 검색어를 바꾸거나 다른 페이지를 확인해 주세요.</p>}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {filtered?.map((item) => <label key={item.workplaceId} className="flex min-w-0 items-start gap-3 rounded-control border border-border p-4 text-body"><input type="radio" name={`${id}-workplace`} className="mt-1 size-5 shrink-0" value={item.workplaceId} checked={value === item.workplaceId} onChange={() => onChange(item.workplaceId)} /><span className="min-w-0">{item.name}</span></label>)}
        </div>
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} onPage={(next) => { setPage(next); setSearch(""); }} busy={query.isFetching} />
      </>}
      <Link href="/workplaces/new" className={secondaryButton}>새 근무지 등록</Link>
    </fieldset>
  );
}
