
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("brand"), template: t("layout_monthlyWage") },
    description: t("layout_work_record_link_wage_difference_evidence_confirm"),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">{t("layout_body")}</a>
        <NextIntlClientProvider><AppProviders initialLocale={locale}>{children}</AppProviders></NextIntlClientProvider>
      </body>
    </html>
  );
}
