import { NextResponse } from 'next/server';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { getReportDetail } from '@/lib/reports/queries';
import { createShareLink } from '@/lib/reports/sharing';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;

  let user;
  try {
    user = await syncCurrentUser();
  } catch (err) {
    console.error('[reports/share] user sync failed', err);
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

  const report = await getReportDetail(id, user.dbUserId);
  if (!report) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Reporte no encontrado' } },
      { status: 404 },
    );
  }

  try {
    const { token } = await createShareLink(id, user.dbUserId);
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/share/${token}`;
    return NextResponse.json({ token, url });
  } catch (err) {
    console.error('[reports/share] failed to create share link', err);
    return NextResponse.json(
      { error: { code: 'share_failed', message: 'No se pudo crear el enlace' } },
      { status: 500 },
    );
  }
}
