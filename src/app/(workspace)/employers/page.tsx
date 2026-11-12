import type { Metadata } from "next";
import { DirectorySearchScreen } from "@/features/employer-directory/directory-search-screen";
import { parseDirectoryFilters } from "@/features/employer-directory/models";

export const metadata: Metadata = { title: "사업장 찾기" };

export default async function EmployerSearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DirectorySearchScreen filters={parseDirectoryFilters(await searchParams)} />;
}
