import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkplaceDto } from "../schemas";
import { workplaceCard } from "../view-models";
import styles from "./workplace-space.module.css";

export function WorkplaceHeader({ id, workplace, active, compact = false, children }: {
  id: number; workplace?: WorkplaceDto; active: "cases" | "documents" | "chats"; compact?: boolean; children?: ReactNode;
}) {
  const item = workplace ? workplaceCard(workplace) : undefined;
  const name = item?.name ?? `근무지 #${id}`;
  return <header className={styles.header} data-compact={compact}>
    <div className={styles.utility}><Link href="/workplaces" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />근무지 목록</Link>{children}</div>
    <div className={styles.identity}>
      <span className={styles.icon} aria-hidden="true"><Building2 size={28} strokeWidth={1.7} /></span>
      <div className={styles.heading}>
        <div className={styles.name}>{compact ? <p>{name}</p> : <h1>{name}</h1>}{item && <span className={styles.badge}>{item.employment}</span>}</div>
        {!compact && item && <p className={styles.meta}>{item.industry} · {item.region}</p>}
      </div>
    </div>
    {active !== "cases" && <nav className={styles.tabs} aria-label="근무지 화면">
      {([['cases', '', '급여 사례'], ['documents', '/documents', '자료함'], ['chats', '/chats', 'AI 도우미']] as const).map(([key, path, label]) => <Link key={key} href={`/workplaces/${id}${path}`} aria-current={active === key ? "page" : undefined}>{label}</Link>)}
    </nav>}
  </header>;
}
