
import { createTranslation } from '@/i18n/translate';
import { getLocale } from 'next-intl/server';

import { StatePanel } from "@/components/ui/state-panel";

export default async function Loading() {
 const {translate} = createTranslation(await getLocale());

  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel title={translate("common.loading_load")} description={translate("common.loading_description_main")} live />
    </main>
  );
}
