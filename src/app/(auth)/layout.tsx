
import { translate } from "@/i18n/translate";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AuthGate } from "@/features/auth/components/auth-gate";
import { AuthPending } from "@/features/auth/components/auth-pending";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 sm:px-8">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-primary">{translate("common.brand")}</Link>
      </header>
      <main id="main-content" className="mx-auto grid w-full max-w-[928px] flex-1 content-center px-4 pb-12 pt-6 sm:px-6 sm:pb-20">
        <div className="t8-auth-grid"><aside className="t8-brand"><p className="font-extrabold">{translate("common.brand")}</p><div><h2>{translate("common.layout_start")}<br />{translate("common.layout_monthlyWage_confirm")}</h2><p>{translate("common.layout_work_record_link")}<br />{translate("common.layout_confirm_difference")}</p></div><ul><li>{translate("common.layout_record")}</li><li>{translate("common.layout_extraction_confirm")}</li><li>{translate("common.layout_calculation_result_evidence")}</li></ul></aside><Suspense fallback={<AuthPending />}><AuthGate mode="guest">{children}</AuthGate></Suspense></div>
      </main>
    </div>
  );
}
