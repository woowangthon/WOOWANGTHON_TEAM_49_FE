import { secondaryButton } from "./styles";

export function Pagination({ page, size, total, onPage, busy = false }: { page: number; size: number; total: number; onPage: (page: number) => void; busy?: boolean }) {
  const last = Math.max(1, Math.ceil(total / size));
  return (
    <nav aria-label="페이지 이동" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" className={secondaryButton} disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>이전</button>
      <p role="status" className="text-body text-muted">{page} / {last} 페이지 · 총 {total}개</p>
      <button type="button" className={secondaryButton} disabled={busy || page >= last} onClick={() => onPage(page + 1)}>다음</button>
    </nav>
  );
}
