"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "../hooks/use-auth";
import { loginHref, safeReturnTo } from "../redirect";
import { AuthPending } from "./auth-pending";

/** Presentation guard only. Backend ownership checks remain authoritative. */
export function AuthGate({ mode, children }: { mode: "guest" | "protected"; children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const returnTo = safeReturnTo(params.get("next"));

  useEffect(() => {
    if (mode === "protected" && status === "anonymous") {
      router.replace(loginHref(`${pathname}${search ? `?${search}` : ""}`));
    } else if (mode === "guest" && status === "authenticated") {
      router.replace(returnTo);
    }
  }, [mode, status, router, pathname, search, returnTo]);

  const allowed = mode === "protected" ? status === "authenticated" : status === "anonymous";
  if (!allowed) {
    const title = status === "signing-out" ? "로그아웃하는 중입니다"
      : status === "authenticated" ? "로그인되었습니다"
        : status === "anonymous" ? "로그인이 필요합니다" : undefined;
    return <AuthPending fullPage={mode === "protected"} title={title} />;
  }
  return children;
}
