"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CaseContext, TaskNavigation } from "./case-context";
import styles from "./case-workspace.module.css";
import { CaseChat } from "@/features/chats/case-chat";

export function CaseWorkspace({ id, children }: { id: number; children: ReactNode }) {
  const pathname = usePathname();
  const support = /^\/cases\/\d+\/(questions|company-inquiry|reports)$/.test(pathname);
  return <div className={styles.workspace}>
    {pathname !== `/cases/${id}` && <CaseContext id={id} showStep={!support} />}
    {!support && <TaskNavigation id={id} />}
    <div className={styles.content}>{children}</div>
    <CaseChat caseId={id} />
  </div>;
}
