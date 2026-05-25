import { describe, it, expect } from 'vitest';
import { computeBaselineRisk } from '../index';
import type { SourceResult } from '@carcheck/shared-types';

function ok(sourceKey: string, facts: Array<{ key: string; value: unknown }>): SourceResult {
  return {
    sourceKey,
    status: 'success',
    responseTimeMs: 100,
    normalizedFacts: facts.map((f) => ({ ...f, confidence: 100 })),
  };
}

describe('computeBaselineRisk', () => {
  it('returns unknown when coverage is below 40%', () => {
    const r = computeBaselineRisk({
      sourceResults: [
        { sourceKey: 'a', status: 'failed', responseTimeMs: 0 },
        { sourceKey: 'b', status: 'failed', responseTimeMs: 0 },
        { sourceKey: 'c', status: 'failed', responseTimeMs: 0 },
      ],
    });
    expect(r.level).toBe('unknown');
    expect(r.coverage.pct).toBe(0);
  });

  it('flags active theft report as red', () => {
    const r = computeBaselineRisk({
      sourceResults: [
        ok('mx_fed_repuve', [{ key: 'robo_status', value: 'vigente' }]),
        ok('usa_fed_nhtsa_recalls', [
          { key: 'open_recall_count', value: 0 },
          { key: 'park_it_recalls', value: 0 },
        ]),
      ],
    });
    expect(r.level).toBe('red');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.redFlags.some((f) => f.includes('REPORTE DE ROBO VIGENTE'))).toBe(true);
  });

  it('rewards clean REPUVE with green flags', () => {
    const r = computeBaselineRisk({
      sourceResults: [
        ok('mx_fed_repuve', [{ key: 'robo_status', value: 'sin_reporte' }]),
        ok('usa_fed_nhtsa_recalls', [
          { key: 'open_recall_count', value: 0 },
          { key: 'park_it_recalls', value: 0 },
        ]),
        ok('mx_fed_rug', [{ key: 'active_liens', value: 0 }]),
      ],
    });
    expect(r.greenFlags).toContain('REPUVE: sin reporte de robo');
    expect(r.greenFlags).toContain('Sin recalls abiertos');
    expect(r.greenFlags).toContain('Sin gravámenes en RUG');
    expect(r.level).toBe('green');
  });

  it('escalates on park-it recalls', () => {
    const r = computeBaselineRisk({
      sourceResults: [
        ok('mx_fed_repuve', [{ key: 'robo_status', value: 'sin_reporte' }]),
        ok('usa_fed_nhtsa_recalls', [
          { key: 'open_recall_count', value: 2 },
          { key: 'park_it_recalls', value: 1 },
        ]),
      ],
    });
    expect(r.redFlags.some((f) => f.includes('NO usar'))).toBe(true);
  });

  it('detects US title brands', () => {
    const r = computeBaselineRisk({
      sourceResults: [
        ok('mx_fed_repuve', [{ key: 'robo_status', value: 'sin_reporte' }]),
        ok('usa_fed_nhtsa_recalls', [
          { key: 'open_recall_count', value: 0 },
          { key: 'park_it_recalls', value: 0 },
        ]),
        ok('usa_fed_nmvtis_vinaudit', [{ key: 'title_brands', value: ['SALVAGE', 'FLOOD'] }]),
      ],
    });
    expect(r.redFlags.some((f) => f.includes('Título marcado'))).toBe(true);
  });
});
