
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { LibraryScreen } from "@/features/documents/components/document-screens";
export const metadata: Metadata = { title: translate("common.page_library") };
export default function LibraryPage() { return <LibraryScreen />; }
