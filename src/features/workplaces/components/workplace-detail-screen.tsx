"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/components/ui/page-heading";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
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
    <div className="space-y-6">
      <Link href="/workplaces" className="inline-flex min-h-11 items-center text-body underline">근무지 목록</Link>
      <PageHeading title={workplace.name} description={`${workplace.industry} · ${workplace.region} · ${workplace.employment}`} action={<Link href={`/cases/new?workplaceId=${id}`} className={primaryButton}>이 근무지에서 사례 시작</Link>} />
      {saved && <p role="status" className="rounded-control bg-success-soft p-4 text-body">근무지 정보를 저장했습니다.</p>}
      <section className={cardStyle} aria-label="근무지 정보 관리">
        {editing ? <WorkplaceForm initial={query.data} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => setEditing(false)} /> : <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-body">등록된 급여 사례 {workplace.caseCount}개</p><div className="flex flex-wrap gap-3"><button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}>근무지 수정</button><DeleteWorkplace id={id} /></div></div>}
      </section>
      <Link href={`/workplaces/${id}/documents`} className={secondaryButton}>근무지 공유 자료함</Link>
      <h2 className="text-title font-extrabold">이 근무지의 급여 사례</h2>
      <CaseList workplaceId={id} />
    </div>
  );
}
