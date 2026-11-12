
import { translate } from "@/i18n/translate";
import type { ReactNode } from "react";
import { FileCheck2, FilePenLine, FileText, FileUp, ListChecks, MessageSquare, MessagesSquare, ReceiptText, Settings2 } from "lucide-react";
import styles from "./case-workspace.module.css";

const stages = {
  upload: { label: translate("cases.caseContext_record"), icon: FileUp },
  manual: { label: translate("cases.caseStageHeader_stages_manual_label"), icon: FilePenLine },
  review: { label: translate("cases.caseStageHeader_original_confirm"), icon: FileCheck2 },
  conditions: { label: translate("cases.caseStageHeader_calculation_confirm"), icon: Settings2 },
  result: { label: translate("cases.caseStageHeader_wage"), icon: ReceiptText },
  compare: { label: translate("cases.caseStageHeader_record_difference_confirm"), icon: ListChecks },
  questions: { label: translate("cases.caseStageHeader_consultation"), icon: MessagesSquare },
  inquiry: { label: translate("cases.caseStageHeader_company"), icon: MessageSquare },
  reports: { label: translate("cases.caseStageHeader_consultation_record"), icon: FileText },
};

export function CaseStageHeader({ stage, title, description, action }: {
  stage: keyof typeof stages;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { label, icon: Icon } = stages[stage];
  return <header className={styles.hero} data-stage={stage}>
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><span aria-hidden="true" />{label}</p>
      <h1>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.heroAction}>{action}</div>}
    </div>
    <div className={styles.heroArt} aria-hidden="true">
      <span className={styles.artBack} />
      <span className={styles.artTile}><Icon size={48} strokeWidth={1.4} /></span>
      <span className={styles.artDot} />
    </div>
  </header>;
}
