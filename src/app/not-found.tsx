
import { createTranslation } from '@/i18n/translate';
import { getLocale } from 'next-intl/server';

import Link from "next/link";

import { StatePanel } from "@/components/ui/state-panel";

export default async function NotFound() {
 const {translate} = createTranslation(await getLocale());

  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel
        title={translate("common.notFound_page_notFound")}
        description={translate("common.notFound_address_confirm_first_navigate")}
        action={<Link href="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">{translate("common.notFound_first")}</Link>}
      />
    </main>
  );
}
