import { NextResponse } from 'next/server';
import { runPreviewReport } from '@/lib/orchestrator/run-preview';
import { vinSchema } from '@carcheck/shared-types';
import { ZodError } from 'zod';

export const maxDuration = 300;

/**
 * Public preview endpoint — runs the orchestrator + Claude AI analysis end-to-end
 * with whatever Vercel-side source clients are enabled and have credentials.
 *
 * Phase 2 launches with: NHTSA vPIC, NHTSA Recalls, VinAudit NMVTIS, VinAudit Market,
 * MarketCheck History (paid sources are gracefully skipped if env keys are missing).
 *
 * Phase 3+ will add scraper sources via the Railway service.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const vinRaw = searchParams.get('vin');

  if (!vinRaw) {
    return NextResponse.json(
      { error: { code: 'missing_vin', message: 'Falta el parámetro vin' } },
      { status: 400 },
    );
  }

  try {
    const vin = vinSchema.parse(vinRaw);
    const report = await runPreviewReport({ vin });
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: { code: 'invalid_vin', message: 'VIN inválido', details: err.issues } },
        { status: 400 },
      );
    }
    console.error('[preview] internal error', err);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 },
    );
  }
}
