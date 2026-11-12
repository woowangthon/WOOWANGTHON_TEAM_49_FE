"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CaseContext } from "./case-context";
import styles from "./case-workspace.module.css";

export function CaseWorkspace({ id, children }: { id: number; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === `/cases/${id}`) return children;
  return <div className={styles.workspace}>
    <CaseContext id={id} />
    <div className={styles.content}>{children}</div>
  </div>;
}
