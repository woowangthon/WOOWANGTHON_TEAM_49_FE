
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";

import { PageHeading } from "@/components/ui/page-heading";
import { cardStyle } from "@/components/ui/styles";
import { WorkplaceForm } from "@/features/workplaces/components/workplace-form";

export const metadata: Metadata = { title: translate("common.page_workplace_create") };
export default function NewWorkplacePage() { return <><PageHeading title={translate("common.page_workplace_create")} description={translate("common.page_previous_workplace_create_wageCase")} /><section className={`max-w-3xl ${cardStyle}`}><WorkplaceForm /></section></>; }
