import type { ApiErrorBody, ErrorCode } from './types';

/** Error thrown by every API call. Screens branch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | undefined;
  readonly issues: { path: string; message: string }[];

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallbackCode?: ErrorCode) {
    super(body?.message ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? fallbackCode;
    this.issues = body?.issues ?? [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the error carries one of the given codes. */
export function hasErrorCode(error: unknown, ...codes: ErrorCode[]): boolean {
  return isApiError(error) && error.code !== undefined && codes.includes(error.code);
}
