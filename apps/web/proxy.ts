import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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
  if (isPublicRoute(request)) return;
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
