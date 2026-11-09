export const MAX_FILE_SIZE = 20 * 1024 * 1024;
const mimeExtensions: Record<string, readonly string[]> = { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] };
export function validateFile(file: File): string | undefined {
  if (!file.size) return "빈 파일은 업로드할 수 없습니다.";
  if (file.size > MAX_FILE_SIZE) return "파일은 20MiB 이하여야 합니다.";
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!mimeExtensions[file.type]?.includes(extension)) return "PDF, JPEG, PNG 파일만 지원합니다. MIME과 확장자를 확인해 주세요.";
}
export async function validateImageDimensions(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return;
  try {
    const bitmap = await createImageBitmap(file);
    const oversized = bitmap.width > 10000 || bitmap.height > 10000;
    bitmap.close();
    return oversized ? "이미지 각 축은 10000px 이하여야 합니다." : undefined;
  } catch { /* Browser decoding unavailable: authoritative server validation follows. */ }
}
