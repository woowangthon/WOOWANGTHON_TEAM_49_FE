"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppServices } from "@/hooks/use-app-services";

export function WorkspaceNavigation() {
  const { auth } = useAppServices();
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-4">
      {[{ href: "/dashboard", label: "대시보드" }, { href: "/workplaces", label: "내 근무지" }, { href: "/cases", label: "급여 사례" }].map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} className="flex min-h-11 items-center rounded-control px-4 py-3 text-body font-bold aria-[current=page]:bg-neutral-soft">{label}</Link>)}
      <button type="button" onClick={() => { void auth.logout(); }} className="min-h-11 rounded-control border border-border px-4 py-3 text-left text-body font-bold">로그아웃</button>
    </div>
  );
}
