"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, FileCheck2, LockKeyhole, MapPin, Users } from "lucide-react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { DirectoryUnavailable, DisclosureBadge, ExampleNotice, SourceLink } from "./directory-shared";
import { officialSources, type Disclosure } from "./models";
import { useEmployerDirectory } from "./queries";
import styles from "./directory.module.css";

function DisclosureCard({ title, value, source, wage = false }: { title: string; value: Disclosure; source: string; wage?: boolean }) {
  return <article className={styles.disclosureCard}>
    <div className={styles.sectionHeading}><h3>{title}</h3><DisclosureBadge value={value} wage={wage} /></div>
    <p>{value.note}</p>
    {value.checkedOn && <p className={styles.referenceDate}>예시 확인일 {value.checkedOn}</p>}
    {value.publicationPeriod && <p className={styles.referenceDate}>{value.publicationPeriod}</p>}
    <SourceLink href={source}>공식 공표자료 확인하기</SourceLink>
  </article>;
}

export function EmployerDetailScreen({ employerId, backHref = "/employers" }: { employerId: string; backHref?: string }) {
  const query = useEmployerDirectory();
  const item = query.data?.items.find(employer => employer.id === employerId);
  const registrationContext = new URLSearchParams({ from: backHref });
  return <div className={styles.screen}>
    <Link href={backHref} className={styles.backLink}><ArrowLeft size={17} aria-hidden="true" />검색 결과로</Link>
    {query.isPending && <QueryFeedback pending />}
    {query.isError && <QueryFeedback error={query.error} retry={() => void query.refetch()} />}
    {query.data && !query.data.example && <DirectoryUnavailable />}
    {query.data?.example && !item && <section className={styles.panel}>
      <h1>사업장 정보를 찾을 수 없어요</h1><p className={styles.description}>검색 결과에서 사업장을 다시 선택해 주세요.</p>
      <Link href="/employers" className={styles.primaryButton}>사업장 다시 찾기</Link>
    </section>}
    {query.data?.example && item && <>
      <ExampleNotice />
      <header className={styles.detailHeading}>
        <span className={styles.detailIcon} aria-hidden="true"><Building2 size={30} /></span>
        <div><p className={styles.eyebrow}>사업장 정보</p><h1>{item.name}</h1>
          <p className={styles.description}>{item.region} · {item.industry}</p></div>
      </header>
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <section className={styles.panel} aria-labelledby="registry-info">
            <h2 id="registry-info">공장등록 정보</h2>
            <div className={styles.employees}>
              <span><Users size={19} aria-hidden="true" />등록자료상 외국인 종업원</span>
              <strong>{item.foreignEmployees ?? "정보 없음"}</strong>
              <p>자료 기준 {item.referenceDate}</p>
            </div>
            <dl className={styles.facts}>
              <div><dt>사업장명</dt><dd>{item.name}</dd></div>
              <div><dt>주소</dt><dd>{item.address}</dd></div>
              <div><dt>업종</dt><dd>{item.industry}</dd></div>
              <div><dt>생산품</dt><dd>{item.products}</dd></div>
            </dl>
            <p className={styles.resultNote}>등록자료의 인원은 현재 근무 인원과 다를 수 있어요.</p>
            <SourceLink href={item.sourceUrl}>{item.sourceName} 원문</SourceLink>
          </section>
          <section className={styles.panel} aria-labelledby="official-history">
            <div className={styles.iconHeading}><FileCheck2 size={22} aria-hidden="true" /><h2 id="official-history">공식 공개 이력</h2></div>
            <p className={styles.description}>공식 공표 대상 여부와 확인 시점을 함께 살펴보세요.</p>
            <DisclosureCard title="임금체불 명단공개 여부" value={item.wageDisclosure} source={officialSources.wages} wage />
            <DisclosureCard title="산업재해 공표 여부" value={item.safetyDisclosure} source={officialSources.safety} />
            <p className={styles.resultNote}>명단공개 미대상은 조회 시점의 판정이에요. 모든 임금체불 신고·위반 이력을 확인한 결과는 아니에요.</p>
          </section>
          <section className={styles.privacy}>
            <LockKeyhole size={20} aria-hidden="true" />
            <div><h2>이용자 제보는 공개하지 않아요</h2>
              <p>이 화면에는 공식 공개자료만 연결해요. 내 임금 문제와 증빙자료는 본인의 급여 사례에서 관리할 수 있어요.</p></div>
          </section>
        </div>
        <aside className={styles.actionPanel} aria-label="내 근무지로 연결">
          <span className={styles.actionIcon} aria-hidden="true"><MapPin size={24} /></span>
          <h2>내가 일하는 곳인가요?</h2>
          <p>내 근무지로 등록하고 계약서·근태·급여 자료를 모아 보세요.</p>
          <Link className={styles.primaryButton} href={`/employers/${item.id}/register?${registrationContext}`}>내 근무지로 등록<ArrowRight size={16} aria-hidden="true" /></Link>
          <Link className={styles.secondaryButton} href={`/employers/${item.id}/register?${registrationContext}&next=review`}>월급 확인하기</Link>
          <p className={styles.actionNote}>월급 확인은 근무지를 등록한 뒤 시작해요.</p>
        </aside>
      </div>
    </>}
  </div>;
}
