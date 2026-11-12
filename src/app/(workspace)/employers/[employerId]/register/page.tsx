import type { Metadata } from "next";
import { EmployerRegistrationScreen } from "@/features/employer-directory/employer-registration-screen";
import { directoryBackHref } from "@/features/employer-directory/models";

export const metadata: Metadata = { title: "검색한 사업장 등록" };

export default async function EmployerRegistrationPage({ params, searchParams }: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ next?: string | string[]; from?: string | string[] }>;
}) {
  const search = await searchParams;
  return <EmployerRegistrationScreen employerId={(await params).employerId} startReview={search.next === "review"} backHref={directoryBackHref(search.from)} />;
}
