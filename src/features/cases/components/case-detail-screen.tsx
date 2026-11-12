"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, ChevronRight, CircleAlert, FileCheck2, FilePenLine, Files, FileUp, Info, Layers3, ListChecks, Pencil, ReceiptText, Settings2, WalletCards } from "lucide-react";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { DepositComparisonPanel } from "@/features/payments/comparison-panel";
import { PaymentScreen } from "@/features/payments/payment-screen";

import { useCase, useCaseRemoval } from "../queries";
import { caseCard } from "../view-models";
import { caseTaskHref } from "./case-cards";
import { TaskNavigation } from "./case-context";
import { CaseForm } from "./case-form";
import { DeleteCase } from "./delete-case";
import styles from "./case-detail.module.css";

const actions = [
  { path: "upload", label: "자료 등록·관리", description: "급여명세서와 근무 자료를 모아요", icon: FileUp, tone: "blue" },
  { path: "review", label: "원문·추출값 검토", description: "원문과 추출된 내용을 함께 확인해요", icon: FileCheck2, tone: "lavender" },
  { path: "manual-records", label: "수기 자료 입력·관리", description: "직접 기록한 근무 자료를 정리해요", icon: FilePenLine, tone: "neutral" },
  { path: "conditions", label: "계산 조건·실행 가능성", description: "계산에 필요한 조건을 살펴봐요", icon: Settings2, tone: "lavender" },
  { path: "result", label: "통합 결과", description: "계산 결과와 근거를 함께 살펴봐요", icon: ReceiptText, tone: "blue" },
  { path: "compare", label: "대조·합계 검사", description: "자료 사이의 차이와 합계를 확인해요", icon: ListChecks, tone: "neutral" },
] as const;

export function CaseDetailScreen({ id }: { id: number }) {
  const query = useCase(id);
  const removal = useCaseRemoval(id);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (removal.removed) return <div className={styles.screen}><section className={styles.panel}><h1 className="text-title font-bold">삭제된 급여 사례입니다</h1><Link href="/cases" className={`mt-4 ${secondaryButton}`}>급여 사례 목록으로 이동</Link></section></div>;
  if (query.isPending) return <div className={`${styles.screen} ${styles.feedback}`}><QueryFeedback pending /></div>;
  if (query.isError) return <div className={`${styles.screen} ${styles.feedback}`}><QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /></div>;
  const dto = query.data;
  const item = caseCard(dto);

  return (
    <div className={styles.screen}>
      <div className={styles.breadcrumb}>
        <Link href="/cases"><ArrowLeft size={17} aria-hidden="true" />급여 사례 목록</Link>
        <Link href={`/workplaces/${dto.workplaceId}`} className={styles.workplaceLink}><Building2 size={16} aria-hidden="true" />근무지 보기<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroLabel}>
            <span className={styles.heroIcon} aria-hidden="true"><Building2 size={27} strokeWidth={1.7} /></span>
            <dl><dt className="sr-only">사례 상태</dt><dd className={styles.status} data-case-status={dto.status}>{item.status}</dd></dl>
          </div>
          <h1>{item.workplaceName}<span>의 급여 사례</span></h1>
          <p className={styles.period}><CalendarDays size={17} aria-hidden="true" /><span><span className="sr-only">산정기간 </span>{item.period}</span></p>
          <p className={styles.heroDescription}>급여 기록부터 검토 결과까지, 이곳에서 이어가세요.</p>
        </div>
        <section className={styles.currentTask} aria-label="현재 작업">
          <div className={styles.taskLabel}><Layers3 size={19} aria-hidden="true" /><span>이어서 할 작업</span></div>
          <dl><dt className="sr-only">현재 작업 단계</dt><dd>{item.step}</dd></dl>
          <p>하던 작업부터 차근차근 이어가세요.</p>
          <Link href={caseTaskHref(dto)} className={styles.primaryAction}>이어서 검토하기<ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </header>

      <div className={styles.taskTabs}><TaskNavigation id={id} /></div>
      {saved && <p role="status" className={styles.saved}>사례 정보를 저장했습니다.</p>}

      <section aria-label="급여 사례 상세 정보">
        <div className={styles.sectionHead}><h2>사례 한눈에 보기</h2><p>이번 사례의 기본 정보예요</p></div>
        <dl className={styles.facts}>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><WalletCards size={21} /></span>급여 형태</dt><dd>{item.payType}</dd></div>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><CalendarDays size={21} /></span>약정 지급일</dt><dd data-missing={dto.scheduledPayDate === null}>{dto.scheduledPayDate ?? "미입력"}</dd></div>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><Files size={21} /></span>등록 문서</dt><dd>{dto.documentCount}<span className={styles.unit}>개</span></dd></div>
          <div className={styles.fact} data-attention={dto.attentionRequired}><dt><span className={styles.factIcon} aria-hidden="true"><CircleAlert size={21} /></span>추가 확인</dt><dd className={styles.attentionValue}>{item.attention}{dto.attentionRequired && <span className={styles.attentionCount}>{dto.attentionCount}개 항목</span>}</dd></div>
        </dl>
        <p className={styles.note}><Info size={16} aria-hidden="true" /><span>사례 상태와 작업 단계는 검사 준비 여부나 계산·대조 완료를 의미하지 않습니다.</span></p>
      </section>

      <details className={styles.otherTasks}>
        <summary>다른 작업으로 이동</summary><section aria-labelledby={`case-${id}-actions`}>
        <div className={styles.sectionHead}><h2 id={`case-${id}-actions`}>자료와 검토</h2><p>필요한 작업으로 바로 이동하세요</p></div>
        <nav className={styles.actions} aria-label="수기 자료와 계산 조건">
          {actions.map(({ path, label, description, icon: Icon, tone }) => (
            <Link key={path} href={`/cases/${id}/${path}`} className={styles.actionCard} aria-labelledby={`case-${id}-${path}-title`}>
              <span className={styles.actionIcon} data-tone={tone} aria-hidden="true"><Icon size={23} strokeWidth={1.7} /></span>
              <span className={styles.actionCopy}><strong id={`case-${id}-${path}-title`}>{label}</strong><span>{description}</span></span>
              <ChevronRight size={18} className={styles.actionArrow} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section></details>

      <details className={styles.otherTasks}><summary>입금 대조 확인</summary><div className={styles.comparison}><DepositComparisonPanel caseId={id} /></div></details>
      <details id="payments" className={styles.payments}>
        <summary><span className={styles.disclosureTitle}><WalletCards size={21} aria-hidden="true" />지급 거래·사례 배분 관리</span></summary>
        <p className={styles.paymentDescription}>근무지 원거래와 이 사례에 배분한 금액을 구분해 관리합니다. 접어도 입력 중인 값은 유지됩니다.</p>
        <div className={styles.paymentContent}><PaymentScreen workplaceId={dto.workplaceId} caseId={id} inputVersion={dto.inputVersion} /></div>
      </details>

      <section className={styles.management} aria-label="급여 사례 관리">
        {editing ? <>
          <div className={styles.sectionHead}><h2>사례 정보 수정</h2></div>
          <CaseForm initial={dto} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => { setEditing(false); }} />
        </> : <div className={styles.managementRow}>
          <div><h2>사례 설정</h2><p>급여 형태와 산정기간 등 기본 정보를 관리해요.</p></div>
          <div className={styles.managementActions}>
            <button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}><Pencil size={15} aria-hidden="true" />사례 수정</button>
            <DeleteCase id={id} />
          </div>
        </div>}
      </section>
    </div>
  );
}
