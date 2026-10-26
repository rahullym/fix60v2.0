import { env } from '../config/env';

/** A sent OTP waiting for the user's code. */
export interface PhoneVerification {
  /** Confirms the 6-digit code and returns an ID token for `POST /auth/firebase`. */
  confirm: (code: string) => Promise<string>;
}

export interface PhoneAuth {
  start: (phoneE164: string) => Promise<PhoneVerification>;
  /** Fresh ID token for the signed-in phone (used by registration). */
  currentIdToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

/** The fixed code accepted in dev mode. */
export const DEV_OTP = '123456';

function createDevPhoneAuth(): PhoneAuth {
  let verifiedPhone: string | null = null;
  return {
    start: async (phone) => ({
      confirm: async (code) => {
        if (code !== DEV_OTP) {
          throw new PhoneAuthError('invalid_code');
        }
        verifiedPhone = phone;
        return `dev:${phone}`;
      },
    }),
    currentIdToken: async () => (verifiedPhone ? `dev:${verifiedPhone}` : null),
    signOut: async () => {
      verifiedPhone = null;
    },
  };
}

export type PhoneAuthErrorReason = 'invalid_code' | 'code_expired' | 'too_many_requests' | 'invalid_phone' | 'unknown';

export class PhoneAuthError extends Error {
  constructor(readonly reason: PhoneAuthErrorReason) {
    super(reason);
    this.name = 'PhoneAuthError';
  }
}

function mapFirebaseError(error: unknown): PhoneAuthError {
  const code = (error as { code?: string }).code ?? '';
  if (code.includes('invalid-verification-code')) return new PhoneAuthError('invalid_code');
  if (code.includes('session-expired') || code.includes('code-expired')) return new PhoneAuthError('code_expired');
  if (code.includes('too-many-requests') || code.includes('quota-exceeded')) return new PhoneAuthError('too_many_requests');
  if (code.includes('invalid-phone-number')) return new PhoneAuthError('invalid_phone');
  return new PhoneAuthError('unknown');
}

/** Firebase phone auth; the native module is loaded lazily so dev/mock builds run without it. */
function createFirebasePhoneAuth(): PhoneAuth {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loadAuth = () => require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
  return {
    start: async (phone) => {
      const { getAuth, signInWithPhoneNumber, getIdToken } = loadAuth();
      try {
        const confirmation = await signInWithPhoneNumber(getAuth(), phone);
        return {
          confirm: async (code) => {
            try {
              const credential = await confirmation.confirm(code);
              if (!credential?.user) {
                throw new PhoneAuthError('unknown');
              }
              return await getIdToken(credential.user, true);
            } catch (error) {
              throw error instanceof PhoneAuthError ? error : mapFirebaseError(error);
            }
          },
        };
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },
    currentIdToken: async () => {
      const { getAuth, getIdToken } = loadAuth();
      const user = getAuth().currentUser;
      return user ? getIdToken(user, true) : null;
    },
    signOut: async () => {
      const { getAuth, signOut } = loadAuth();
      if (getAuth().currentUser) {
        await signOut(getAuth());
      }
    },
  };
}

export const phoneAuth: PhoneAuth = env.authMode === 'firebase' ? createFirebasePhoneAuth() : createDevPhoneAuth();

/** Normalises a 10-digit Indian mobile to E.164. Returns null when invalid. */
export function toIndianE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  const national = digits.startsWith('+91') ? digits.slice(3) : digits.replace(/^0/, '');
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}
