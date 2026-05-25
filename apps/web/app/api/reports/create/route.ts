import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { vinSchema, mxPlateSchema, mxStateSchema } from '@carcheck/shared-types';
import { runPreviewReport } from '@/lib/orchestrator/run-preview';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export const maxDuration = 300;

const bodySchema = z
  .object({
    vin: vinSchema.optional(),
    plate: mxPlateSchema.optional(),
    state: mxStateSchema.optional(),
    preferFastModel: z.boolean().optional(),
    tier1Only: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.vin) || Boolean(d.plate), {
    message: 'vin o plate requerido',
  });

export async function POST(request: Request): Promise<NextResponse> {
  let user;
  try {
    user = await syncCurrentUser();
  } catch (err) {
    console.error('[reports/create] user sync failed', err);
    return NextResponse.json(
      { error: { code: 'user_sync_failed', message: 'No se pudo sincronizar el usuario' } },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Necesitas iniciar sesión' } },
      { status: 401 },
    );
  }

  let parsedBody;
  try {
    const json = await request.json();
    parsedBody = bodySchema.parse(json);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: 'Datos inválidos', details: err.issues } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'JSON inválido' } },
      { status: 400 },
    );
  }

  try {
    const report = await runPreviewReport(
      {
        vin: parsedBody.vin,
        plate: parsedBody.plate,
        state: parsedBody.state,
      },
      {
        userId: user.dbUserId,
        persist: true,
        preferFastModel: parsedBody.preferFastModel,
        tier1Only: parsedBody.tier1Only,
      },
    );
    return NextResponse.json(report);
  } catch (err) {
    console.error('[reports/create] orchestrator failed', err);
    return NextResponse.json(
      {
        error: {
          code: 'orchestrator_failed',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 },
    );
  }
}
