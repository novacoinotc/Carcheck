'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Brain,
  TrendingUp,
  MessageCircleQuestion,
} from 'lucide-react';

interface PreviewReport {
  vehicle: {
    vin?: string;
    plate?: string;
    make: string | null;
    model: string | null;
    year: number | null;
    body: string | null;
    plant: string | null;
  };
  sources: Array<{
    key: string;
    name: string;
    status: string;
    cached: boolean;
    response_time_ms: number;
    cost_usd: number;
    error?: string;
  }>;
  baseline: {
    score: number;
    level: 'green' | 'yellow' | 'red' | 'unknown';
    redFlags: string[];
    greenFlags: string[];
    coverage: { requested: number; completed: number; failed: number; pct: number };
  };
  ai: {
    analysis: {
      risk_score: number;
      risk_level: 'green' | 'yellow' | 'red';
      confidence: number;
      executive_summary: string;
      red_flags: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        finding: string;
        sources: string[];
      }>;
      green_flags: Array<{ finding: string; sources: string[] }>;
      cross_source_findings: Array<{
        finding: string;
        sources: string[];
        explanation: string;
      }>;
      recommendations: Array<{
        priority: 'must_check' | 'should_check' | 'nice_to_check';
        action: string;
        reason: string;
      }>;
      questions_for_seller: string[];
      market_context?: {
        fair_price_mxn?: { low: number; mid: number; high: number };
        comparable_listings?: number;
        market_notes?: string;
      };
    };
    meta: {
      model: string;
      promptVersion: string;
      inputTokens: number;
      cachedInputTokens: number;
      cacheWriteTokens: number;
      outputTokens: number;
      costUsd: number;
      latencyMs: number;
    };
  } | null;
  ai_error: string | null;
  totals: {
    sources_requested: number;
    sources_succeeded: number;
    sources_failed: number;
    cache_hits: number;
    total_query_time_ms: number;
    total_cost_usd: number;
  };
}

const EXAMPLES = [
  { vin: '5YJ3E1EA0KF317432', label: 'Tesla Model 3 (2019)' },
  { vin: '1HGCM82633A123456', label: 'Honda Accord (2003)' },
  { vin: 'WBA8E9G50GNT85932', label: 'BMW 320i (2016)' },
];

