import Link from "next/link";

import { caseTaskHref } from "@/features/cases/components/case-cards";
import type { CaseListDto } from "@/features/cases/schemas";
import styles from "./dashboard.module.css";

const steps = [
  ["UPLOAD", "자료 등록"],
  ["REVIEW", "추출값 검토"],
  ["CONDITIONS", "조건 확인"],
  ["COMPARE", "자료 비교"],
  ["RESULT", "결과 확인"],
] as const;

export function WorkflowProgress({ item }: { item: CaseListDto }) {
  return (
    <nav aria-label="현재 작업 단계">
      <ol className={styles.steps}>
        {steps.map(([step, label], index) => (
          <li key={step}>
            <Link
              href={caseTaskHref({ ...item, currentStep: step })}
              aria-current={item.currentStep === step ? "step" : undefined}
              className={styles.step}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{label}</span>
              {item.currentStep === step && <strong className={styles.currentStep}>현재</strong>}
            </Link>
          </li>
        ))}
      </ol>
      {!item.currentStep && <p className={styles.note}>현재 단계 정보 미제공</p>}
    </nav>
  );
}
