import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
