import { router } from 'expo-router';
import { api } from '@/shared/api/endpoints';
import type { UserRole } from '@/shared/api/types';
import { session } from '@/shared/auth/session';
import { phoneAuth, type PhoneVerification } from '@/shared/auth/phone-auth';
import { queryClient } from '@/shared/lib/query-client';

/** State carried across the welcome → phone → OTP → register screens. */
interface AuthFlowState {
  role: UserRole;
  phone: string | null;
  verification: PhoneVerification | null;
  idToken: string | null;
}

const flow: AuthFlowState = { role: 'customer', phone: null, verification: null, idToken: null };

export const authFlow = {
  get: (): Readonly<AuthFlowState> => flow,

  chooseRole: (role: UserRole): void => {
    flow.role = role;
  },

  sendCode: async (phone: string): Promise<void> => {
    flow.verification = await phoneAuth.start(phone);
    flow.phone = phone;
    flow.idToken = null;
  },

  /** Confirms the OTP and signs in, or routes to registration for new numbers. */
  verifyCode: async (code: string): Promise<'signed_in' | 'needs_registration'> => {
    if (!flow.verification) {
      throw new Error('No pending verification');
    }
    // A confirmed code cannot be confirmed twice; reuse its token when retrying with the other role.
    const idToken = flow.idToken ?? (await flow.verification.confirm(code));
    flow.idToken = idToken;
    const result = await api.auth.signInWithFirebase(idToken, flow.role);
    if (result.status === 'registration_required') {
      return 'needs_registration';
    }
    const { user, ...tokens } = result;
    await session.signIn(tokens, user);
    return 'signed_in';
  },

  /** A fresh ID token for registration (Firebase tokens expire after an hour). */
  idTokenForRegistration: async (): Promise<string> => {
    const fresh = await phoneAuth.currentIdToken();
    const token = fresh ?? flow.idToken;
    if (!token) {
      throw new Error('Phone not verified');
    }
    return token;
  },

  reset: (): void => {
    flow.phone = null;
    flow.verification = null;
    flow.idToken = null;
  },
};

/** Clears everything cached for the signed-out user (auth flow, Firebase phone session, query cache). */
export function clearSignedOutState(): void {
  authFlow.reset();
  void phoneAuth.signOut().catch(() => undefined);
  queryClient.clear();
}

/** Revokes the refresh token (best effort), clears local state and returns to welcome. */
export async function signOut(): Promise<void> {
  const refreshToken = session.getState().tokens?.refreshToken;
  if (refreshToken) {
    await api.auth.logout(refreshToken).catch(() => undefined);
  }
  await phoneAuth.signOut().catch(() => undefined);
  await session.clear();
  authFlow.reset();
  queryClient.clear();
  router.replace('/');
}
