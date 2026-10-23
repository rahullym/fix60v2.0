import { isApiError } from '../api/api-error';
import type { ErrorCode } from '../api/types';
import { PhoneAuthError } from '../auth/phone-auth';

const codeKeys: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'errors:validationFailed',
  UNAUTHENTICATED: 'errors:sessionExpired',
  TOKEN_EXPIRED: 'errors:sessionExpired',
  INVALID_REFRESH_TOKEN: 'errors:sessionExpired',
  REFRESH_TOKEN_REUSED: 'errors:sessionExpired',
  FORBIDDEN: 'errors:forbidden',
  NOT_FOUND: 'errors:notFound',
  RATE_LIMITED: 'errors:rateLimited',
  CONFLICT: 'errors:conflict',
  INVALID_FIREBASE_TOKEN: 'errors:phoneVerificationFailed',
  APP_CHECK_FAILED: 'errors:appCheckFailed',
  ALREADY_REGISTERED: 'errors:alreadyRegistered',
  ROLE_MISMATCH: 'errors:roleMismatch',
  UNDERAGE: 'errors:underage',
  CONSENT_REQUIRED: 'errors:consentRequired',
  ACCOUNT_SUSPENDED: 'errors:accountSuspended',
  ACCOUNT_DELETED: 'errors:accountDeleted',
  INVALID_STATE_TRANSITION: 'errors:stateChanged',
  UPLOAD_FAILED: 'errors:uploadFailed',
  SLOT_UNAVAILABLE: 'errors:slotUnavailable',
  NETWORK_ERROR: 'errors:network',
};

/** i18n key for a layman message. Maps `code` first, then status; never uses the API message. */
export function errorMessageKey(error: unknown): string {
  if (error instanceof PhoneAuthError) {
    return `errors:phone.${error.reason}`;
  }
  if (isApiError(error)) {
    if (error.code && codeKeys[error.code]) {
      return codeKeys[error.code]!;
    }
    if (error.status >= 500) {
      return 'errors:server';
    }
    if (error.status === 0) {
      return 'errors:network';
    }
  }
  return 'errors:generic';
}
