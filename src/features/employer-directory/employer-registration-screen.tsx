"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { WorkplaceForm } from "@/features/workplaces/components/workplace-form";
import { DirectoryUnavailable, ExampleNotice } from "./directory-shared";
import { useEmployerDirectory } from "./queries";
import styles from "./directory.module.css";

export function EmployerRegistrationScreen({ employerId, startReview, backHref = "/employers" }: { employerId: string; startReview: boolean; backHref?: string }) {
  const query = useEmployerDirectory();
  const router = useRouter();
  const item = query.data?.items.find(employer => employer.id === employerId);
  return <div className={styles.screen}>
    <Link className={styles.backLink} href={`/employers/${employerId}?${new URLSearchParams({ from: backHref })}`}><ArrowLeft size={17} aria-hidden="true" />사업장 정보로</Link>
    <header className={styles.heading}><h1>내 근무지로 등록해요</h1>
      <p className={styles.description}>선택한 사업장 정보가 맞는지 확인하고 재직 상태를 선택해 주세요.</p></header>
    {query.isPending && <QueryFeedback pending />}
    {query.isError && <QueryFeedback error={query.error} retry={() => void query.refetch()} />}
    {query.data && !query.data.example && <DirectoryUnavailable />}
    {query.data?.example && !item && <p role="alert">사업장 정보를 찾을 수 없어요. 검색 결과에서 다시 선택해 주세요.</p>}
    {query.data?.example && item && <>
      <ExampleNotice />
      <div className={styles.panel}>
        {startReview && <p className={styles.formNote}>등록을 마치면 이 근무지의 새 급여 검토로 이동해요.</p>}
        <WorkplaceForm key={item.id} prefill={{ name: item.name, region: item.region, industry: item.industry }}
          onCreated={startReview ? id => router.replace(`/cases/new?workplaceId=${id}`) : undefined} />
      </div>
    </>}
  </div>;
}
