"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/use-translation";
import { secondaryButton } from "@/components/ui/styles";

export function SupportLinks({ caseId }: { caseId?: number }) {
  const { translate } = useTranslation();
  const pathname = usePathname();
  const links: ReadonlyArray<readonly [string, Parameters<typeof translate>[0]]> = [
    ["/consultation", "caseSupport.consultationScreen_consultation"],
    ...(caseId ? [
      [`/cases/${caseId}/questions`, "caseSupport.inquiryScreen_confirm_question"],
      [`/cases/${caseId}/company-inquiry`, "caseSupport.screens_company_inquiry_draft"],
      [`/cases/${caseId}/reports`, "caseSupport.screens_consultation_record"],
    ] as const : []),
    ["/consultation-centers", "caseSupport.inquiryScreen_consultationCenter"],
  ] as const;
  return <nav aria-label={translate("caseSupport.supportNavigation")} className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
    {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
      style={pathname === href ? {background:"var(--color-nav-active)",borderColor:"var(--color-accent)",color:"var(--color-nav-foreground)"} : undefined}
      className={`${secondaryButton} min-w-0 gap-2 [overflow-wrap:anywhere] ${pathname === href ? "border-accent bg-nav-active text-nav-foreground" : ""}`}>{translate(label)}</Link>)}
  </nav>;
}
