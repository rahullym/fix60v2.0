/** Stable error codes returned in the `code` field of every API error body. */
export const errorCodes = {
  validationFailed: 'VALIDATION_FAILED',
  unauthenticated: 'UNAUTHENTICATED',
  tokenExpired: 'TOKEN_EXPIRED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  rateLimited: 'RATE_LIMITED',
  conflict: 'CONFLICT',
  internal: 'INTERNAL_ERROR',

  invalidFirebaseToken: 'INVALID_FIREBASE_TOKEN',
  appCheckFailed: 'APP_CHECK_FAILED',
  registrationRequired: 'REGISTRATION_REQUIRED',
  alreadyRegistered: 'ALREADY_REGISTERED',
  roleMismatch: 'ROLE_MISMATCH',
  underage: 'UNDERAGE',
  consentRequired: 'CONSENT_REQUIRED',
  accountSuspended: 'ACCOUNT_SUSPENDED',
  accountDeleted: 'ACCOUNT_DELETED',
  invalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  refreshTokenReused: 'REFRESH_TOKEN_REUSED',

  invalidCredentials: 'INVALID_CREDENTIALS',
  accountLocked: 'ACCOUNT_LOCKED',
  totpRequired: 'TOTP_REQUIRED',
  invalidTotp: 'INVALID_TOTP',
  invalidChallenge: 'INVALID_CHALLENGE',
  lastSuperAdmin: 'LAST_SUPER_ADMIN',

  invalidStateTransition: 'INVALID_STATE_TRANSITION',
  uploadFailed: 'UPLOAD_FAILED',
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

/** JSON body of every non-2xx API response. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  requestId?: string;
  code?: ErrorCode;
  issues?: { path: string; message: string }[];
}
