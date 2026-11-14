import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { WorkplaceRegistrationScreen } from "@/features/workplaces/components/workplace-registration-screen";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_workplace_create") };
}
export default function NewWorkplacePage() {
 return <WorkplaceRegistrationScreen />;
}
