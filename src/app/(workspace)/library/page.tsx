import type { Metadata } from "next";
import { LibraryScreen } from "@/features/documents/components/document-screens";
export const metadata: Metadata = { title: "전체 자료함" };
export default function LibraryPage() { return <LibraryScreen />; }
