import Link from "next/link";
import type { CaseListDto } from "@/features/cases/schemas";
import { caseTaskHref } from "@/features/cases/components/case-cards";
const steps = [["UPLOAD", "자료 등록"], ["REVIEW", "추출값 검토"], ["CONDITIONS", "조건 확인"], ["COMPARE", "자료 비교"], ["RESULT", "결과 확인"]] as const;
export function WorkflowProgress({ item }: { item: CaseListDto }) {
 return <nav aria-label="현재 작업 단계" className="my-5"><ol className="flex min-w-0">{steps.map(([step, label], i) => <li key={step} className="relative min-w-0 flex-1 text-center">{i > 0 && <span aria-hidden="true" className="absolute right-1/2 top-4 h-px w-full bg-border" />}<Link href={caseTaskHref({...item, currentStep:step})} aria-current={item.currentStep === step ? "step" : undefined} className="relative flex min-h-20 flex-col items-center gap-2 text-caption"><span className={`flex size-8 items-center justify-center rounded-full border ${item.currentStep === step ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"}`}>{i+1}</span><span>{label}</span>{item.currentStep === step && <strong>현재</strong>}</Link></li>)}</ol>{!item.currentStep && <p className="text-caption text-muted">현재 단계 정보 미제공</p>}</nav>;
}
