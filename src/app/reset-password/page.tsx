import type { Metadata } from "next";
import { RecoveryScreen } from "@/features/auth/components/account-screens";
export const metadata: Metadata = { title: "Account", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function Page() { return <main id="main-content" className="mx-auto w-full max-w-xl px-4 py-10"><RecoveryScreen reset /></main>; }
