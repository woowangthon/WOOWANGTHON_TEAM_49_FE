import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AuthGate } from "@/features/auth/components/auth-gate";
import { AuthPending } from "@/features/auth/components/auth-pending";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 sm:px-8">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-primary">월급잇다</Link>
      </header>
      <main id="main-content" className="mx-auto grid w-full max-w-md flex-1 content-center px-4 pb-12 pt-6 sm:px-6 sm:pb-20">
        <Suspense fallback={<AuthPending />}><AuthGate mode="guest">{children}</AuthGate></Suspense>
      </main>
    </div>
  );
}
