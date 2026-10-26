import { NextResponse, type NextRequest } from 'next/server';

const REFRESH_COOKIE = 'fix60_admin_rt';

/** Optimistic redirect only; the API authorises every call. */
export function proxy(request: NextRequest): NextResponse {
  const isSignedIn = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname.startsWith('/login');
  if (!isSignedIn && !isLogin) {
    const url = new URL('/login', request.url);
    if (request.nextUrl.pathname !== '/') {
      url.searchParams.set('next', request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }
  if (isSignedIn && isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!bff|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)'],
};
