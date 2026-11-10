import { z } from "zod";

/** P4 receipt adapter, all fields optional: not a confirmed P0 DTO/enum. */
export const deletionSchema = z.object({
  status: z.string().optional(),
  deletionRequestId: z.number().int().positive().optional(),
  accessRevokedAt: z.iso.datetime({ offset: true }).optional(),
  normalStoragePurgeDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type DeletionReceipt = z.infer<typeof deletionSchema>;
export function deletionPollInterval(receipt: DeletionReceipt | undefined, error: unknown) {
  // Conditional P4 pending state only. Unknown/held/terminal states never poll.
  return !error && receipt?.status === "PENDING_PURGE" ? 5000 : false;
}
export function deletionDescription(receipt: DeletionReceipt) {
  switch (receipt.status) {
    case "PENDING_PURGE": return "탈퇴 요청이 접수되어 파기 대기 중입니다. 삭제 완료 상태가 아닙니다.";
    case "PURGED": return "서버가 일반 저장소 파기 완료 상태를 반환했습니다. 법적 보존·백업 등 모든 데이터의 완전 삭제를 보증하지 않습니다.";
    case "LEGAL_HOLD": return "보존 사유로 파기가 보류되었습니다. 삭제 완료 상태가 아닙니다.";
    default: return "삭제 상태가 미제공되었거나 확인되지 않은 값입니다. 완료 여부를 확인할 수 없습니다.";
  }
}
