import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/shared/session/session-cookies';
import { callApi, errorBody, relay } from '@/shared/session/upstream';

type Context = { params: Promise<{ path: string[] }> };

/** Token-handling auth routes go through /bff/auth/* so tokens never reach the browser. */
const TOKEN_ROUTES = new Set(['/admin/auth/login', '/admin/auth/totp', '/admin/auth/refresh', '/admin/auth/logout']);

/** Only admin and public endpoints are reachable through the dashboard proxy. */
function isAllowedPath(path: string): boolean {
  return (path.startsWith('/admin/') && !TOKEN_ROUTES.has(path)) || path === '/branding' || path === '/health';
}

async function forward(request: NextRequest, context: Context): Promise<Response> {
  const { path: segments } = await context.params;
  const path = `/${segments.map(encodeURIComponent).join('/')}`;
  if (!isAllowedPath(path)) {
    return NextResponse.json(errorBody(404, 'NOT_FOUND', 'Not proxied'), { status: 404 });
  }
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken && path.startsWith('/admin/')) {
    const hasRefresh = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
    // The browser refreshes once (single-flight) on TOKEN_EXPIRED, then retries.
    return NextResponse.json(
      errorBody(401, hasRefresh ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED', 'Session required'),
      { status: 401 },
    );
  }
  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';
  return relay(
    await callApi(request, request.method, path, {
      accessToken,
      search: request.nextUrl.search,
      body: hasBody ? await request.text() : null,
    }),
  );
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
