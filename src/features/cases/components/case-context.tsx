"use client";
import { translate } from "@/i18n/translate";

import Link from "next/link";
import { Building2 } from "lucide-react";
import styles from "./case-workspace.module.css";
import { usePathname } from "next/navigation";
import { useCase } from "../queries";
import { caseCard } from "../view-models";
import { useDocuments } from "@/features/documents/queries";
export function TaskNavigation({ id }: { id: number }) {
  const pathname = usePathname();
  const query = useCase(id);
  const docs = useDocuments({kind: "case", id}, {page: 1, size: 100});
  const dto = query.data;
  const allReviewed = !!docs.data?.total && docs.data.items.length === docs.data.total && docs.data.items.every(d => d.reviewStatus === "CONFIRMED");
  const steps = [["", translate("cases.caseContext_taskNavigation_steps"), ""], ["upload", translate("cases.caseContext_record"), "UPLOAD"], ["review", translate("cases.caseContext_content_confirm"), "REVIEW"], ["conditions", translate("cases.caseContext_confirm"), "CONDITIONS"], ["result", translate("cases.caseContext_result_record_comparison"), "RESULT"]];
  const current = steps.findIndex(step => step[2] === (dto?.currentStep === "COMPARE" ? "RESULT" : dto?.currentStep));
  return <div className={styles.stickyNavigation}><nav aria-label={translate("cases.caseContext_case")} className={`case-task-navigation ${styles.navigation}`}>{steps.map(([path, label, step], index) => {
    const href = `/cases/${id}${path ? `/${path}` : ""}`;
    const active = pathname === href || (path === "upload" && pathname === `/cases/${id}/manual-records`);
    const status = !dto ? translate("cases.caseContext_status_confirm") : path === "" ? translate("cases.caseContext_all") : path === "review" && allReviewed ? translate("cases.caseContext_review_complete") : path === "review" && docs.data?.items.some(d => d.reviewStatus !== "CONFIRMED") ? translate("cases.caseContext_confirm_required") : path === "upload" && dto.documentCount > 0 ? translate("cases.caseContext_create", { value1: dto.documentCount }) : path === "result" && dto.latestCalculationId !== null ? translate("cases.caseContext_result") : (dto.currentStep === step || (path === "result" && dto.currentStep === "COMPARE")) ? translate("cases.caseContext_current_progress_step") : index > current ? translate("cases.caseContext_progress") : translate("cases.caseContext_complete_confirm");
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="workspace-nav-link border border-border"><span>{label}</span><small>{status}</small></Link>;
  })}</nav></div>;
}
export function CaseContext({ id }: { id: number }) {
  const pathname = usePathname();
  const query = useCase(id);
  const item = query.data ? caseCard(query.data) : null;
  // The overview presents its own case header and the same task navigation.
  if (pathname === `/cases/${id}`) return null;
  return <section aria-label={translate("cases.caseContext_current_wageCase")} className={styles.context}>
    {item && <div className={styles.contextMeta}><div className={styles.contextIdentity}><Link href={`/workplaces/${query.data!.workplaceId}`} className="inline-flex min-h-11 items-center font-bold"><Building2 size={17} aria-hidden="true" />{item.workplaceName}</Link><p className="text-body text-muted">{item.period} · {item.payType}</p></div><p className={styles.contextStep}>{translate("cases.caseCards_current_2", { value1: item.step })}</p></div>}
  </section>;
}
