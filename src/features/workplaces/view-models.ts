import type { WorkplaceDto } from "./schemas";

export function workplaceCard(dto: WorkplaceDto) {
  return {
    id: dto.workplaceId,
    name: dto.name,
    industry: dto.industry ?? "업종 미입력",
    region: dto.region ?? "지역 미입력",
    employment: dto.employmentStatus === "CURRENT" ? "재직 중" : "퇴사",
    caseCount: dto.caseCount,
  };
}
