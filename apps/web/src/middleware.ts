/**
 * Next.js Middleware
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 476-514
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/forgot-password', '/book'];
const authRoutes = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth state from cookie/localStorage is not available in middleware
  // We'll check for the presence of the auth-storage in cookies
  const authStorage = request.cookies.get('auth-storage')?.value;
  let isAuthenticated = false;

  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      isAuthenticated = parsed.state?.isAuthenticated === true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Public booking pages
  if (pathname.startsWith('/book/')) {
    return NextResponse.next();
  }

  // Auth pages - redirect to dashboard if logged in
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not logged in
  if (!publicRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
