import {message as describeMessage} from '@/i18n/message';
import {type Translation} from '@/i18n/translate';

export function createLocalizedFeaturesDocumentsFileValidation(translation: Translation) {
  const {} = translation;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const mimeExtensions: Record<string, readonly string[]> = { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] };
function validateFile(file: File, deferred = false): string | undefined {
  const translate = deferred ? describeMessage : translation.translate;
  if (!file.size) return translate("documents.fileValidation_file_upload_count_empty");
  if (file.size > MAX_FILE_SIZE) return translate("documents.fileValidation_file_atMost");
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!mimeExtensions[file.type]?.includes(extension)) return translate("documents.fileValidation_pdf_file_confirm");
}
async function validateImageDimensions(file: File, deferred = false): Promise<string | undefined> {
  const translate = deferred ? describeMessage : translation.translate;
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return;
  try {
    const bitmap = await createImageBitmap(file);
    const oversized = bitmap.width > 10000 || bitmap.height > 10000;
    bitmap.close();
    return oversized ? translate("documents.fileValidation_image_atMost") : undefined;
  } catch { /* Browser decoding unavailable: authoritative server validation follows. */ }
}
return {MAX_FILE_SIZE, validateFile, validateImageDimensions};
}
