import type { CaseListDto } from "./schemas";
import {type Translation} from '@/i18n/translate';

export function createLocalizedFeaturesCasesViewModels(translation: Translation) {
  const {translate} = translation;
const caseStatusLabels = { CREATED: translate("cases.viewModels_caseStatusLabels_cREATED"), IN_PROGRESS: translate("cases.viewModels_progress"), COMPLETED: translate("cases.viewModels_complete"), ARCHIVED: translate("cases.viewModels_archived") };
const caseStepLabels = { UPLOAD: translate("cases.viewModels_record_create"), REVIEW: translate("cases.viewModels_extractedValue_review"), CONDITIONS: translate("cases.caseContext_confirm"), COMPARE: translate("cases.viewModels_record_comparison"), RESULT: translate("cases.viewModels_result_confirm") };
function caseCard(dto: CaseListDto) {
  return {
    id: dto.caseId,
    workplaceName: typeof dto.workplace.name === "string" ? dto.workplace.name : `#${dto.workplaceId}`,
    period: `${dto.periodStart} ~ ${dto.periodEnd}`,
    payType: dto.payType === "HOURLY" ? translate("cases.caseForm_hourlyWage") : translate("cases.caseForm_monthlyWage"),
    status: caseStatusLabels[dto.status],
    step: dto.currentStep === undefined ? translate("cases.viewModels_step_information_notProvided") : caseStepLabels[dto.currentStep],
    attention: dto.attentionRequired === true ? translate("cases.viewModels_confirm_required") : dto.attentionRequired === false ? translate("cases.viewModels_add_confirm_request_none") : translate("cases.viewModels_confirm_required_notProvided"),
    updatedAt: dto.updatedAt,
  };
}
return {caseStatusLabels, caseStepLabels, caseCard};
}
