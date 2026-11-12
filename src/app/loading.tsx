
import { translate } from "@/i18n/translate";
import { StatePanel } from "@/components/ui/state-panel";

export default function Loading() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-4">
      <StatePanel title={translate("common.loading_load")} description={translate("common.loading_description_main")} live />
    </main>
  );
}
