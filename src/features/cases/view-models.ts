import type { CaseListDto } from "./schemas";

export const caseStatusLabels = { CREATED: "생성됨", IN_PROGRESS: "진행 중", COMPLETED: "작업 완료", ARCHIVED: "보관됨" };
export const caseStepLabels = { UPLOAD: "자료 등록", REVIEW: "추출값 검토", CONDITIONS: "조건 확인", COMPARE: "자료 대조", RESULT: "결과 확인" };
export function caseCard(dto: CaseListDto) {
  return {
    id: dto.caseId,
    workplaceName: typeof dto.workplace.name === "string" ? dto.workplace.name : `#${dto.workplaceId}`,
    period: `${dto.periodStart} ~ ${dto.periodEnd}`,
    payType: dto.payType === "HOURLY" ? "시급제" : "월급제",
    status: caseStatusLabels[dto.status],
    step: dto.currentStep === undefined ? "단계 정보 미제공" : caseStepLabels[dto.currentStep],
    attention: dto.attentionRequired === true ? "확인 필요" : dto.attentionRequired === false ? "추가 확인 요청 없음" : "확인 필요 여부 미제공",
    updatedAt: dto.updatedAt,
  };
}
