import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Brain,
  Sparkles,
  MessageCircleQuestion,
  ArrowLeft,
  TrendingUp,
  Clock,
  Database,
  Loader2,
} from 'lucide-react';
import { requireDbUser } from '@/lib/auth/sync-user';
import { getReportDetail } from '@/lib/reports/queries';
import { formatDate, formatMXN } from '@/lib/utils';

type ReportPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ReportPageProps) {
  const { id } = await params;
  return {
    title: `Reporte ${id.slice(0, 8)}`,
  };
}

export default function ReportDetailPage({ params }: ReportPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando reporte…
        </div>
      }
    >
      <ReportContent params={params} />
    </Suspense>
  );
}

async function ReportContent({ params }: ReportPageProps) {
  const { id } = await params;
  const user = await requireDbUser();
  const report = await getReportDetail(id, user.dbUserId);
  if (!report) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis reportes
        </Link>
      </div>

      <RiskHeader report={report} />

      {report.ai?.executiveSummary ? (
        <ExecutiveSection
          summary={report.ai.executiveSummary}
          marketContext={report.ai.marketContext}
        />
      ) : null}

      <FlagsBlock
        title="Señales de alerta"
        icon={AlertOctagon}
        variant="red"
        flags={(report.ai?.redFlags as Array<{ severity: string; finding: string; sources: string[] }>) ?? []}
      />

      <FlagsBlock
        title="Señales positivas"
        icon={ShieldCheck}
        variant="green"
        flags={(report.ai?.greenFlags as Array<{ finding: string; sources: string[] }>) ?? []}
      />

      <CrossSourceBlock
        findings={(report.ai?.crossSourceFindings as Array<{
          finding: string;
          sources: string[];
          explanation: string;
        }>) ?? []}
      />

      <RecommendationsBlock
        recommendations={(report.ai?.recommendations as Array<{
          priority: 'must_check' | 'should_check' | 'nice_to_check';
          action: string;
          reason: string;
        }>) ?? []}
      />

      <QuestionsBlock questions={(report.ai?.questionsForSeller as string[]) ?? []} />

      <SourcesBlock report={report} />
    </div>
  );
}

