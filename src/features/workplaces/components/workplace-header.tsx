"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesWorkplacesViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkplaceDto } from "../schemas";

import styles from "./workplace-space.module.css";

export function WorkplaceHeader({ id, workplace, active, compact = false, children }: {
  id: number; workplace?: WorkplaceDto; active: "cases" | "documents" | "chats"; compact?: boolean; children?: ReactNode;
}) {
const {workplaceCard} = useLocalized(createLocalizedFeaturesWorkplacesViewModels);

 const {translate} = useTranslation();

  const item = workplace ? workplaceCard(workplace) : undefined;
  const name = item?.name ?? translate("workplaces.workplaceHeader_workplace", { value1: id });
  return <header className={styles.header} data-compact={compact}>
    <div className={styles.utility}><Link href="/workplaces" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />{translate("workplaces.workplaceHeader_workplace_list")}</Link>{children}</div>
    <div className={styles.identity}>
      <span className={styles.icon} aria-hidden="true"><Building2 size={28} strokeWidth={1.7} /></span>
      <div className={styles.heading}>
        <div className={styles.name}>{compact ? <p>{name}</p> : <h1>{name}</h1>}{item && <span className={styles.badge}>{item.employment}</span>}</div>
        {!compact && item && <p className={styles.meta}>{item.industry} · {item.region}</p>}
      </div>
    </div>
    {active === "documents" && <nav className={styles.tabs} aria-label={translate("workplaces.workplaceHeader_workplace_2")}>
      {([['cases', '', translate("workplaces.workplaceHeader_wageCase")], ['documents', '/documents', translate("workplaces.workplaceHeader_library")], ['chats', '/chats', translate("workplaces.workplaceHeader_assistant")]] as const).map(([key, path, label]) => <Link key={key} href={`/workplaces/${id}${path}`} aria-current={active === key ? "page" : undefined}>{label}</Link>)}
    </nav>}
  </header>;
}
