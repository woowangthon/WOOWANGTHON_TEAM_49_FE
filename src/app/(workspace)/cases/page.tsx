import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { primaryButton } from "@/components/ui/styles";
import { CaseList } from "@/features/cases/components/case-list";

export const metadata: Metadata = { title: "급여 사례" };
export default function CasesPage() { return <><PageHeading title="급여 사례" description="근무지와 실제 산정기간별로 자료를 정리하세요. 사례 상태는 검사 완료 여부와 다릅니다." action={<Link href="/cases/new" className={primaryButton}>새 사례 시작</Link>} /><CaseList /></>; }
