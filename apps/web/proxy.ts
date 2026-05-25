import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/decode(.*)',
  '/precios',
  '/fuentes',
  '/ejemplo',
  '/para-empresas',
  '/privacidad',
  '/terminos',
  '/cumplimiento',
  '/contacto',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/share/(.*)',
  '/api/v1/decode',
  '/api/reports/preview',
  '/api/webhooks/(.*)',
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/reports/create',
]);

export default clerkMiddleware(async (auth, request) => {
  // app.carcheckmx.com is the app surface — its root goes straight to the dashboard.
  const host = request.headers.get('host') ?? '';
  if (host.startsWith('app.') && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublicRoute(request)) return;
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
  return;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
