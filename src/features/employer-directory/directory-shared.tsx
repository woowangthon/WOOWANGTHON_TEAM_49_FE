import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import type { Disclosure } from "./models";
import { disclosureLabels } from "./models";
import styles from "./directory.module.css";

export function ExampleNotice() {
  return <aside className={styles.example} aria-label="예시 데이터 안내">
    <Info size={18} aria-hidden="true" />
    <p><strong>화면 확인용 예시 데이터예요</strong><br />사업장·인원·공표 결과는 가상으로 구성했어요. 실제 업체 정보와 관계없어요.</p>
  </aside>;
}

export function DisclosureBadge({ value, wage = false }: { value: Disclosure; wage?: boolean }) {
  let label = disclosureLabels[value.status];
  if (wage && value.status === "listed") label = "명단공개 대상";
  if (wage && value.status === "not-listed") label = "명단공개 미대상";
  return <span className={styles.badge} data-status={value.status}>{label}</span>;
}

export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className={styles.sourceLink} href={href} target="_blank" rel="noopener noreferrer">
    {children}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (새 창)</span>
  </a>;
}

export function DirectoryUnavailable() {
  return <section className={styles.panel}>
    <h2>사업장 정보 연계를 준비하고 있어요</h2>
    <p className={styles.description}>기관 데이터와 사업장 식별정보가 확인되면 검색할 수 있어요.</p>
    <Link className={styles.primaryButton} href="/workplaces/new">내 근무지 직접 등록</Link>
  </section>;
}
