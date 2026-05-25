import { NextResponse } from 'next/server';
import { nhtsaVpicClient, nhtsaRecallsClient } from '@carcheck/sources';
import { vinSchema, isValidVinChecksum } from '@carcheck/shared-types';
import { ZodError } from 'zod';

/**
 * Public VIN decoder endpoint — free, no auth, no payment.
 * Marketing gateway that proves CarCheck quality before paywall.
 * Runs NHTSA vPIC (decode) + NHTSA Recalls in parallel.
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
    const checksumValid = isValidVinChecksum(vin);

    const [decodeResult, recallsResult] = await Promise.all([
      nhtsaVpicClient.fetch({ vin }),
      nhtsaRecallsClient.fetch({ vin }),
    ]);

    if (decodeResult.status === 'failed' || decodeResult.status === 'timeout') {
      return NextResponse.json(
        {
          error: {
            code: decodeResult.status,
            message: decodeResult.errorMessage ?? 'NHTSA no respondió',
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      vin,
      checksum_valid: checksumValid,
      decoded: decodeResult.parsedData,
      recalls: recallsResult.status === 'success' ? recallsResult.parsedData : null,
      meta: {
        sources: [
          {
            key: decodeResult.sourceKey,
            status: decodeResult.status,
            ms: decodeResult.responseTimeMs,
            err: decodeResult.errorMessage,
          },
          {
            key: recallsResult.sourceKey,
            status: recallsResult.status,
            ms: recallsResult.responseTimeMs,
            err: recallsResult.errorMessage,
            http: recallsResult.httpStatus,
          },
        ],
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_vin',
            message: 'VIN inválido',
            details: err.issues,
          },
        },
        { status: 400 },
      );
    }
    console.error('[decode] internal error', err);
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
