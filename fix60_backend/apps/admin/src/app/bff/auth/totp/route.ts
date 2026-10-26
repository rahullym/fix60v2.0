import { NextResponse, type NextRequest } from 'next/server';
import type { AdminSessionResponse } from '@fix60/shared';
import { setSessionCookies } from '@/shared/session/session-cookies';
import { callApi, relay } from '@/shared/session/upstream';

/** Step 2: TOTP code → session. Tokens go into httpOnly cookies; only the admin profile reaches the browser. */
export async function POST(request: NextRequest): Promise<Response> {
  const result = await callApi(request, 'POST', '/admin/auth/totp', { body: await request.text() });
  if (result.status !== 200) {
    return relay(result);
  }
  const { admin, ...tokens } = result.body as AdminSessionResponse;
  const response = NextResponse.json({ admin });
  setSessionCookies(response, tokens);
  return response;
}
