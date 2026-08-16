import { NextRequest, NextResponse } from 'next/server';
import type { AppUser } from '@/types';

import { verifySessionToken } from '@/lib/session';

const PUBLIC_PATHS = [
  '/login',
  '/link-account',
  '/api/auth/line',
  '/api/auth/callback',
  '/api/auth/link',
  '/api/auth/admin-login',
  '/api/auth/logout',
  '/api/line', // Allow LINE Webhook & Cron
];

// API routes that are always public (data needed even without auth during migration)
const PUBLIC_API_PATHS = [
  '/api/setup',
  '/api/migrate-db',
  '/api/migrate-nco',
];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
    || PUBLIC_API_PATHS.some(p => pathname.startsWith(p))
    || pathname.startsWith('/_next')
    || pathname.startsWith('/manifest')
    || pathname.startsWith('/icons')
    || pathname === '/favicon.ico';

  if (isPublic) return NextResponse.next();

  // Allow internal server-to-server calls
  const internalToken = request.headers.get('x-internal-token');
  if (internalToken && internalToken === process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.next();
  }

  // Check session
  const sessionToken = request.cookies.get('bk100_session')?.value;
  if (!sessionToken) {
    // Not logged in — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (request.nextUrl.pathname !== '/') {
      url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }

  const user = await verifySessionToken(sessionToken);
  if (!user) {
    // Invalid/expired session — redirect to login and clear cookie
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (request.nextUrl.pathname !== '/') {
      url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    }
    const response = NextResponse.redirect(url);
    response.cookies.delete('bk100_session');
    return response;
  }

  // Role-based route protection
  const roleProtectedRoutes: { path: string; roles: string[] }[] = [
    { path: '/reports',   roles: ['admin', 'commander'] },
    { path: '/settings',  roles: ['admin'] },
    { path: '/personnel', roles: ['admin', 'duty_officer'] },
  ];

  const protectedRoute = roleProtectedRoutes.find(r => pathname.startsWith(r.path));
  if (protectedRoute && !protectedRoute.roles.includes(user.role)) {
    // Forbidden — redirect home with error
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  // Pass user info in headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.personnelId);
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-user-name', user.displayName);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
