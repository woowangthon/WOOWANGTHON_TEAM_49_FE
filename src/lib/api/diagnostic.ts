import type { ApiError } from "./error";
/** Explicit opt-in inspection; never returns headers, values, or response bodies. */
export function developmentDiagnostic(error: unknown) {
  if (process.env.NODE_ENV !== "development") return undefined;
  return error instanceof Error && "diagnostic" in error ? (error as ApiError).diagnostic : undefined;
}
