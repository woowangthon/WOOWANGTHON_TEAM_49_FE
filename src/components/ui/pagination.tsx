"use client";
import { useTranslation } from '@/i18n/use-translation';

import { secondaryButton } from "./styles";

export function Pagination({ page, size, total, onPage, busy = false }: { page: number; size: number; total: number; onPage: (page: number) => void; busy?: boolean }) {
 const {translate} = useTranslation();

  const last = Math.max(1, Math.ceil(total / size));
  return (
    <nav aria-label={translate("common.pagination_page_navigate")} className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" className={secondaryButton} disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>{translate("common.previous")}</button>
      <p role="status" className="text-body text-muted">{translate("common.pagination_page", { value1: page, value2: last, value3: total })}</p>
      <button type="button" className={secondaryButton} disabled={busy || page >= last} onClick={() => onPage(page + 1)}>{translate("common.next")}</button>
    </nav>
  );
}
