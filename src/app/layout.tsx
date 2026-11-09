import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "월급잇다", template: "%s | 월급잇다" },
  description: "근무 자료를 연결하고 급여 차이의 근거를 확인하는 월급잇다",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
