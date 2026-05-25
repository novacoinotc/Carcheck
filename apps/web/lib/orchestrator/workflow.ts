import { db, sourceRegistry, reports, reportSources, eq, and } from '@carcheck/db';
import { getClient } from '@carcheck/sources';
import { buildCacheKey, cacheGet, cacheSet } from '@carcheck/cache';
import { computeBaselineRisk } from '@carcheck/risk-engine';
import { analyzeReport } from '@carcheck/ai-analyst';
import type { QueryInput, SourceResult } from '@carcheck/shared-types';

const SCRAPERS_BASE_URL = process.env.SCRAPERS_BASE_URL;
const SCRAPERS_AUTH_TOKEN = process.env.SCRAPERS_AUTH_TOKEN;

/**
 * The CarCheck orchestrator. Fan-out call to every enabled source for a report,
 * then hand the aggregated raw data to Claude for narrative analysis.
 *
 * Phase 0: synchronous Promise.allSettled — works inside one Vercel function (300s default).
 * Phase 1+: migrate to Vercel Workflow DevKit `'use workflow'` for durability across deploys.
 */
export async function runReportOrchestrator(
  reportId: string,
  input: QueryInput,
): Promise<void> {
  await db
    .update(reports)
    .set({ status: 'processing', startedAt: new Date() })
    .where(eq(reports.id, reportId));

  const enabled = await db
    .select()
    .from(sourceRegistry)
    .where(eq(sourceRegistry.isEnabled, true));

  const applicable = enabled.filter((s) => {
    if (s.requiresVin && !input.vin) return false;
    if (s.requiresPlate && !input.plate) return false;
    return true;
  });

  const startedAt = Date.now();
  const results = await Promise.allSettled(
    applicable.map((source) => fetchSourceWithCache(source, input)),
  );

  const sourceResults: SourceResult[] = results.map((r, i) => {
    const source = applicable[i]!;
    if (r.status === 'fulfilled') return r.value;
    return {
      sourceKey: source.key,
      status: 'failed' as const,
      responseTimeMs: 0,
      errorMessage: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  await db.insert(reportSources).values(
    sourceResults.map((sr) => ({
      reportId,
      sourceKey: sr.sourceKey,
      status: sr.status,
      responseTimeMs: sr.responseTimeMs,
      rawData: sr.rawData,
      parsedData: sr.parsedData,
      normalizedFacts: sr.normalizedFacts,
      cached: sr.cached ?? false,
      cacheHitAt: sr.cached ? new Date() : null,
      costUsd: sr.costUsd?.toFixed(4) ?? '0',
      errorCode: sr.errorCode,
      errorMessage: sr.errorMessage,
      httpStatus: sr.httpStatus,
      completedAt: new Date(),
    })),
  );

  const baseline = computeBaselineRisk({ sourceResults });

  let aiOutput: Awaited<ReturnType<typeof analyzeReport>> | null = null;
  try {
    aiOutput = await analyzeReport({
      vehicle: {
        vin: input.vin,
        plate: input.plate,
        plate_state: input.state,
      },
      sourceResults,
    });
  } catch (err) {
    console.error('AI analysis failed, falling back to baseline:', err);
  }

  const finalScore = aiOutput?.analysis.risk_score ?? baseline.score;
  const finalLevel = aiOutput?.analysis.risk_level ?? baseline.level;
  const totalCost = sourceResults.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);

  await db
    .update(reports)
    .set({
      status: 'completed',
      riskScore: finalScore,
      riskLevel: finalLevel === 'unknown' ? 'unknown' : finalLevel,
      sourcesRequested: applicable.length,
      sourcesCompleted: sourceResults.filter((r) => r.status === 'success' || r.status === 'partial').length,
      sourcesFailed: sourceResults.filter((r) => r.status === 'failed' || r.status === 'timeout').length,
      totalCostUsd: totalCost.toFixed(4),
      totalQueryTimeMs: Date.now() - startedAt,
      summary: aiOutput
        ? {
            red_flags: aiOutput.analysis.red_flags.map((f) => f.finding),
            green_flags: aiOutput.analysis.green_flags.map((f) => f.finding),
            key_findings: aiOutput.analysis.cross_source_findings.map((f) => f.finding),
          }
        : {
            red_flags: baseline.redFlags,
            green_flags: baseline.greenFlags,
            key_findings: [],
          },
      completedAt: new Date(),
    })
    .where(eq(reports.id, reportId));
}

async function fetchSourceWithCache(
  source: typeof sourceRegistry.$inferSelect,
  input: QueryInput,
): Promise<SourceResult> {
  const cacheKey = buildCacheKey(source.key, {
    vin: input.vin,
    plate: input.plate,
    state: input.state,
  });

  const cached = await cacheGet<SourceResult>(cacheKey);
  if (cached) {
    return { ...cached, cached: true, status: 'cached' };
  }

  const result = source.runsOn === 'railway'
    ? await callRailwayWorker(source.key, input)
    : await callLocalClient(source.key, input);

  if (result.status === 'success' || result.status === 'partial') {
    await cacheSet(cacheKey, result, source.cacheTtlSeconds);
  }
  return result;
}

async function callLocalClient(sourceKey: string, input: QueryInput): Promise<SourceResult> {
  const client = getClient(sourceKey);
  if (!client) {
    return {
      sourceKey,
      status: 'not_applicable',
      responseTimeMs: 0,
      errorMessage: `No local client for ${sourceKey}`,
    };
  }
  return client.fetch(input);
}

async function callRailwayWorker(sourceKey: string, input: QueryInput): Promise<SourceResult> {
  if (!SCRAPERS_BASE_URL || !SCRAPERS_AUTH_TOKEN) {
    return {
      sourceKey,
      status: 'failed',
      responseTimeMs: 0,
      errorCode: 'scrapers_not_configured',
      errorMessage: 'SCRAPERS_BASE_URL/SCRAPERS_AUTH_TOKEN not set',
    };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${SCRAPERS_BASE_URL}/scrape/${sourceKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SCRAPERS_AUTH_TOKEN}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return {
        sourceKey,
        status: 'failed',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        errorMessage: `Scraper returned ${res.status}`,
      };
    }
    const body = (await res.json()) as SourceResult;
    return body;
  } catch (err) {
    return {
      sourceKey,
      status: 'failed',
      responseTimeMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

// silence the unused-import lint until phase 1 migrates to workflow
void and;
