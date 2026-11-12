"use client";

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
  if (removal.removed) return <section className={cardStyle}><h1 className="text-title font-bold">근무지 삭제 요청이 접수되었습니다</h1><Link href="/workplaces" className={`mt-4 ${secondaryButton}`}>근무지 목록으로 이동</Link></section>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  const workplace = workplaceCard(query.data);
  return (
    <div className={styles.screen}>
      <div className={styles.overviewHero}><p className={styles.eyebrow}>나의 근무지 · 급여 기록</p><WorkplaceHeader id={id} workplace={query.data} active="cases">
      <details className={styles.manage}>
        <summary>근무지 관리</summary>
        <section className={styles.managePanel} aria-label="근무지 정보 관리">
          {editing ? <WorkplaceForm initial={query.data} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => setEditing(false)} /> : <div className={styles.manageActions}><button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}>근무지 수정</button><DeleteWorkplace id={id} /></div>}
        </section>
      </details>
      </WorkplaceHeader><p>이 근무지의 급여를 기간별로 모아 보고, 하던 검토를 이어가세요.</p></div>
      <section className={explorer.panel}><div className={styles.sectionHead}><div><h2>급여 확인 내역</h2><p>{workplace.name} · {workplace.caseCount}개</p></div><Link href={`/cases/new?workplaceId=${id}`} className={styles.create}><Plus size={17} aria-hidden="true" />새 급여 내역</Link></div>
      <CaseList workplaceId={id} />
      </section>
      {saved && <p role="status" className="rounded-control bg-success-soft p-4 text-body">근무지 정보를 저장했습니다.</p>}
      <details className={styles.payment}><summary>근무지 지급 거래 관리</summary><PaymentScreen workplaceId={id}/></details>
    </div>
  );
}
