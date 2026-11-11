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
    <div className="workspace-shell">
      <aside aria-label="사이드바" className="workspace-sidebar">
        <Link href="/" className="inline-flex min-h-11 min-w-11 items-center text-lg font-extrabold tracking-tight text-primary workspace-brand">월급잇다</Link>
        <nav aria-label="주 메뉴" className="flex flex-1 flex-col">{menu}</nav>
      </aside>
      <div className="workspace-canvas min-w-0">
        <header className="workspace-mobile-header">
          <Link href="/" className="inline-flex min-h-11 min-w-11 items-center text-lg font-extrabold tracking-tight text-primary workspace-brand">월급잇다</Link>
          <MobileNavigation breakpoint="691px"><nav aria-label="주 메뉴" className="flex flex-1 flex-col">{menu}</nav></MobileNavigation>
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
