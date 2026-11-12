"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, FolderOpen, House, ListChecks, LogOut, Plus, Search, Settings, Building2, type LucideIcon } from "lucide-react";
import { useAppServices } from "@/hooks/use-app-services";
import { useWorkplaces } from "@/features/workplaces/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { Pagination } from "@/components/ui/pagination";

export function WorkspaceNavigation() {
  const { auth } = useAppServices();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const query = useWorkplaces(page);
  const link = (href: string, label: string, exact = false, Icon?: LucideIcon, extra = "") => <Link href={href} aria-current={(pathname === href || (!exact && pathname.startsWith(`${href}/`))) ? "page" : undefined} className={`workspace-nav-link ${extra}`}>{Icon && <Icon aria-hidden="true" className="workspace-nav-icon" />}<span>{label}</span></Link>;
  return <div className="workspace-navigation">
    {link("/cases/new", "새 검토", true, Plus, "workspace-new-review")}
    <div className="workspace-primary-nav">{link("/dashboard", "내 홈", false, House)}{link("/employers", "사업장 찾기", false, Search)}{link("/library", "전체 자료함", false, FolderOpen)}</div>
    <section aria-label="내 근무지 탐색" className="space-y-2">
      <div className="workspace-section-label"><h2>내 근무지</h2>{query.data && <span>{query.data.total}곳</span>}</div>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {query.data.items.length === 0 && <p className="px-3 text-caption text-muted">등록된 근무지가 없습니다.</p>}
        {query.data.items.map(item => <details key={item.workplaceId} open={pathname.startsWith(`/workplaces/${item.workplaceId}/`) || pathname === `/workplaces/${item.workplaceId}`} className="workspace-tree">
          <summary><span aria-hidden="true" className="workspace-place-icon">{Array.from(item.name)[0]}</span><span className="workspace-place-copy"><strong>{item.name}</strong><small>{item.employmentStatus === "CURRENT" ? "재직 중" : "퇴사"} · 급여 사례 {item.caseCount}개</small></span><ChevronRight aria-hidden="true" className="workspace-chevron" /></summary>
          <div className="workspace-place-children">{link(`/workplaces/${item.workplaceId}`, "개요 · 급여 사례", true)}{link(`/workplaces/${item.workplaceId}/documents`, "자료")}{link(`/workplaces/${item.workplaceId}/chats`, "AI 자료 도우미")}</div>
        </details>)}
        {query.data.total > query.data.size && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} onPage={setPage} busy={query.isFetching} />}
      </>}
      <div className="workspace-management-nav">{link("/workplaces", "근무지 전체 목록", true, Building2)}{link("/cases", "급여 사례 전체 목록", true, ListChecks)}{link("/workplaces/new", "근무지 등록", true, Plus)}</div>
    </section>
    <div className="workspace-nav-footer">{link("/settings", "계정 설정", false, Settings)}<button type="button" onClick={() => { void auth.logout(); }} className="workspace-nav-link w-full text-left"><LogOut aria-hidden="true" className="workspace-nav-icon" />로그아웃</button></div>
  </div>;
}
