"use client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import styles from "./case-workspace.module.css";
import { usePathname } from "next/navigation";
import { useCase } from "../queries";
import { caseCard } from "../view-models";
import { useDocuments } from "@/features/documents/queries";
export function TaskNavigation({ id }: { id: number }) {
  const pathname = usePathname();
  const query = useCase(id);
  const docs = useDocuments({kind: "case", id}, {page: 1, size: 100});
  const dto = query.data;
  const allReviewed = !!docs.data?.total && docs.data.items.length === docs.data.total && docs.data.items.every(d => d.reviewStatus === "CONFIRMED");
  const steps = [["", "개요", ""], ["upload", "자료 모으기", "UPLOAD"], ["review", "내용 확인", "REVIEW"], ["conditions", "조건 확인", "CONDITIONS"], ["result", "결과·자료 대조", "RESULT"]];
  const current = steps.findIndex(step => step[2] === (dto?.currentStep === "COMPARE" ? "RESULT" : dto?.currentStep));
  return <div className={styles.stickyNavigation}><nav aria-label="내역 작업" className={`case-task-navigation ${styles.navigation}`}>{steps.map(([path, label, step], index) => {
    const href = `/cases/${id}${path ? `/${path}` : ""}`;
    const active = pathname === href || (path === "upload" && pathname === `/cases/${id}/manual-records`);
    const status = !dto ? "상태 확인 중" : path === "" ? "전체 흐름" : path === "review" && allReviewed ? "✓ 검토 완료" : path === "review" && docs.data?.items.some(d => d.reviewStatus !== "CONFIRMED") ? "! 확인 필요" : path === "upload" && dto.documentCount > 0 ? `${dto.documentCount}개 등록` : path === "result" && dto.latestCalculationId !== null ? "결과 있음" : (dto.currentStep === step || (path === "result" && dto.currentStep === "COMPARE")) ? "현재 진행 단계" : index > current ? "진행 전" : "완료 여부 미확인";
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="workspace-nav-link border border-border"><span>{label}</span><small>{status}</small></Link>;
  })}</nav><p className={styles.navigationNote}>진행 단계와 검토 완료·검사 가능 여부는 달라요. 필요한 작업은 언제든 선택할 수 있어요.{dto?.attentionRequired && ` 확인할 항목 ${dto.attentionCount}개.`}</p></div>;
}
export function CaseContext({ id }: { id: number }) {
  const pathname = usePathname();
  const query = useCase(id);
  const item = query.data ? caseCard(query.data) : null;
  // The overview presents its own case header and the same task navigation.
  if (pathname === `/cases/${id}`) return null;
  return <section aria-label="현재 급여 내역" className={styles.context}>
    {item && <div className={styles.contextMeta}><div className={styles.contextIdentity}><Link href={`/workplaces/${query.data!.workplaceId}`} className="inline-flex min-h-11 items-center font-bold"><Building2 size={17} aria-hidden="true" />{item.workplaceName}</Link><p className="text-body text-muted">{item.period} · {item.payType}</p></div><p className={styles.contextStep}>현재 작업: {item.step}</p></div>}
  </section>;
}
