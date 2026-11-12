import type { Metadata } from "next";
import { CaseList } from "@/features/cases/components/case-list";

export const metadata: Metadata = { title: "급여 사례 탐색" };

export default function CasesPage() {
  return <CaseList />;
}
