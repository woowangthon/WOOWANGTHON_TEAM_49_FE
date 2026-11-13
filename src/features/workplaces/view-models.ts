import type { WorkplaceDto } from "./schemas";
import {type Translation} from '@/i18n/translate';

export function createLocalizedFeaturesWorkplacesViewModels(translation: Translation) {
  const {translate} = translation;
function workplaceCard(dto: WorkplaceDto) {
  return {
    id: dto.workplaceId,
    name: dto.name,
    industry: dto.industry ?? translate("workplaces.viewModels_industry_input"),
    region: dto.region ?? translate("workplaces.viewModels_region_input"),
    employment: dto.employmentStatus === "CURRENT" ? translate("workplaces.workplaceForm_employed") : translate("workplaces.workplaceForm_employmentEnd"),
    caseCount: dto.caseCount,
  };
}
return {workplaceCard};
}
