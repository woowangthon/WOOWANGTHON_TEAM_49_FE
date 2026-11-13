import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/auth-form";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_login") };
}

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
