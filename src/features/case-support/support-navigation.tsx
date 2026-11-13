"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "zustand";
import { useAppServices } from "@/hooks/use-app-services";
import { useTranslation } from "@/i18n/use-translation";
import styles from "@/features/cases/components/case-workspace.module.css";

export function SupportLinks({ caseId }: { caseId?: number }) {
  const { translate } = useTranslation();
  const pathname = usePathname();
  const { consultationSelection } = useAppServices();
  const selected = useStore(consultationSelection, state => state.caseId);
  useEffect(() => {
    if (caseId !== undefined) consultationSelection.setState({ caseId });
  }, [caseId, consultationSelection]);
  const currentCase = caseId ?? selected;
  const caseHref = (path: string) => currentCase ? `/cases/${currentCase}/${path}` : "/consultation#consultation-case-selection";
  const links = [
    ["/consultation", "caseSupport.consultationScreen_consultation"],
    [caseHref("questions"), "caseSupport.inquiryScreen_confirm_question"],
    [caseHref("company-inquiry"), "caseSupport.screens_company_inquiry_draft"],
    [caseHref("reports"), "caseSupport.screens_consultation_record"],
    ["/consultation-centers", "caseSupport.inquiryScreen_consultationCenter"],
  ] as const;
  return <div className={styles.stickyNavigation}><nav aria-label={translate("caseSupport.supportNavigation")} className={`case-task-navigation ${styles.navigation}`}>
    {links.map(([href, label]) => <Link key={label} href={href} aria-current={pathname === href ? "page" : undefined}
      className="workspace-nav-link"><span>{translate(label)}</span></Link>)}
  </nav></div>;
}
