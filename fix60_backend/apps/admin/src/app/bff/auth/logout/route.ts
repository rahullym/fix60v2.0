import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies, REFRESH_COOKIE } from '@/shared/session/session-cookies';
import { callApi } from '@/shared/session/upstream';

/** Revokes the refresh token on the API (best effort) and clears the cookies. */
export async function POST(request: NextRequest): Promise<Response> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await callApi(request, 'POST', '/admin/auth/logout', { body: JSON.stringify({ refreshToken }) });
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
