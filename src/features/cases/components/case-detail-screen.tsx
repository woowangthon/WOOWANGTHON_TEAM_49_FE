"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/components/ui/page-heading";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";

import { useCase, useCaseRemoval } from "../queries";
import { caseCard } from "../view-models";
import { CaseForm } from "./case-form";
import { DeleteCase } from "./delete-case";

export function CaseDetailScreen({ id }: { id: number }) {
  const query = useCase(id);
  const removal = useCaseRemoval(id);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (removal.removed) return <section className={cardStyle}><h1 className="text-title font-bold">삭제된 급여 사례입니다</h1><Link href="/cases" className={`mt-4 ${secondaryButton}`}>급여 사례 목록으로 이동</Link></section>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  const dto = query.data;
  const item = caseCard(dto);
  return (
    <div className="space-y-6">
      <Link href="/cases" className="inline-flex min-h-11 items-center text-body underline">급여 사례 목록</Link>
      <PageHeading title={`${item.workplaceName}의 급여 사례`} description={item.period} action={<Link href={`/workplaces/${dto.workplaceId}`} className={secondaryButton}>근무지 보기</Link>} />
      <section className={cardStyle} aria-label="급여 사례 상세 정보">
        <dl className="grid min-w-0 gap-x-8 gap-y-4 text-body sm:grid-cols-2 xl:grid-cols-3">
          <div><dt className="font-bold">급여 형태</dt><dd className="mt-1 text-muted">{item.payType}</dd></div>
          <div><dt className="font-bold">약정 지급일</dt><dd className="mt-1 text-muted">{dto.scheduledPayDate ?? "미입력"}</dd></div>
          <div><dt className="font-bold">사례 상태</dt><dd className="mt-1 text-muted">{item.status}</dd></div>
          <div><dt className="font-bold">현재 작업 단계</dt><dd className="mt-1 text-muted">{item.step}</dd></div>
          <div><dt className="font-bold">등록 문서</dt><dd className="mt-1 text-muted">{dto.documentCount}개</dd></div>
          <div><dt className="font-bold">추가 확인</dt><dd className="mt-1 text-muted">{item.attention}{dto.attentionRequired ? ` · ${dto.attentionCount}개 항목` : ""}</dd></div>
        </dl>
        <p className="mt-6 rounded-control bg-neutral-soft p-4 text-body">사례 상태와 작업 단계는 검사 준비 여부나 계산·대조 완료를 의미하지 않습니다.</p>
      </section>
      {saved && <p role="status" className="rounded-control bg-success-soft p-4 text-body">사례 정보를 저장했습니다.</p>}
      {<section className={cardStyle} aria-label="급여 사례 관리">{editing ? <CaseForm initial={dto} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => setEditing(false)} /> : <div className="flex flex-wrap gap-3"><Link href={`/cases/${id}/upload`} className={primaryButton}>자료 등록·관리</Link><Link href={`/cases/${id}/review`} className={secondaryButton}>원문·추출값 검토</Link><button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}>사례 수정</button><DeleteCase id={id} /></div>}</section>}
    </div>
  );
}
