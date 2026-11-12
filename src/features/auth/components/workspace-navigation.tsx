"use client";
import { translate } from "@/i18n/translate";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, FolderOpen, House, MessagesSquare, LogOut, Plus, Settings, type LucideIcon } from "lucide-react";
import { useAppServices } from "@/hooks/use-app-services";
import { useWorkplaces } from "@/features/workplaces/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { Pagination } from "@/components/ui/pagination";

export function WorkspaceNavigation() {
  const { auth } = useAppServices();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const query = useWorkplaces(page);
  const link = (href: string, label: string, exact = false, Icon?: LucideIcon, extra = "") => <Link href={href} aria-current={(pathname === href || (!exact && pathname.startsWith(`${href}/`)) || (href === "/consultation" && (pathname === "/consultation-centers" || /^\/cases\/\d+\/(questions|company-inquiry|reports)$/.test(pathname)))) ? "page" : undefined} className={`workspace-nav-link ${extra}`}>{Icon && <Icon aria-hidden="true" className="workspace-nav-icon" />}<span>{label}</span></Link>;
  return <div className="workspace-navigation">
    {link("/cases/new", translate("auth.workspaceNavigation_newWage"), true, Plus, "workspace-new-review")}
    <div className="workspace-primary-nav">{link("/dashboard", translate("auth.workspaceNavigation_div2"), false, House)}{link("/library", translate("auth.workspaceNavigation_library"), false, FolderOpen)}{link("/consultation", translate("auth.workspaceNavigation_consultation"), false, MessagesSquare)}{link("/workplaces/new", translate("auth.workspaceNavigation_workplace_create"), true, Plus)}</div>
    <section aria-label={translate("auth.workspaceNavigation_workplace")} className="space-y-2">
      <div className="workspace-section-label"><h2>{translate("auth.workspaceNavigation_workplace_2")}</h2>{query.data && <span>{translate("auth.workspaceNavigation_div7", { value1: query.data.total })}</span>}</div>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {query.data.items.length === 0 && <p className="px-3 text-caption text-muted">{translate("auth.workspaceNavigation_create_workplace_empty")}</p>}
        {query.data.items.map(item => <details key={item.workplaceId} open={pathname.startsWith(`/workplaces/${item.workplaceId}/`) || pathname === `/workplaces/${item.workplaceId}`} className="workspace-tree">
          <summary><span aria-hidden="true" className="workspace-place-icon">{Array.from(item.name)[0]}</span><span className="workspace-place-copy"><strong>{item.name}</strong><small>{translate("auth.workspaceNavigation_wageCase", { value1: item.employmentStatus === "CURRENT" ? translate("auth.workspaceNavigation_employed") : translate("auth.workspaceNavigation_employmentEnd"), value2: item.caseCount })}</small></span><ChevronRight aria-hidden="true" className="workspace-chevron" /></summary>
          <div className="workspace-place-children">{link(`/workplaces/${item.workplaceId}`, translate("auth.workspaceNavigation_wage_confirm_case"), true)}{link(`/workplaces/${item.workplaceId}/chats`, translate("auth.workspaceNavigation_record_assistant"))}</div>
        </details>)}
        {query.data.total > query.data.size && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} onPage={setPage} busy={query.isFetching} />}
      </>}
    </section>
    <div className="workspace-nav-footer">{link("/settings", translate("auth.accountScreens_account_settings"), false, Settings)}<button type="button" onClick={() => { void auth.logout(); }} className="workspace-nav-link w-full text-left"><LogOut aria-hidden="true" className="workspace-nav-icon" />{translate("auth.accountScreens_logout")}</button></div>
  </div>;
}
