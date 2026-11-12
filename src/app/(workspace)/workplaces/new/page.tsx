import type { Metadata } from "next";

import { PageHeading } from "@/components/ui/page-heading";
import { cardStyle } from "@/components/ui/styles";
import { WorkplaceForm } from "@/features/workplaces/components/workplace-form";

export const metadata: Metadata = { title: "근무지 등록" };
export default function NewWorkplacePage() { return <><PageHeading title="근무지 등록" description="일하는 곳이나 이전 근무지를 등록해 급여 내역을 관리하세요." /><section className={`max-w-3xl ${cardStyle}`}><WorkplaceForm /></section></>; }
