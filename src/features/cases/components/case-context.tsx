"use client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import styles from "./case-workspace.module.css";
import { usePathname } from "next/navigation";
import { useCase } from "../queries";
import { caseCard } from "../view-models";
export function TaskNavigation({ id }: { id: number }) {
  const pathname = usePathname();
  return <nav aria-label="사례 작업" className={`case-task-navigation ${styles.navigation}`}>{[["", "개요"], ["upload", "자료"], ["review", "검토"], ["conditions", "조건"], ["result", "결과"], ["questions", "상담 준비"]].map(([path, label]) => {
    const href = `/cases/${id}${path ? `/${path}` : ""}`;
    const active = pathname === href || (path === "upload" && pathname === `/cases/${id}/manual-records`) || (path === "result" && pathname === `/cases/${id}/compare`) || (path === "questions" && ["company-inquiry", "reports"].some(part => pathname === `/cases/${id}/${part}`));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="workspace-nav-link border border-border">{label}</Link>;
  })}</nav>;
}
export function CaseContext({ id }: { id: number }) {
  const pathname = usePathname();
  const query = useCase(id);
  const item = query.data ? caseCard(query.data) : null;
  // The overview presents its own case header and the same task navigation.
  if (pathname === `/cases/${id}`) return null;
  return <section aria-label="현재 급여 사례" className={styles.context}>
    {item && <div className={styles.contextMeta}><div className={styles.contextIdentity}><Link href={`/workplaces/${query.data!.workplaceId}`} className="inline-flex min-h-11 items-center font-bold"><Building2 size={17} aria-hidden="true" />{item.workplaceName}</Link><p className="text-body text-muted">{item.period} · {item.payType}</p></div><p className={styles.contextStep}>현재 작업: {item.step}</p></div>}
    <TaskNavigation id={id} />
  </section>;
}
