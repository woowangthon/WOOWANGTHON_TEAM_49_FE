import type { ReactNode } from "react";
import { FileCheck2, FilePenLine, FileText, FileUp, ListChecks, MessageSquare, MessagesSquare, ReceiptText, Settings2 } from "lucide-react";
import styles from "./case-workspace.module.css";

const stages = {
  upload: { label: "자료 모으기", icon: FileUp },
  manual: { label: "직접 기록하기", icon: FilePenLine },
  review: { label: "원문과 함께 확인", icon: FileCheck2 },
  conditions: { label: "계산 전 확인", icon: Settings2 },
  result: { label: "내 급여 살펴보기", icon: ReceiptText },
  compare: { label: "자료 사이의 차이 확인", icon: ListChecks },
  questions: { label: "상담 준비", icon: MessagesSquare },
  inquiry: { label: "회사에 물어보기", icon: MessageSquare },
  reports: { label: "상담 자료 준비", icon: FileText },
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
