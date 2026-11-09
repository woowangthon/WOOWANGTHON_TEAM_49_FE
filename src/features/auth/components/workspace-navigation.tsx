"use client";

import Link from "next/link";

import { useAppServices } from "@/hooks/use-app-services";

export function WorkspaceNavigation() {
  const { auth } = useAppServices();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard" className="flex min-h-11 items-center rounded-control bg-neutral-soft px-4 py-3 text-body font-bold">내 계정</Link>
      <button type="button" onClick={() => { void auth.logout(); }} className="min-h-11 rounded-control border border-border px-4 py-3 text-left text-body font-bold">로그아웃</button>
    </div>
  );
}
