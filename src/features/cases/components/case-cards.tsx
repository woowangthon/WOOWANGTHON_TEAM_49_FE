import Link from "next/link";

import { cardStyle } from "@/components/ui/styles";

import type { CaseListDto } from "../schemas";
import { caseCard } from "../view-models";

export function CaseCards({ items }: { items: CaseListDto[] }) {
  return (
    <ul className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((dto) => {
        const card = caseCard(dto);
        return (
          <li key={card.id} className={cardStyle}>
            <div className="mb-4 flex flex-wrap gap-2 text-caption font-bold">
              <span className="rounded-control bg-neutral-soft px-3 py-1">{card.status}</span>
              {dto.attentionRequired === true && <span className="rounded-control bg-warning-soft px-3 py-1">확인 필요</span>}
            </div>
            <h3 className="text-title font-bold"><Link href={`/cases/${card.id}`} className="inline-flex min-h-11 min-w-11 items-center underline decoration-border underline-offset-4">{card.workplaceName}</Link></h3>
            <p className="mt-3 text-body font-medium">{card.period}</p>
            <p className="mt-2 text-body text-muted">{card.payType} · {card.step}</p>
            <p className="mt-3 text-caption text-muted">{card.attention}</p>
          </li>
        );
      })}
    </ul>
  );
}
