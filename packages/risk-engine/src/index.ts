import type { SourceResult } from '@carcheck/shared-types';

export interface RiskInput {
  sourceResults: SourceResult[];
}

export interface RiskOutput {
  score: number;
  level: 'green' | 'yellow' | 'red' | 'unknown';
  redFlags: string[];
  greenFlags: string[];
  coverage: {
    requested: number;
    completed: number;
    failed: number;
    pct: number;
  };
}

/**
 * Heuristic pre-AI risk scoring used to give users a quick number
 * while Claude generates the narrative. Final score is replaced by
 * the AI analyst output once it returns.
 */
export function computeBaselineRisk({ sourceResults }: RiskInput): RiskOutput {
  let score = 50;
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  const completed = sourceResults.filter((r) => r.status === 'success' || r.status === 'partial');
  const failed = sourceResults.filter((r) => r.status === 'failed' || r.status === 'timeout');

  for (const r of completed) {
    const facts = r.normalizedFacts ?? [];
    const get = (key: string): unknown => facts.find((f) => f.key === key)?.value;

    if (r.sourceKey === 'mx_fed_repuve') {
      const robo = get('robo_status');
      if (robo === 'sin_reporte') {
        score -= 15;
        greenFlags.push('REPUVE: sin reporte de robo');
      } else if (robo === 'vigente') {
        score += 60;
        redFlags.push('REPUVE: REPORTE DE ROBO VIGENTE');
      } else if (robo === 'recuperado') {
        score += 15;
        redFlags.push('REPUVE: robo recuperado en historial');
      }
    }

    if (r.sourceKey === 'usa_fed_nhtsa_recalls') {
      const count = Number(get('open_recall_count') ?? 0);
      const parkIt = Number(get('park_it_recalls') ?? 0);
      if (parkIt > 0) {
        score += 25;
        redFlags.push(`${parkIt} recall(s) con orden de NO usar el auto`);
      } else if (count > 0) {
        score += count * 3;
        redFlags.push(`${count} recall(s) abierto(s) — debe arreglarse gratis en agencia`);
      } else {
        greenFlags.push('Sin recalls abiertos');
      }
    }

    if (r.sourceKey === 'mx_fed_rug') {
      const liens = Number(get('active_liens') ?? 0);
      if (liens > 0) {
        score += 20;
        redFlags.push(`${liens} gravamen(es) activo(s) en RUG`);
      } else {
        greenFlags.push('Sin gravámenes en RUG');
      }
    }

    if (r.sourceKey === 'usa_fed_nmvtis_vinaudit') {
      const brands = get('title_brands') as string[] | undefined;
      if (brands && brands.length > 0) {
        score += 30;
        redFlags.push(`Título marcado en US: ${brands.join(', ')}`);
      } else {
        greenFlags.push('Sin brands en título US');
      }
    }
  }

  const requested = sourceResults.length;
  const coveragePct = requested === 0 ? 0 : Math.round((completed.length / requested) * 100);
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const level: RiskOutput['level'] =
    coveragePct < 40
      ? 'unknown'
      : finalScore >= 70
        ? 'red'
        : finalScore >= 40
          ? 'yellow'
          : 'green';

  return {
    score: finalScore,
    level,
    redFlags,
    greenFlags,
    coverage: {
      requested,
      completed: completed.length,
      failed: failed.length,
      pct: coveragePct,
    },
  };
}
