"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppServices } from "@/hooks/use-app-services";
import { useWorkplaces } from "@/features/workplaces/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { Pagination } from "@/components/ui/pagination";

export function WorkspaceNavigation() {
  const { auth } = useAppServices();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const query = useWorkplaces(page);
  const link = (href: string, label: string, exact = false) => <Link href={href} aria-current={(pathname === href || (!exact && pathname.startsWith(`${href}/`))) ? "page" : undefined} className="workspace-nav-link">{label}</Link>;
  return <div className="flex flex-1 flex-col gap-5">
    {link("/cases/new", "＋ 새 검토", true)}
    <div>{link("/dashboard", "내 홈")}{link("/library", "전체 자료함")}</div>
    <section aria-label="내 근무지 탐색" className="space-y-2">
      <h2 className="px-3 text-caption font-bold text-muted">내 근무지</h2>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {query.data.items.length === 0 && <p className="px-3 text-caption text-muted">등록된 근무지가 없습니다.</p>}
        {query.data.items.map(item => <details key={item.workplaceId} open={pathname.startsWith(`/workplaces/${item.workplaceId}/`) || pathname === `/workplaces/${item.workplaceId}`} className="workspace-tree">
          <summary className="px-3 font-bold">{item.name}</summary>
          <div className="ml-4 border-l border-border pl-2">{link(`/workplaces/${item.workplaceId}`, "개요 · 급여 사례", true)}{link(`/workplaces/${item.workplaceId}/documents`, "자료")}{link(`/workplaces/${item.workplaceId}/chats`, "AI 자료 도우미")}</div>
        </details>)}
        {query.data.total > query.data.size && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} onPage={setPage} busy={query.isFetching} />}
      </>}
      {link("/workplaces", "근무지 전체 목록", true)}{link("/cases", "급여 사례 전체 목록", pathname === "/cases/new")}{link("/workplaces/new", "＋ 근무지 등록", true)}
    </section>
    <div className="mt-auto border-t border-border pt-4">{link("/settings", "계정 설정")}<button type="button" onClick={() => { void auth.logout(); }} className="workspace-nav-link w-full text-left">로그아웃</button></div>
  </div>;
}
