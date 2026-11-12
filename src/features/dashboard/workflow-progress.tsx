
import { translate } from "@/i18n/translate";
import Link from "next/link";

import { caseTaskHref } from "@/features/cases/components/case-cards";
import type { CaseListDto } from "@/features/cases/schemas";
import styles from "./dashboard.module.css";

const steps = [
  ["UPLOAD", translate("dashboard.workflowProgress_record_create")],
  ["REVIEW", translate("dashboard.workflowProgress_extractedValue_review")],
  ["CONDITIONS", translate("dashboard.workflowProgress_confirm")],
  ["COMPARE", translate("dashboard.workflowProgress_record_comparison")],
  ["RESULT", translate("dashboard.workflowProgress_result_confirm")],
] as const;

export function WorkflowProgress({ item }: { item: CaseListDto }) {
  return (
    <nav aria-label={translate("dashboard.workflowProgress_current_step")}>
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
              {item.currentStep === step && <strong className={styles.currentStep}>{translate("dashboard.workflowProgress_current")}</strong>}
            </Link>
          </li>
        ))}
      </ol>
      {!item.currentStep && <p className={styles.note}>{translate("dashboard.workflowProgress_current_step_information_notProvided")}</p>}
    </nav>
  );
}
