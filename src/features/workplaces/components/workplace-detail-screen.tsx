"use client";
import { translate } from "@/i18n/translate";


import { PaymentScreen } from "@/features/payments/payment-screen";
import Link from "next/link";
import { useState } from "react";

import { Plus } from "lucide-react";
import { WorkplaceHeader } from "./workplace-header";
import styles from "./workplace-space.module.css";
import explorer from "@/features/cases/components/case-explorer.module.css";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { CaseList } from "@/features/cases/components/case-list";

import { useWorkplace, useWorkplaceRemoval } from "../queries";
import { workplaceCard } from "../view-models";
import { DeleteWorkplace } from "./delete-workplace";
import { WorkplaceForm } from "./workplace-form";

export function WorkplaceDetailScreen({ id }: { id: number }) {
  const query = useWorkplace(id);
  const removal = useWorkplaceRemoval(id);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (removal.removed) return <section className={cardStyle}><h1 className="text-title font-bold">{translate("workplaces.workplaceDetailScreen_workplace_delete_request_count")}</h1><Link href="/workplaces" className={`mt-4 ${secondaryButton}`}>{translate("workplaces.workplaceDetailScreen_workplace_list_navigate")}</Link></section>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  const workplace = workplaceCard(query.data);
  return (
    <div className={styles.screen}>
      <div className={styles.overviewHero}><p className={styles.eyebrow}>{translate("workplaces.workplaceDetailScreen_workplace_wage")}</p><WorkplaceHeader id={id} workplace={query.data} active="cases">
      <details className={styles.manage}>
        <summary>{translate("workplaces.workplaceDetailScreen_workplace")}</summary>
        <section className={styles.managePanel} aria-label={translate("workplaces.workplaceDetailScreen_workplace_information")}>
          {editing ? <WorkplaceForm initial={query.data} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => setEditing(false)} /> : <div className={styles.manageActions}><button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}>{translate("workplaces.workplaceDetailScreen_workplace_edit")}</button><DeleteWorkplace id={id} /></div>}
        </section>
      </details>
      </WorkplaceHeader><p>{translate("workplaces.workplaceDetailScreen_workplace_wage_period_review")}</p></div>
      <section className={explorer.panel}><div className={styles.sectionHead}><div><h2>{translate("workplaces.workplaceDetailScreen_wage_confirm_case")}</h2><p>{translate("workplaces.workplaceDetailScreen_div5", { value1: workplace.name, value2: workplace.caseCount })}</p></div><Link href={`/cases/new?workplaceId=${id}`} className={styles.create}><Plus size={17} aria-hidden="true" />{translate("workplaces.workplaceDetailScreen_new_wageCase")}</Link></div>
      <CaseList workplaceId={id} />
      </section>
      {saved && <p role="status" className="rounded-control bg-success-soft p-4 text-body">{translate("workplaces.workplaceDetailScreen_workplace_information_save")}</p>}
      <details className={styles.payment}><summary>{translate("workplaces.workplaceDetailScreen_workplace_payment_transaction")}</summary><PaymentScreen workplaceId={id}/></details>
    </div>
  );
}
