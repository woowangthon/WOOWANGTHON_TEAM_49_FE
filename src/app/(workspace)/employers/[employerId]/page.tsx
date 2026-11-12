import type { Metadata } from "next";
import { EmployerDetailScreen } from "@/features/employer-directory/employer-detail-screen";
import { directoryBackHref } from "@/features/employer-directory/models";

export const metadata: Metadata = { title: "사업장 정보" };

export default async function EmployerPage({ params, searchParams }: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { employerId } = await params;
  const { from } = await searchParams;
  return <EmployerDetailScreen employerId={employerId} backHref={directoryBackHref(from)} />;
}
