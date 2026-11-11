/** P0: JSON responses only. 204, files and SSE do not use this envelope. */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiFieldError {
  field: string;
  reason: string;
}

/** Wire DTO: P0 ErrorData. UI normalization belongs in ApiError. */
export interface ApiErrorData {
  errorCode: string;
  details?: JsonValue;
  errors?: ApiFieldError[] | null;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
