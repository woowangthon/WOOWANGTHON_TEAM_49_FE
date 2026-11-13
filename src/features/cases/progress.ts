import type { Conditions } from "@/features/case-inputs/schemas";
import type { DocumentDto } from "@/features/documents/schemas";
import type { CaseListDto } from "./schemas";

/** Saved input progress, independent of workflow position and calculation availability. */
export function caseProgress(dto: CaseListDto, conditions?: Conditions, documents?: {items: DocumentDto[]; total: number}, manualCount?: number) {
  const currentConditions = conditions?.inputVersion === dto.inputVersion ? conditions : undefined;
  const required = currentConditions?.conditions.filter(c => c.requiredFor.some(check => check !== "DEPOSIT_COMPARISON"));
  const conditionsComplete = required?.every(c => c.status === "NOT_APPLICABLE" || c.status === "UNKNOWN" || (c.status === "ANSWERED" && c.value !== null));
  const documentsKnown = documents && documents.items.length === documents.total && documents.total === dto.documentCount;
  const hasInput = dto.documentCount > 0 || (manualCount ?? 0) > 0;
  const reviewComplete = documentsKnown && hasInput ? documents.items.every(d => d.reviewStatus === "CONFIRMED") : undefined;
  // Missing/failed queries never manufacture completion or infer it from a visited route.
  const next = !hasInput && manualCount === 0 ? "UPLOAD"
    : reviewComplete === false ? "REVIEW"
    : reviewComplete === true && conditionsComplete === false ? "CONDITIONS"
    : reviewComplete === true && conditionsComplete === true && hasInput ? "RESULT"
    : dto.currentStep;
  return { next, conditionsComplete, reviewComplete };
}