export function PreviewReportClient() {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PreviewReport | null>(null);

  async function run(vinValue: string) {
    if (vinValue.length !== 17) {
      toast.error('VIN debe ser de 17 caracteres');
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch(`/api/reports/preview?vin=${encodeURIComponent(vinValue)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Error');
        return;
      }
      setReport(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-card p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(vin);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/\s/g, ''))}
            maxLength={17}
            placeholder="Pega un VIN de 17 caracteres"
            className="flex-1 h-12 rounded-md border bg-background px-4 font-mono text-base uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="VIN"
          />
          <button
            type="submit"
            disabled={loading || vin.length !== 17}
            className="h-12 rounded-md bg-primary px-8 font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Corriendo reporte…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar reporte
              </>
            )}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3 text-sm">
          <span className="text-muted-foreground">Ejemplos:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.vin}
              type="button"
              onClick={() => {
                setVin(ex.vin);
                void run(ex.vin);
              }}
              className="text-primary hover:underline"
            >
              {ex.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Consultando NHTSA, VinAudit NMVTIS, VinAudit Market y MarketCheck en paralelo…</p>
            <p>Después Claude AI interpreta toda la data. Esto puede tomar 10-30 segundos.</p>
          </div>
        ) : null}
      </div>

      {report ? <ReportView report={report} /> : null}
    </div>
  );
}

function ReportView({ report }: { report: PreviewReport }) {
  const finalScore = report.ai?.analysis.risk_score ?? report.baseline.score;
  const finalLevel = report.ai?.analysis.risk_level ?? report.baseline.level;

  return (
    <div className="space-y-6">
      <RiskHeader
        vehicle={report.vehicle}
        score={finalScore}
        level={finalLevel}
        confidence={report.ai?.analysis.confidence}
      />

      {report.ai ? (
        <ExecutiveSummary
          summary={report.ai.analysis.executive_summary}
          marketContext={report.ai.analysis.market_context}
        />
      ) : report.ai_error ? (
        <div className="rounded-2xl border border-risk-yellow/30 bg-risk-yellow/5 p-6">
          <p className="font-semibold mb-2">
            <AlertTriangle className="h-5 w-5 text-risk-yellow inline mr-2" />
            Análisis IA no disponible
          </p>
          <p className="text-sm text-muted-foreground">
            {report.ai_error}. El reporte muestra solo el análisis heurístico.
          </p>
        </div>
      ) : null}

      {report.ai && report.ai.analysis.red_flags.length > 0 ? (
        <FlagsSection
          title="Señales de alerta"
          icon={AlertOctagon}
          variant="red"
          flags={report.ai.analysis.red_flags.map((f) => ({
            text: f.finding,
            severity: f.severity,
            sources: f.sources,
          }))}
        />
      ) : null}

      {report.ai && report.ai.analysis.green_flags.length > 0 ? (
        <FlagsSection
          title="Señales positivas"
          icon={ShieldCheck}
          variant="green"
          flags={report.ai.analysis.green_flags.map((f) => ({
            text: f.finding,
            sources: f.sources,
          }))}
        />
      ) : null}

      {report.ai && report.ai.analysis.cross_source_findings.length > 0 ? (
        <CrossSourceSection findings={report.ai.analysis.cross_source_findings} />
      ) : null}

      {report.ai && report.ai.analysis.recommendations.length > 0 ? (
        <RecommendationsSection recommendations={report.ai.analysis.recommendations} />
      ) : null}

      {report.ai && report.ai.analysis.questions_for_seller.length > 0 ? (
        <QuestionsSection questions={report.ai.analysis.questions_for_seller} />
      ) : null}

      <SourcesTable sources={report.sources} totals={report.totals} aiMeta={report.ai?.meta} />
    </div>
  );
}

function RiskHeader({
  vehicle,
  score,
  level,
  confidence,
}: {
  vehicle: PreviewReport['vehicle'];
  score: number;
  level: 'green' | 'yellow' | 'red' | 'unknown';
  confidence?: number;
}) {
  const colorClass =
    level === 'green'
      ? 'text-risk-green border-risk-green/30 bg-risk-green/10'
      : level === 'yellow'
        ? 'text-risk-yellow border-risk-yellow/30 bg-risk-yellow/10'
        : level === 'red'
          ? 'text-risk-red border-risk-red/30 bg-risk-red/10'
          : 'text-muted-foreground border-border bg-muted/30';
  const label =
    level === 'green'
      ? 'Riesgo BAJO'
      : level === 'yellow'
        ? 'Riesgo MEDIO'
        : level === 'red'
          ? 'Riesgo ALTO'
          : 'Sin datos suficientes';

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehículo</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            {vehicle.make ?? '—'} {vehicle.model ?? ''} {vehicle.year ?? ''}
          </h2>
          {vehicle.body ? <p className="text-muted-foreground">{vehicle.body}</p> : null}
          {vehicle.plant ? (
            <p className="text-sm text-muted-foreground">Planta: {vehicle.plant}</p>
          ) : null}
          {vehicle.vin ? (
            <p className="font-mono text-sm text-muted-foreground mt-2">VIN: {vehicle.vin}</p>
          ) : null}
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center min-w-44 ${colorClass}`}>
          <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
          <p className="text-5xl font-bold mt-1">{score}</p>
          <p className="text-xs opacity-70">/ 100</p>
          {confidence !== undefined ? (
            <p className="text-xs mt-2 opacity-70">Confianza: {Math.round(confidence)}%</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type AiAnalysis = NonNullable<PreviewReport['ai']>['analysis'];
type MarketContext = AiAnalysis['market_context'];

function ExecutiveSummary({
  summary,
  marketContext,
}: {
  summary: string;
  marketContext?: MarketContext;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        Resumen ejecutivo
      </h3>
      <p className="text-base leading-relaxed whitespace-pre-wrap">{summary}</p>
      {marketContext?.fair_price_mxn ? (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-2 inline-flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Precio justo de mercado
          </h4>
          <p className="text-sm text-muted-foreground">
            ${marketContext.fair_price_mxn.low.toLocaleString()} — $
            {marketContext.fair_price_mxn.high.toLocaleString()} MXN (promedio $
            {marketContext.fair_price_mxn.mid.toLocaleString()})
            {marketContext.comparable_listings
              ? ` · ${marketContext.comparable_listings} comparables`
              : ''}
          </p>
          {marketContext.market_notes ? (
            <p className="text-sm mt-2">{marketContext.market_notes}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FlagsSection({
  title,
  icon: Icon,
  variant,
  flags,
}: {
  title: string;
  icon: typeof Sparkles;
  variant: 'green' | 'red';
  flags: Array<{ text: string; severity?: string; sources: string[] }>;
}) {
  const colorClass =
    variant === 'green' ? 'text-risk-green' : 'text-risk-red';
  const sevBadge: Record<string, string> = {
    critical: 'bg-risk-red text-white',
    high: 'bg-risk-red/80 text-white',
    medium: 'bg-risk-yellow text-foreground',
    low: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className={`text-lg font-bold mb-4 inline-flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-5 w-5" />
        {title} ({flags.length})
      </h3>
      <ul className="space-y-3">
        {flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-1 ${colorClass}`}>•</span>
            <div className="flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-medium">{flag.text}</p>
                {flag.severity ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${sevBadge[flag.severity] ?? ''}`}
                  >
                    {flag.severity}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fuentes: {flag.sources.join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CrossSourceSection({
  findings,
}: {
  findings: Array<{ finding: string; sources: string[]; explanation: string }>;
}) {
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
      <h3 className="text-lg font-bold mb-2 inline-flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        Hallazgos cruzados entre fuentes
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Patrones detectados al combinar múltiples fuentes (esto es donde la IA agrega valor real).
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

function RecommendationsSection({
  recommendations,
}: {
  recommendations: Array<{
    priority: 'must_check' | 'should_check' | 'nice_to_check';
    action: string;
    reason: string;
  }>;
}) {
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
      <h3 className="text-lg font-bold mb-4">Recomendaciones</h3>
      <ul className="space-y-3">
        {recommendations.map((r, i) => (
          <li key={i} className="border-l-4 border-primary pl-4 py-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${priorityColor[r.priority]}`}
              >
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

function QuestionsSection({ questions }: { questions: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-lg font-bold mb-4 inline-flex items-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        Preguntas para el vendedor
      </h3>
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

function SourcesTable({
  sources,
  totals,
  aiMeta,
}: {
  sources: PreviewReport['sources'];
  totals: PreviewReport['totals'];
  aiMeta?: NonNullable<PreviewReport['ai']>['meta'];
}) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold mb-2">Fuentes consultadas</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            <CheckCircle2 className="h-4 w-4 text-risk-green inline mr-1" />
            {totals.sources_succeeded} exitosas
          </span>
          <span>
            <XCircle className="h-4 w-4 text-risk-red inline mr-1" />
            {totals.sources_failed} fallidas
          </span>
          <span>
            <Clock className="h-4 w-4 inline mr-1" />
            {totals.total_query_time_ms}ms total
          </span>
          {totals.cache_hits > 0 ? <span>· {totals.cache_hits} de caché</span> : null}
          <span>
            Costo:{' '}
            <strong className="text-foreground">${totals.total_cost_usd.toFixed(3)} USD</strong>
          </span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="px-6 py-3 font-medium">Fuente</th>
            <th className="px-6 py-3 font-medium">Estado</th>
            <th className="px-6 py-3 font-medium text-right">Tiempo</th>
            <th className="px-6 py-3 font-medium text-right">Costo</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.key} className="border-t">
              <td className="px-6 py-3">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
              </td>
              <td className="px-6 py-3">
                <StatusBadge status={s.status} cached={s.cached} error={s.error} />
              </td>
              <td className="px-6 py-3 text-right text-muted-foreground">
                {s.response_time_ms}ms
              </td>
              <td className="px-6 py-3 text-right text-muted-foreground">
                ${s.cost_usd.toFixed(3)}
              </td>
            </tr>
          ))}
          {aiMeta ? (
            <tr className="border-t bg-primary/5">
              <td className="px-6 py-3">
                <p className="font-medium inline-flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Análisis IA — {aiMeta.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  in {aiMeta.inputTokens} (cached {aiMeta.cachedInputTokens}) · out{' '}
                  {aiMeta.outputTokens} tokens
                </p>
              </td>
              <td className="px-6 py-3">
                <span className="text-xs px-2 py-1 rounded bg-risk-green/20 text-risk-green font-semibold">
                  SUCCESS
                </span>
              </td>
              <td className="px-6 py-3 text-right text-muted-foreground">{aiMeta.latencyMs}ms</td>
              <td className="px-6 py-3 text-right text-muted-foreground">
                ${aiMeta.costUsd.toFixed(3)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({
  status,
  cached,
  error,
}: {
  status: string;
  cached: boolean;
  error?: string;
}) {
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
      title={error}
    >
      {cached ? 'CACHE' : status}
    </span>
  );
}
