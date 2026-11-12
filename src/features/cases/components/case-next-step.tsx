import Link from "next/link";
import { secondaryButton } from "@/components/ui/styles";

export function CaseNextStep({ title, description, href, label, ariaLabel }: { title: string; description: string; href: string; label: string; ariaLabel: string }) {
  return <nav data-case-next aria-label={ariaLabel}><div><h2>{title}</h2><p>{description}</p></div><Link href={href} className={secondaryButton}>{label}</Link></nav>;
}
