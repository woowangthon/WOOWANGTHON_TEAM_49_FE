
import { translate } from "@/i18n/translate";
import type { ComponentProps, ReactNode } from "react";
import { cardVariants, primaryButton, secondaryButton, tertiaryButton, dangerButton } from "./styles";

export function Button({ variant = "primary", pending = false, disabled, children, className = "", type = "button", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "tertiary" | "danger"; pending?: boolean }) {
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={`${{ primary: primaryButton, secondary: secondaryButton, tertiary: tertiaryButton, danger: dangerButton }[variant]} ${className}`}>{children}{pending && <span className="ml-2">{translate("common.processing")}</span>}</button>;
}
export function Section({ variant = "default", title, description, children, className = "", ...props }: Omit<ComponentProps<"section">, "title"> & { variant?: keyof typeof cardVariants; title?: string; description?: string }) {
  return <section {...props} className={`${cardVariants[variant]} ${className}`}>{title && <h2 className="text-title font-extrabold">{title}</h2>}{description && <p className="mt-2 text-body text-muted">{description}</p>}{children}</section>;
}
const tones = {
  neutral: "bg-neutral-soft text-review-foreground",
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
};
export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-caption font-bold ${tones[tone]}`}>{children}</span>;
}
export function Notice({ children, tone = "neutral", role }: { children: ReactNode; tone?: keyof typeof tones; role?: "alert" | "status" }) {
  return <div role={role} className={`ui-notice rounded-control p-4 text-body ${tones[tone]}`}>{children}</div>;
}
// Native details keeps keyboard operation and children mounted while collapsed.
export function Disclosure({ summary, children, ...props }: ComponentProps<"details"> & { summary: ReactNode }) {
  return <details {...props} className={`ui-disclosure rounded-panel border border-border p-4 ${props.className ?? ""}`}><summary className="min-h-11 content-center font-bold">{summary}</summary><div className="mt-3 min-w-0">{children}</div></details>;
}
