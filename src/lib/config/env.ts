
import { translate } from "@/i18n/translate";
export function parseApiBaseUrl(value: string): string {
  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(translate("common.env_authentication_information_none"));
  }

  return url.toString().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return parseApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1",
  );
}
