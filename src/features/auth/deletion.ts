import { z } from "zod";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type DeletionReceipt = z.infer<typeof deletionSchema>;

export function createLocalizedFeaturesAuthDeletion(translation: Translation) {
  const {translate} = translation;
const deletionSchema = z.object({
  status: z.string().optional(),
  deletionRequestId: z.number().int().positive().optional(),
  accessRevokedAt: z.iso.datetime({ offset: true }).optional(),
  normalStoragePurgeDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
function deletionPollInterval(receipt: DeletionReceipt | undefined, error: unknown) {
  // Conditional P4 pending state only. Unknown/held/terminal states never poll.
  return !error && receipt?.status === "PENDING_PURGE" ? 5000 : false;
}
function deletionDescription(receipt: DeletionReceipt) {
  switch (receipt.status) {
    case "PENDING_PURGE": return translate("auth.deletion_deletion_request_count_pending_delete_complete_status");
    case "PURGED": return translate("auth.deletion_save_complete_status_all_delete");
    case "LEGAL_HOLD": return translate("auth.deletion_delete_complete_status");
    default: return translate("auth.deletion_delete_status_notProvided_confirm_complete_count_empty");
  }
}
return {deletionSchema, deletionPollInterval, deletionDescription};
}

export const {deletionSchema, deletionPollInterval} = createLocalizedFeaturesAuthDeletion(createTranslation(defaultLocale));
