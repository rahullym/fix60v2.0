import 'server-only';
import type { NextResponse } from 'next/server';
import type { AuthTokens } from '@fix60/shared';
import { serverEnv } from '../config/server-env';

export const ACCESS_COOKIE = 'fix60_admin_at';
export const REFRESH_COOKIE = 'fix60_admin_rt';

/** Admin refresh tokens live 12h on the API (ADMIN_REFRESH_TOKEN_TTL_HOURS). */
const REFRESH_MAX_AGE_SECONDS = 12 * 60 * 60;

const baseCookie = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: serverEnv.NODE_ENV === 'production',
  path: '/',
};

/** Writes the token pair as httpOnly cookies on a response. */
export function setSessionCookies(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookie,
    maxAge: Math.max(30, tokens.accessTokenExpiresIn - 15),
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...baseCookie, maxAge: REFRESH_MAX_AGE_SECONDS });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, '', { ...baseCookie, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...baseCookie, maxAge: 0 });
}
