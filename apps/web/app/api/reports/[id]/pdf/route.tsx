import { renderToBuffer } from '@react-pdf/renderer';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { getReportDetail } from '@/lib/reports/queries';
import { ReportDocument } from '@/lib/pdf/report-document';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token');

  // Public/share access via token: bypass ownership check (token validated elsewhere).
  // Otherwise require a signed-in user and scope to their reports.
  let dbUserId: string | null = null;
  if (!token) {
    const user = await syncCurrentUser();
    if (!user) {
      return new Response('No autorizado', { status: 401 });
    }
    dbUserId = user.dbUserId;
  }

  const report = await getReportDetail(id, dbUserId);
  if (!report) {
    return new Response('Reporte no encontrado', { status: 404 });
  }

  const buffer = await renderToBuffer(<ReportDocument report={report} />);
  const filename = `carcheck-${report.vin ?? report.id}.pdf`;

  return new Response(buffer as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
