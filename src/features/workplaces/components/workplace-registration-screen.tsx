"use client";

import Link from "next/link";
import { ArrowLeft, Building2, FileCheck2 } from "lucide-react";
import { useTranslation } from "@/i18n/use-translation";
import { WorkplaceForm } from "./workplace-form";
import styles from "./workplace-registration.module.css";

export function WorkplaceRegistrationScreen() {
  const { translate } = useTranslation();
  return <div className={styles.screen}>
    <Link href="/workplaces" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />{translate("workplaces.workplaceHeader_workplace_list")}</Link>
    <header className={styles.hero}>
      <div><p className={styles.heroEyebrow}>{translate("workplaces.registrationEyebrow")}</p><h1>{translate("common.page_workplace_create")}</h1><p className={styles.heroLead}>{translate("common.page_previous_workplace_create_wageCase")}</p></div>
      <div className={styles.heroArt} aria-hidden="true"><Building2 size={56} strokeWidth={1.3} /><span><FileCheck2 size={24} /></span></div>
    </header>
    <WorkplaceForm registration />
  </div>;
}
