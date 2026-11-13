"use client";
import { useTranslation } from '@/i18n/use-translation';

import { BrandLink } from "./brand-link";
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
 const {translate} = useTranslation();

  const menu = navigation ?? <p className="text-body text-muted">{translate("navigation.appShell_create_menu_empty")}</p>;

  return (
    <div className="workspace-shell">
      <aside aria-label={translate("navigation.appShell_ariaLabel_aside")} className="workspace-sidebar">
        <BrandLink className="inline-flex min-h-11 min-w-11 items-center text-lg font-extrabold tracking-tight text-primary workspace-brand">{translate("common.brand")}</BrandLink>
        <nav aria-label={translate("navigation.appShell_menu")} className="flex flex-1 flex-col">{menu}</nav>
      </aside>
      <div className="workspace-canvas min-w-0">
        <header className="workspace-mobile-header">
          <BrandLink className="inline-flex min-h-11 min-w-11 items-center text-lg font-extrabold tracking-tight text-primary workspace-brand">{translate("common.brand")}</BrandLink>
          <MobileNavigation breakpoint="691px"><nav aria-label={translate("navigation.appShell_menu")} className="flex flex-1 flex-col">{menu}</nav></MobileNavigation>
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
