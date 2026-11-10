import Link from "next/link";
import type { CaseListDto } from "../schemas";
import { caseCard } from "../view-models";

export function caseTaskHref(dto: CaseListDto) {
  const paths = { UPLOAD: "upload", REVIEW: "review", CONDITIONS: "conditions", COMPARE: "compare", RESULT: "result" };
  return `/cases/${dto.caseId}${dto.currentStep ? `/${paths[dto.currentStep]}` : ""}`;
}

export function CaseCards({ items, compact = false }: { items: CaseListDto[]; compact?: boolean }) {
  return <ul className={`case-rows ${compact ? "case-rows-compact" : ""}`}>
    {items.map(dto => {
      const card = caseCard(dto);
      return <li key={card.id} className="case-row">
        <div className="min-w-0"><h3 className="font-bold"><Link href={`/cases/${card.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{card.workplaceName}</Link></h3><p className="text-caption text-muted">{card.period}</p><p className="text-caption text-muted">{card.payType}</p></div>
        <div className="min-w-0 space-y-2"><span className="inline-block rounded-control bg-neutral-soft px-3 py-1 text-caption font-bold">{card.status}</span><p className="text-caption text-muted">{card.attention}</p></div>
        <div className="min-w-0"><p className="text-caption text-muted">현재 작업: {card.step}</p><Link href={caseTaskHref(dto)} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">사례 이어가기 →</Link></div>
      </li>;
    })}
  </ul>;
}
