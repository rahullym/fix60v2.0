import { NextResponse, type NextRequest } from 'next/server';
import type { AdminLoginResponse } from '@fix60/shared';
import { setSessionCookies } from '@/shared/session/session-cookies';
import { callApi, relay } from '@/shared/session/upstream';

/**
 * Step 1: email + password → TOTP challenge. When TOTP is not required (dev only),
 * the API answers with tokens straight away; they go into cookies, never the response body.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const result = await callApi(request, 'POST', '/admin/auth/login', { body: await request.text() });
  const body = result.body as AdminLoginResponse | null;
  if (result.status !== 200 || body?.status !== 'authenticated') {
    return relay(result);
  }
  const { admin, accessToken, refreshToken, accessTokenExpiresIn } = body;
  const response = NextResponse.json({ status: 'authenticated', admin });
  setSessionCookies(response, { accessToken, refreshToken, accessTokenExpiresIn });
  return response;
}
