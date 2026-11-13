import {getTranslations} from 'next-intl/server';

import { createTranslation } from '@/i18n/translate';
import { getLocale } from 'next-intl/server';

import Link from "next/link";
import type { Metadata } from "next";
import { RecoveryScreen } from "@/features/auth/components/account-screens";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {title: t("accountTitle"), referrer: "no-referrer", robots: {index: false, follow: false}};
}
export default async function Page() {
 const {translate} = createTranslation(await getLocale());
 return <main id="main-content" className="mx-auto w-full max-w-xl px-4 py-10"><Link href="/" className="mb-8 inline-flex min-h-11 items-center font-extrabold">{translate("common.brand")}</Link><RecoveryScreen reset /></main>; }
