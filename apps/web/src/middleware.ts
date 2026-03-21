/**
 * Next.js Middleware
 * Handles authentication and i18n locale detection
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/forgot-password', '/book'];
const authRoutes = ['/login', '/register', '/forgot-password'];
const internalRoutes = ['/internal'];
const internalAuthRoutes = ['/internal/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth state from cookie
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

  // Get admin auth state from cookie
  const adminStorage = request.cookies.get('admin-storage')?.value;
  let isAdminAuthenticated = false;

  if (adminStorage) {
    try {
      const parsed = JSON.parse(adminStorage);
      isAdminAuthenticated = parsed.state?.isAuthenticated === true;
    } catch {
      isAdminAuthenticated = false;
    }
  }

  // Internal admin routes
  if (pathname.startsWith('/internal')) {
    // Internal login page - redirect to tenants if already logged in
    if (internalAuthRoutes.some((route) => pathname === route)) {
      if (isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/internal/tenants', request.url));
      }
      return NextResponse.next();
    }

    // Protected internal routes - redirect to internal login if not logged in
    if (!isAdminAuthenticated) {
      return NextResponse.redirect(new URL('/internal/login', request.url));
    }
    return NextResponse.next();
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
