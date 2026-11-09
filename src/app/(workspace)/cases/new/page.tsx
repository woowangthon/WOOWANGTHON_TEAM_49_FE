import type { Metadata } from "next";

import { CaseCreateScreen } from "@/features/cases/components/case-create-screen";

export const metadata: Metadata = { title: "새 급여 사례" };
export default function NewCasePage() { return <CaseCreateScreen />; }
