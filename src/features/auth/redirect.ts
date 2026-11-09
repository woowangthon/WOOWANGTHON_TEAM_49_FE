const fallback = "/dashboard";
const internalOrigin = "https://wageitda.invalid";

/** Only workspace destinations are allowed; auth pages would create redirect loops. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const path = value.split(/[?#]/, 1)[0];
    const decoded = decodeURIComponent(path);
    if (
      decoded.startsWith("//") || decoded.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded) ||
      /%(?:2f|5c|2e|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded) ||
      decoded.split("/").some((part) => part === "." || part === "..")
    ) return fallback;
    const url = new URL(value, internalOrigin);
    if (url.origin !== internalOrigin || !/^\/(dashboard|workplaces|cases|library|settings)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginHref(returnTo: string, registered = false): string {
  const params = new URLSearchParams({ next: safeReturnTo(returnTo) });
  if (registered) params.set("registered", "1");
  return `/login?${params}`;
}
