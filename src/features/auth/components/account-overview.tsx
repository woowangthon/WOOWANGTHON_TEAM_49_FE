"use client";
import { useTranslation } from '@/i18n/use-translation';

import { StatePanel } from "@/components/ui/state-panel";

import { useCurrentUser } from "../hooks/use-auth";

/** Current user data is provided by the existing auth Query cache. */
export function AccountOverview() {
 const {translate} = useTranslation();

  const user = useCurrentUser();
  if (user.isPending) return <StatePanel title={translate("auth.accountOverview_information_load")} description={translate("auth.accountOverview_accountOverview_description")} live />;
  if (user.isError) return <StatePanel title={translate("auth.accountOverview_information_loadFailure")} description={translate("auth.accountOverview_link_confirm_retry")} action={<button type="button" onClick={() => { void user.refetch(); }} className="min-h-11 rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">{translate("common.retry")}</button>} />;

  return (
    <section className="max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
      <p className="text-caption font-bold text-muted">{translate("auth.accountOverview_wage_record")}</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{translate("auth.accountOverview_section2", { value1: user.data.name })}</h1>
      <dl className="mt-6 grid min-w-0 gap-2 text-body">
        <dt className="font-bold">{translate("auth.accountOverview_email")}</dt><dd className="min-w-0 break-all text-muted">{user.data.email}</dd>
      </dl>
      <p className="mt-6 text-body text-muted">{translate("auth.accountOverview_workplace_wagePeriod_case_confirm_required_record")}</p>
    </section>
  );
}
