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
      <main id="main-content" className="mx-auto grid w-full max-w-[928px] flex-1 content-center px-4 pb-12 pt-6 sm:px-6 sm:pb-20">
        <div className="t8-auth-grid"><aside className="t8-brand"><p className="font-extrabold">월급잇다</p><div><h2>내 기록에서 시작하는<br />월급 확인</h2><p>흩어진 근무 자료를 연결하고,<br />확인한 값으로 차이를 살펴보세요.</p></div><ul><li>자료를 한곳에 정리</li><li>추출된 값은 직접 확인</li><li>계산 결과와 근거 함께 보기</li></ul></aside><Suspense fallback={<AuthPending />}><AuthGate mode="guest">{children}</AuthGate></Suspense></div>
      </main>
    </div>
  );
}
