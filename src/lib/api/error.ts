import type { ApiErrorData, ApiFieldError } from "@/types/api";

type ErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "rate-limited"
  | "server"
  | "http"
  | "network"
  | "protocol";

const httpKinds: Record<number, ErrorKind> = {
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  422: "validation",
  429: "rate-limited",
};

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ErrorKind;
  readonly errorCode?: string;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors: ApiFieldError[];
  readonly retryAfter: string | null;

  constructor(
    status: number,
    options: ApiErrorData & {
      kind?: ErrorKind;
      retryAfter?: string | null;
    } = {},
  ) {
    // Never embed URLs, response bodies or tokens in the Error message.
    super(options.errorCode ?? `HTTP_${status}`);
    this.name = "ApiError";
    this.status = status;
    this.kind = options.kind ?? httpKinds[status] ?? (status >= 500 ? "server" : "http");
    this.errorCode = options.errorCode;
    this.details = options.details;
    this.fieldErrors = options.errors ?? [];
    this.retryAfter = options.retryAfter ?? null;
  }
}
