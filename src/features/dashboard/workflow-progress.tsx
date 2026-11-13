"use client";
import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";

import { caseTaskHref } from "@/features/cases/components/case-cards";
import type { CaseListDto } from "@/features/cases/schemas";
import styles from "./dashboard.module.css";

export function WorkflowProgress({ item }: { item: CaseListDto }) {
const {steps} = useLocalized(createPresentation);

 const {translate} = useTranslation();

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

function createPresentation({translate}: Translation) {
const steps = [
  ["UPLOAD", translate("dashboard.workflowProgress_record_create")],
  ["REVIEW", translate("dashboard.workflowProgress_extractedValue_review")],
  ["CONDITIONS", translate("dashboard.workflowProgress_confirm")],
  ["COMPARE", translate("dashboard.workflowProgress_record_comparison")],
  ["RESULT", translate("dashboard.workflowProgress_result_confirm")],
] as const;
return {steps};
}
