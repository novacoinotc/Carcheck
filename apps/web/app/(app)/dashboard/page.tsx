import Link from 'next/link';
import { Suspense } from 'react';
import { Plus, FileSearch, AlertOctagon, AlertTriangle, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { requireDbUser } from '@/lib/auth/sync-user';
import { listUserReports } from '@/lib/reports/queries';
import { formatRelativeTime } from '@/lib/utils';

export const metadata = {
  title: 'Mis reportes',
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando reportes…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await requireDbUser();
  const reports = await listUserReports(user.dbUserId, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis reportes</h1>
          <p className="text-muted-foreground mt-1">
            {reports.length === 0
              ? 'Aún no has generado ningún reporte'
              : `${reports.length} reporte${reports.length === 1 ? '' : 's'} generado${reports.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo reporte
        </Link>
      </div>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30 text-sm">
              <tr className="text-left">
                <th className="px-6 py-3 font-medium">Vehículo</th>
                <th className="px-6 py-3 font-medium">VIN / Placa</th>
                <th className="px-6 py-3 font-medium">Riesgo</th>
                <th className="px-6 py-3 font-medium">Cobertura</th>
                <th className="px-6 py-3 font-medium">Creado</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium">
                      {r.vehicle.make ?? '—'} {r.vehicle.model ?? ''}{' '}
                      {r.vehicle.year ?? ''}
                    </p>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {r.vin ?? r.plate ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <RiskBadge level={r.riskLevel} score={r.riskScore} />
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {r.sourcesCompleted}/{r.sourcesRequested} fuentes
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {formatRelativeTime(r.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/dashboard/reports/${r.id}` as never}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Ver reporte →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
      <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Empieza tu primer reporte</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Captura el VIN del auto que quieres auditar. Generamos el reporte completo en menos de 1
        minuto.
      </p>
      <Link
        href="/dashboard/new"
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Generar reporte
      </Link>
    </div>
  );
}

function RiskBadge({ level, score }: { level: string; score: number | null }) {
  const config: Record<string, { icon: typeof ShieldCheck; cls: string; label: string }> = {
    green: { icon: ShieldCheck, cls: 'bg-risk-green/20 text-risk-green', label: 'BAJO' },
    yellow: { icon: AlertTriangle, cls: 'bg-risk-yellow/20 text-risk-yellow', label: 'MEDIO' },
    red: { icon: AlertOctagon, cls: 'bg-risk-red/20 text-risk-red', label: 'ALTO' },
    unknown: { icon: HelpCircle, cls: 'bg-muted text-muted-foreground', label: 'SIN DATOS' },
  };
  const c = config[level] ?? config.unknown!;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded ${c.cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {c.label}
      {score !== null ? <span className="opacity-70">· {score}/100</span> : null}
    </span>
  );
}
