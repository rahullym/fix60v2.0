import { NextResponse, type NextRequest } from 'next/server';
import type { AuthTokens } from '@fix60/shared';
import { clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from '@/shared/session/session-cookies';
import { callApi, errorBody, relay } from '@/shared/session/upstream';

/**
 * Rotates the refresh token. The browser calls this single-flight: the API treats a reused
 * refresh token as theft and revokes the session, so parallel refreshes must never happen.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(errorBody(401, 'UNAUTHENTICATED', 'No session'), { status: 401 });
  }
  const result = await callApi(request, 'POST', '/admin/auth/refresh', {
    body: JSON.stringify({ refreshToken }),
  });
  if (result.status !== 200) {
    const response = relay(result);
    clearSessionCookies(response);
    return response;
  }
  const response = new NextResponse(null, { status: 204 });
  setSessionCookies(response, result.body as AuthTokens);
  return response;
}
