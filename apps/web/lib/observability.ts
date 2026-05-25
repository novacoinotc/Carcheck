import * as Sentry from '@sentry/nextjs';

/**
 * Wraps an async API route handler to ensure thrown errors reach Sentry
 * and return a clean JSON 500 response. Use for all `/api/*` routes.
 */
export function withErrorTracking<TArgs extends unknown[], TResult>(
  name: string,
  handler: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult | Response> {
  return async (...args: TArgs) => {
    return Sentry.withScope(async (scope) => {
      scope.setTag('handler', name);
      try {
        return await handler(...args);
      } catch (err) {
        Sentry.captureException(err, { tags: { handler: name } });
        console.error(`[${name}] unhandled error`, err);
        return new Response(
          JSON.stringify({
            error: {
              code: 'internal_error',
              message: 'Algo salió mal. Reintenta o contáctanos si persiste.',
            },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    });
  };
}

/**
 * Tag the current scope with the report context. Call early in any route
 * touching reports so failures are grouped sensibly.
 */
export function tagReport(reportId: string, vin?: string | null, plate?: string | null): void {
  Sentry.setTag('report_id', reportId);
  if (vin) Sentry.setTag('vin', vin);
  if (plate) Sentry.setTag('plate', plate);
}
