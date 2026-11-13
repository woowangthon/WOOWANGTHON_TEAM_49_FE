import {getTranslations} from 'next-intl/server';

import { createTranslation } from '@/i18n/translate';
import { getLocale } from 'next-intl/server';

import type { Metadata } from "next";

import { PageHeading } from "@/components/ui/page-heading";
import { cardStyle } from "@/components/ui/styles";
import { WorkplaceForm } from "@/features/workplaces/components/workplace-form";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_workplace_create") };
}
export default async function NewWorkplacePage() {
 const {translate} = createTranslation(await getLocale());
 return <><PageHeading title={translate("common.page_workplace_create")} description={translate("common.page_previous_workplace_create_wageCase")} /><section className={`max-w-3xl ${cardStyle}`}><WorkplaceForm /></section></>; }
