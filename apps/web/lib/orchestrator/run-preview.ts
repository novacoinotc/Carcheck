import {
  db,
  sourceRegistry,
  reports,
  reportSources,
  aiAnalyses,
  vehicles,
  eq,
} from '@carcheck/db';
import { clientRegistry } from '@carcheck/sources';
import { buildCacheKey, cacheGet, cacheSet } from '@carcheck/cache';
import { computeBaselineRisk } from '@carcheck/risk-engine';
import { analyzeReport, type AnalyzeOutput } from '@carcheck/ai-analyst';
import type { QueryInput, SourceResult } from '@carcheck/shared-types';

// Railway scrapers that solve CAPTCHAs (REPUVE, state portals, NICB) routinely
// take 40-120s. The preview/create API routes allow 300s and sources run in
// parallel, so give scrapers a generous cap rather than killing them at 25s.
const SCRAPER_TIMEOUT_MS = 150_000;

export interface PreviewReport {
  reportId: string | null;
  shareToken: string | null;
  vehicle: {
    vin?: string | undefined;
    plate?: string | undefined;
    plate_state?: string | undefined;
    make: string | null;
    model: string | null;
    year: number | null;
    body: string | null;
    plant: string | null;
  };
  sources: Array<{
    key: string;
    name: string;
    runs_on: string;
    status: SourceResult['status'];
    cached: boolean;
    response_time_ms: number;
    cost_usd: number;
    error?: string;
  }>;
  baseline: ReturnType<typeof computeBaselineRisk>;
  ai: AnalyzeOutput | null;
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

export interface RunOptions {
  /** When provided, the report is persisted under this user (Clerk DB user id). */
  userId?: string | null;
  /** When true, persist the report row + sources + AI analysis to Neon. */
  persist?: boolean;
  /** When true, only run sources marked is_tier_1 = true (faster + cheaper). */
  tier1Only?: boolean;
  /** Use claude-sonnet-4-6 instead of opus-4-7 (cheaper). */
  preferFastModel?: boolean;
}

/**
 * The CarCheck orchestrator. Queries source_registry, fans out to every applicable
 * enabled source in parallel (Vercel-hosted clients + Railway-hosted scrapers),
 * runs the heuristic risk engine + Claude AI analyst, and (optionally) persists
 * everything to Neon.
 */
export async function runPreviewReport(
  input: QueryInput,
  options: RunOptions = {},
): Promise<PreviewReport> {
  const start = Date.now();

  const allSources = await db
    .select()
    .from(sourceRegistry)
    .where(eq(sourceRegistry.isEnabled, true));

  const applicable = allSources.filter((s) => {
    if (options.tier1Only && !s.isTier1) return false;
    if (s.requiresVin && !input.vin) return false;
    if (s.requiresPlate && !input.plate && !s.acceptsEither) return false;
    return true;
  });

  // Run NHTSA vPIC first to get make/model/year — PROFECO needs them.
  const decodeSource = applicable.find((s) => s.key === 'usa_fed_nhtsa_vpic');
  let decodeResult: SourceResult | null = null;
  if (decodeSource) {
    decodeResult = await fetchWithCache(decodeSource, input);
  }
  const decodedData = decodeResult?.parsedData as
    | {
        make: string | null;
        model: string | null;
        modelYear: number | null;
        bodyClass: string | null;
        plantCity: string | null;
        plantState: string | null;
        plantCountry: string | null;
      }
    | undefined;

  const enrichedInput = {
    ...input,
    ...(decodedData?.make ? { make: decodedData.make } : {}),
    ...(decodedData?.model ? { model: decodedData.model } : {}),
    ...(decodedData?.modelYear ? { year: decodedData.modelYear } : {}),
  };

  const remaining = applicable.filter((s) => s.key !== 'usa_fed_nhtsa_vpic');
  const settled = await Promise.allSettled(
    remaining.map((source) => fetchWithCache(source, enrichedInput)),
  );

  const sourceResults: SourceResult[] = [];
  if (decodeResult) sourceResults.push(decodeResult);
  settled.forEach((s, i) => {
    const source = remaining[i]!;
    if (s.status === 'fulfilled') {
      sourceResults.push(s.value);
    } else {
      sourceResults.push({
        sourceKey: source.key,
        status: 'failed',
        responseTimeMs: 0,
        errorMessage: s.reason instanceof Error ? s.reason.message : String(s.reason),
      });
    }
  });

  const vehicle: PreviewReport['vehicle'] = {
    vin: input.vin,
    plate: input.plate,
    plate_state: input.state,
    make: decodedData?.make ?? null,
    model: decodedData?.model ?? null,
    year: decodedData?.modelYear ?? null,
    body: decodedData?.bodyClass ?? null,
    plant: decodedData
      ? [decodedData.plantCity, decodedData.plantState, decodedData.plantCountry]
          .filter(Boolean)
          .join(', ') || null
      : null,
  };

  const baseline = computeBaselineRisk({ sourceResults });

  let ai: AnalyzeOutput | null = null;
  let aiError: string | null = null;
  try {
    ai = await analyzeReport({
      vehicle,
      sourceResults,
      preferFastModel: options.preferFastModel,
    });
  } catch (err) {
    aiError = err instanceof Error ? err.message : String(err);
    console.error('[orchestrator] AI analysis failed', err);
  }

  const totalCost =
    sourceResults.reduce((sum, r) => sum + (r.costUsd ?? 0), 0) + (ai?.meta.costUsd ?? 0);
  const succeeded = sourceResults.filter(
    (r) => r.status === 'success' || r.status === 'partial' || r.status === 'cached',
  );
  const failed = sourceResults.filter((r) => r.status === 'failed' || r.status === 'timeout');
  const cacheHits = sourceResults.filter((r) => r.cached === true).length;

  const sourcesOut = sourceResults.map((r) => {
    const meta = applicable.find((s) => s.key === r.sourceKey);
    return {
      key: r.sourceKey,
      name: meta?.name ?? clientRegistry[r.sourceKey]?.name ?? r.sourceKey,
      runs_on: meta?.runsOn ?? 'vercel',
      status: r.status,
      cached: r.cached ?? false,
      response_time_ms: r.responseTimeMs,
      cost_usd: r.costUsd ?? 0,
      error: r.errorMessage,
    };
  });

  let reportId: string | null = null;
  let shareToken: string | null = null;
  if (options.persist) {
    const persisted = await persistReport({
      userId: options.userId ?? null,
      input,
      vehicle,
      sourceResults,
      sourcesMeta: applicable,
      baseline,
      ai,
      aiError,
      totals: {
        requested: sourceResults.length,
        succeeded: succeeded.length,
        failed: failed.length,
        cacheHits,
        totalMs: Date.now() - start,
        costUsd: totalCost,
      },
    });
    reportId = persisted.reportId;
    shareToken = persisted.shareToken;
  }

  return {
    reportId,
    shareToken,
    vehicle,
    sources: sourcesOut,
    baseline,
    ai,
    ai_error: aiError,
    totals: {
      sources_requested: sourceResults.length,
      sources_succeeded: succeeded.length,
      sources_failed: failed.length,
      cache_hits: cacheHits,
      total_query_time_ms: Date.now() - start,
      total_cost_usd: totalCost,
    },
  };
}

async function fetchWithCache(
  source: typeof sourceRegistry.$inferSelect,
  input: QueryInput & { make?: string; model?: string; year?: number },
): Promise<SourceResult> {
  const cacheKey = buildCacheKey(source.key, {
    vin: input.vin,
    plate: input.plate,
    state: input.state,
  });
  const cached = await cacheGet<SourceResult>(cacheKey);
  if (cached) return { ...cached, cached: true, status: 'cached' };

  let result: SourceResult;
  if (source.runsOn === 'railway') {
    result = await callRailwayWorker(source.key, input);
  } else {
    const client = clientRegistry[source.key];
    if (!client) {
      result = {
        sourceKey: source.key,
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: `No local client registered for ${source.key}`,
      };
    } else {
      result = await client.fetch(input);
    }
  }

  if (result.status === 'success' || result.status === 'partial') {
    await cacheSet(cacheKey, result, source.cacheTtlSeconds);
  }
  return result;
}

async function callRailwayWorker(
  sourceKey: string,
  input: QueryInput & { make?: string; model?: string; year?: number },
): Promise<SourceResult> {
  const baseUrl = process.env.SCRAPERS_BASE_URL;
  const token = process.env.SCRAPERS_AUTH_TOKEN;

  if (!baseUrl || !token) {
    return {
      sourceKey,
      status: 'skipped',
      responseTimeMs: 0,
      errorCode: 'scrapers_not_configured',
      errorMessage: 'SCRAPERS_BASE_URL or SCRAPERS_AUTH_TOKEN not set',
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);
    const res = await fetch(`${baseUrl}/scrape/${sourceKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        sourceKey,
        status: 'failed',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        errorMessage: `Railway worker returned ${res.status}`,
      };
    }
    const body = (await res.json()) as SourceResult;
    return body;
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      sourceKey,
      status: isAbort ? 'timeout' : 'failed',
      responseTimeMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

async function persistReport(args: {
  userId: string | null;
  input: QueryInput;
  vehicle: PreviewReport['vehicle'];
  sourceResults: SourceResult[];
  sourcesMeta: Array<typeof sourceRegistry.$inferSelect>;
  baseline: ReturnType<typeof computeBaselineRisk>;
  ai: AnalyzeOutput | null;
  aiError: string | null;
  totals: {
    requested: number;
    succeeded: number;
    failed: number;
    cacheHits: number;
    totalMs: number;
    costUsd: number;
  };
}): Promise<{ reportId: string; shareToken: string }> {
  let vehicleId: string | null = null;
  if (args.input.vin) {
    const existing = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.vin, args.input.vin))
      .limit(1);
    if (existing[0]) {
      vehicleId = existing[0].id;
      await db
        .update(vehicles)
        .set({
          make: args.vehicle.make ?? undefined,
          model: args.vehicle.model ?? undefined,
          year: args.vehicle.year ?? undefined,
          bodyClass: args.vehicle.body ?? undefined,
          lastUpdatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicleId));
    } else {
      const inserted = await db
        .insert(vehicles)
        .values({
          vin: args.input.vin,
          make: args.vehicle.make,
          model: args.vehicle.model,
          year: args.vehicle.year,
          bodyClass: args.vehicle.body,
        })
        .returning({ id: vehicles.id });
      vehicleId = inserted[0]?.id ?? null;
    }
  }

  const finalScore = args.ai?.analysis.risk_score ?? args.baseline.score;
  const finalLevel = args.ai?.analysis.risk_level ?? args.baseline.level;
  const shareToken = generateShareToken();

  const reportInsert = await db
    .insert(reports)
    .values({
      userId: args.userId,
      vehicleId,
      vinQueried: args.input.vin,
      plateQueried: args.input.plate,
      plateState: args.input.state,
      status: args.ai ? 'completed' : args.totals.failed > 0 ? 'partial' : 'completed',
      riskScore: finalScore,
      riskLevel: finalLevel === 'unknown' ? 'unknown' : finalLevel,
      sourcesRequested: args.totals.requested,
      sourcesCompleted: args.totals.succeeded,
      sourcesFailed: args.totals.failed,
      coverage: countByCountry(args.sourceResults, args.sourcesMeta),
      summary: args.ai
        ? {
            red_flags: args.ai.analysis.red_flags.map((f) => f.finding),
            green_flags: args.ai.analysis.green_flags.map((f) => f.finding),
            key_findings: args.ai.analysis.cross_source_findings.map((f) => f.finding),
          }
        : {
            red_flags: args.baseline.redFlags,
            green_flags: args.baseline.greenFlags,
            key_findings: [],
          },
      totalCostUsd: args.totals.costUsd.toFixed(4),
      totalQueryTimeMs: args.totals.totalMs,
      failureReason: args.aiError ?? null,
      startedAt: new Date(Date.now() - args.totals.totalMs),
      completedAt: new Date(),
    })
    .returning({ id: reports.id });

  const reportId = reportInsert[0]?.id;
  if (!reportId) throw new Error('Failed to insert report');

  if (args.sourceResults.length > 0) {
    await db.insert(reportSources).values(
      args.sourceResults.map((r) => {
        const meta = args.sourcesMeta.find((s) => s.key === r.sourceKey);
        return {
          reportId,
          sourceKey: r.sourceKey,
          sourceRegistryId: meta?.id,
          status: r.status,
          responseTimeMs: r.responseTimeMs,
          rawData: r.rawData,
          parsedData: r.parsedData as Record<string, unknown> | undefined,
          normalizedFacts: r.normalizedFacts,
          cached: r.cached ?? false,
          cacheHitAt: r.cached ? new Date() : null,
          costUsd: (r.costUsd ?? 0).toFixed(4),
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
          httpStatus: r.httpStatus,
          completedAt: new Date(),
        };
      }),
    );
  }

  if (args.ai) {
    await db.insert(aiAnalyses).values({
      reportId,
      version: 1,
      model: args.ai.meta.model,
      promptVersion: args.ai.meta.promptVersion,
      riskScore: args.ai.analysis.risk_score,
      riskLevel: args.ai.analysis.risk_level,
      confidence: args.ai.analysis.confidence.toFixed(2),
      executiveSummary: args.ai.analysis.executive_summary,
      redFlags: args.ai.analysis.red_flags,
      greenFlags: args.ai.analysis.green_flags,
      crossSourceFindings: args.ai.analysis.cross_source_findings,
      recommendations: args.ai.analysis.recommendations,
      questionsForSeller: args.ai.analysis.questions_for_seller,
      marketContext: args.ai.analysis.market_context,
      rawOutput: args.ai.analysis as unknown as Record<string, unknown>,
      inputTokens: args.ai.meta.inputTokens,
      cachedInputTokens: args.ai.meta.cachedInputTokens,
      outputTokens: args.ai.meta.outputTokens,
      costUsd: args.ai.meta.costUsd.toFixed(4),
      latencyMs: args.ai.meta.latencyMs,
    });
  }

  return { reportId, shareToken };
}

function countByCountry(
  results: SourceResult[],
  meta: Array<typeof sourceRegistry.$inferSelect>,
): { mx_federal?: number; mx_state?: number; usa?: number; market?: number; oem?: number } {
  const counts = { mx_federal: 0, mx_state: 0, usa: 0, market: 0, oem: 0 };
  for (const r of results) {
    if (r.status !== 'success' && r.status !== 'partial' && r.status !== 'cached') continue;
    const m = meta.find((s) => s.key === r.sourceKey);
    if (!m) continue;
    if (m.country === 'mx_federal') counts.mx_federal++;
    else if (m.country === 'mx_state') counts.mx_state++;
    else if (
      m.country === 'usa_federal' ||
      m.country === 'usa_state' ||
      m.country === 'usa_private'
    )
      counts.usa++;
    else if (m.country === 'market') counts.market++;
    else if (m.country === 'oem') counts.oem++;
  }
  return counts;
}

function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
