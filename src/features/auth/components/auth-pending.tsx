
import { translate } from "@/i18n/translate";
import { StatePanel } from "@/components/ui/state-panel";

export function AuthPending({ fullPage = false, title = translate("auth.authPending_login_status_confirm"), description = translate("auth.accountOverview_accountOverview_description") }: {
  fullPage?: boolean;
  title?: string;
  description?: string;
}) {
  const content = <StatePanel title={title} description={description} live />;
  return fullPage
    ? <main id="main-content" className="grid min-h-dvh place-items-center p-4">{content}</main>
    : content;
}
