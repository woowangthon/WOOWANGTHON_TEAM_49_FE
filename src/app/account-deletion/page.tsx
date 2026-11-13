import {getTranslations} from 'next-intl/server';
import type { Metadata } from "next";
import { DeletionStatusScreen } from "@/features/auth/components/account-screens";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {title: t("accountTitle"), referrer: "no-referrer", robots: {index: false, follow: false}};
}
export default function Page() { return <main id="main-content" className="mx-auto w-full max-w-xl px-4 py-10"><DeletionStatusScreen /></main>; }