function RiskHeader({ report }: { report: NonNullable<Awaited<ReturnType<typeof getReportDetail>>> }) {
  const config: Record<string, { color: string; label: string; icon: typeof ShieldCheck }> = {
    green: { color: 'text-risk-green border-risk-green/30 bg-risk-green/10', label: 'Riesgo BAJO', icon: ShieldCheck },
    yellow: { color: 'text-risk-yellow border-risk-yellow/30 bg-risk-yellow/10', label: 'Riesgo MEDIO', icon: AlertTriangle },
    red: { color: 'text-risk-red border-risk-red/30 bg-risk-red/10', label: 'Riesgo ALTO', icon: AlertOctagon },
    unknown: { color: 'text-muted-foreground border-border bg-muted/30', label: 'Sin datos suficientes', icon: HelpCircle },
  };
  const c = config[report.riskLevel] ?? config.unknown!;
  const Icon = c.icon;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehículo</p>
          <h1 className="text-2xl md:text-3xl font-bold">
            {report.vehicle.make ?? '—'} {report.vehicle.model ?? ''} {report.vehicle.year ?? ''}
          </h1>
          {report.vehicle.body ? (
            <p className="text-muted-foreground">{report.vehicle.body}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {report.vin ? (
              <span className="font-mono">VIN: {report.vin}</span>
            ) : null}
            {report.plate ? (
              <span className="font-mono">Placa: {report.plate}{report.plateState ? ` (${report.plateState})` : ''}</span>
            ) : null}
            <span>Generado: {formatDate(report.createdAt)}</span>
          </div>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center min-w-44 ${c.color}`}>
          <Icon className="h-6 w-6 mx-auto mb-1 opacity-80" />
          <p className="text-xs uppercase tracking-wide opacity-80">{c.label}</p>
          <p className="text-5xl font-bold mt-1">{report.riskScore ?? '—'}</p>
          <p className="text-xs opacity-70">/ 100</p>
          {report.ai?.confidence ? (
            <p className="text-xs mt-2 opacity-70">
              Confianza: {Math.round(parseFloat(report.ai.confidence))}%
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExecutiveSection({
  summary,
  marketContext,
}: {
  summary: string;
  marketContext: unknown;
}) {
  const mc = marketContext as
    | { fair_price_mxn?: { low: number; mid: number; high: number }; comparable_listings?: number; market_notes?: string }
    | undefined
    | null;
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        Resumen ejecutivo
      </h2>
      <p className="text-base leading-relaxed whitespace-pre-wrap">{summary}</p>
      {mc?.fair_price_mxn ? (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2 inline-flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Precio justo de mercado
          </h3>
          <p className="text-sm">
            {formatMXN(mc.fair_price_mxn.low * 100)} – {formatMXN(mc.fair_price_mxn.high * 100)}{' '}
            (promedio {formatMXN(mc.fair_price_mxn.mid * 100)})
          </p>
          {mc.market_notes ? <p className="text-sm mt-2">{mc.market_notes}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function FlagsBlock<T extends { finding: string; sources: string[]; severity?: string }>({
  title,
  icon: Icon,
  variant,
  flags,
}: {
  title: string;
  icon: typeof ShieldCheck;
  variant: 'red' | 'green';
  flags: T[];
}) {
  if (!flags?.length) return null;
  const colorClass = variant === 'red' ? 'text-risk-red' : 'text-risk-green';
  const sevBadge: Record<string, string> = {
    critical: 'bg-risk-red text-white',
    high: 'bg-risk-red/80 text-white',
    medium: 'bg-risk-yellow text-foreground',
    low: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className={`text-lg font-bold mb-4 inline-flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-5 w-5" />
        {title} ({flags.length})
      </h2>
      <ul className="space-y-3">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-1 ${colorClass}`}>•</span>
            <div className="flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-medium">{f.finding}</p>
                {f.severity ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${sevBadge[f.severity] ?? ''}`}
                  >
                    {f.severity}
                  </span>
                ) : null}
              </div>
              {f.sources?.length ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Fuentes: {f.sources.join(', ')}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CrossSourceBlock({
  findings,
}: {
  findings: Array<{ finding: string; sources: string[]; explanation: string }>;
}) {
  if (!findings?.length) return null;
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
      <h2 className="text-lg font-bold mb-2 inline-flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        Hallazgos cruzados entre fuentes ({findings.length})
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Patrones que solo se detectan combinando múltiples fuentes.
      </p>
      <ul className="space-y-4">
        {findings.map((f, i) => (
          <li key={i} className="rounded-lg bg-card border p-4">
            <p className="font-semibold mb-1">{f.finding}</p>
            <p className="text-sm text-muted-foreground mb-2">{f.explanation}</p>
            <p className="text-xs text-muted-foreground">Cruce de: {f.sources.join(' + ')}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationsBlock({
  recommendations,
}: {
  recommendations: Array<{
    priority: 'must_check' | 'should_check' | 'nice_to_check';
    action: string;
    reason: string;
  }>;
}) {
  if (!recommendations?.length) return null;
  const priorityLabel: Record<string, string> = {
    must_check: 'OBLIGATORIO',
    should_check: 'RECOMENDADO',
    nice_to_check: 'OPCIONAL',
  };
  const priorityColor: Record<string, string> = {
    must_check: 'bg-risk-red text-white',
    should_check: 'bg-risk-yellow text-foreground',
    nice_to_check: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-bold mb-4">Recomendaciones ({recommendations.length})</h2>
      <ul className="space-y-3">
        {recommendations.map((r, i) => (
          <li key={i} className="border-l-4 border-primary pl-4 py-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityColor[r.priority]}`}>
                {priorityLabel[r.priority]}
              </span>
              <span className="font-medium">{r.action}</span>
            </div>
            <p className="text-sm text-muted-foreground">{r.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionsBlock({ questions }: { questions: string[] }) {
  if (!questions?.length) return null;
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-bold mb-4 inline-flex items-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        Preguntas para el vendedor ({questions.length})
      </h2>
      <ol className="space-y-2">
        {questions.map((q, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-primary font-bold text-sm mt-0.5">{i + 1}.</span>
            <p>{q}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SourcesBlock({ report }: { report: NonNullable<Awaited<ReturnType<typeof getReportDetail>>> }) {
  const succeeded = report.sources.filter(
    (s) => s.status === 'success' || s.status === 'partial' || s.status === 'cached',
  );
  const failed = report.sources.filter((s) => s.status === 'failed' || s.status === 'timeout');
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-lg font-bold mb-2 inline-flex items-center gap-2">
          <Database className="h-5 w-5" />
          Fuentes consultadas ({report.sources.length})
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            <ShieldCheck className="h-4 w-4 text-risk-green inline mr-1" />
            {succeeded.length} exitosas
          </span>
          <span>
            <AlertOctagon className="h-4 w-4 text-risk-red inline mr-1" />
            {failed.length} fallidas
          </span>
          {report.totalQueryTimeMs ? (
            <span>
              <Clock className="h-4 w-4 inline mr-1" />
              {(report.totalQueryTimeMs / 1000).toFixed(1)}s
            </span>
          ) : null}
          <span>Costo backend: ${parseFloat(report.totalCostUsd).toFixed(3)} USD</span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="px-6 py-3 font-medium">Fuente</th>
            <th className="px-6 py-3 font-medium">País</th>
            <th className="px-6 py-3 font-medium">Estado</th>
            <th className="px-6 py-3 font-medium text-right">Tiempo</th>
            <th className="px-6 py-3 font-medium text-right">Costo</th>
          </tr>
        </thead>
        <tbody>
          {report.sources.map((s) => (
            <tr key={s.sourceKey} className="border-t">
              <td className="px-6 py-3">
                <p className="font-medium">{s.name ?? s.sourceKey}</p>
                <p className="text-xs text-muted-foreground font-mono">{s.sourceKey}</p>
              </td>
              <td className="px-6 py-3 text-xs uppercase text-muted-foreground">
                {s.country ?? '—'}
              </td>
              <td className="px-6 py-3">
                <StatusBadge status={s.status} cached={s.cached} />
              </td>
              <td className="px-6 py-3 text-right text-muted-foreground">
                {s.responseTimeMs ?? 0}ms
              </td>
              <td className="px-6 py-3 text-right text-muted-foreground">
                ${parseFloat(s.costUsd).toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, cached }: { status: string; cached: boolean }) {
  const cls: Record<string, string> = {
    success: 'bg-risk-green/20 text-risk-green',
    partial: 'bg-risk-yellow/20 text-risk-yellow',
    cached: 'bg-primary/20 text-primary',
    failed: 'bg-risk-red/20 text-risk-red',
    timeout: 'bg-risk-red/20 text-risk-red',
    skipped: 'bg-muted text-muted-foreground',
    not_applicable: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded font-semibold uppercase ${cls[status] ?? 'bg-muted'}`}
    >
      {cached ? 'CACHE' : status}
    </span>
  );
}
