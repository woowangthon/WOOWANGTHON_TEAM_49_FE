import type { Metadata } from "next";
import { CaseList } from "@/features/cases/components/case-list";

export const metadata: Metadata = { title: "급여 확인 내역" };

export default function CasesPage() {
  return <CaseList />;
}
