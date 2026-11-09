import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNavigation } from "./mobile-navigation";

/** Navigation is supplied only when the corresponding business routes exist. */
export function AppShell({
  children,
  navigation,
}: {
  children: ReactNode;
  navigation?: ReactNode;
}) {
  const menu = navigation ?? <p className="text-body text-muted">등록된 메뉴가 없습니다.</p>;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)]">
      <aside aria-label="사이드바" className="sticky top-0 hidden h-dvh min-w-0 flex-col gap-8 overflow-y-auto border-r border-border bg-surface p-6 lg:flex">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-primary">월급잇다</Link>
        <nav aria-label="주 메뉴">{menu}</nav>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 lg:hidden">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-primary">월급잇다</Link>
          <MobileNavigation><nav aria-label="주 메뉴">{menu}</nav></MobileNavigation>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-content p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
