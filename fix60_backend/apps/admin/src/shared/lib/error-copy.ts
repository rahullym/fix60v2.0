import { ApiError } from '../api/client';

const FALLBACK = 'Something went wrong. Please try again.';

const byCode: Record<string, string> = {
  VALIDATION_FAILED: 'Some details look wrong. Check the highlighted fields.',
  UNAUTHENTICATED: 'Your session has ended. Please sign in again.',
  TOKEN_EXPIRED: 'Your session has ended. Please sign in again.',
  INVALID_REFRESH_TOKEN: 'Your session has ended. Please sign in again.',
  REFRESH_TOKEN_REUSED: 'For your security we signed you out. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that. It may have been removed.",
  RATE_LIMITED: 'Too many attempts. Wait a minute and try again.',
  CONFLICT: 'That already exists or was changed by someone else.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_LOCKED: 'This account is temporarily locked after too many attempts. Try again later.',
  TOTP_REQUIRED: 'Enter the 6-digit code from your authenticator app.',
  INVALID_TOTP: "That code didn't work. Check your authenticator app and try again.",
  INVALID_CHALLENGE: 'This sign-in attempt expired. Start again.',
  LAST_SUPER_ADMIN: "You can't remove the last Super Admin.",
  INVALID_STATE_TRANSITION: 'That change no longer applies. Refresh the page to see the latest status.',
  NETWORK_ERROR: "Can't reach the server. Check your connection.",
  INTERNAL_ERROR: 'The server had a problem. Please try again.',
};

/** Fixed, layman copy for an error. Maps `code`, then status; never echoes the API message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && byCode[error.code]) {
      return byCode[error.code]!;
    }
    if (error.status >= 500) {
      return byCode.INTERNAL_ERROR!;
    }
  }
  return FALLBACK;
}

/** Field-level messages from a VALIDATION_FAILED response, keyed by path. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) {
    return {};
  }
  return Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message]));
}
