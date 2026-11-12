"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function BrandLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const { status } = useAuth();
  const pending = status === "restoring" || status === "signing-out";
  return <Link {...props} href={status === "authenticated" ? "/dashboard" : "/"}
    aria-disabled={pending || undefined} onClick={event => {
      if (pending) event.preventDefault();
      else props.onClick?.(event);
    }} />;
}
