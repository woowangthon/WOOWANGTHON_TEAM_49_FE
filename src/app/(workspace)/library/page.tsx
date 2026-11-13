import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { LibraryScreen } from "@/features/documents/components/document-screens";
export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_library") };
}
export default function LibraryPage() { return <LibraryScreen />; }
