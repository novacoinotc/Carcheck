import {
  db,
  reports,
  reportSources,
  aiAnalyses,
  vehicles,
  sourceRegistry,
  eq,
  desc,
} from '@carcheck/db';

export interface ReportListItem {
  id: string;
  vin: string | null;
  plate: string | null;
  riskScore: number | null;
  riskLevel: string;
  status: string;
  vehicle: { make: string | null; model: string | null; year: number | null };
  sourcesCompleted: number;
  sourcesRequested: number;
  createdAt: Date;
  completedAt: Date | null;
}

export async function listUserReports(dbUserId: string, limit = 50): Promise<ReportListItem[]> {
  const rows = await db
    .select({
      id: reports.id,
      vin: reports.vinQueried,
      plate: reports.plateQueried,
      riskScore: reports.riskScore,
      riskLevel: reports.riskLevel,
      status: reports.status,
      sourcesCompleted: reports.sourcesCompleted,
      sourcesRequested: reports.sourcesRequested,
      createdAt: reports.createdAt,
      completedAt: reports.completedAt,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
    })
    .from(reports)
    .leftJoin(vehicles, eq(reports.vehicleId, vehicles.id))
    .where(eq(reports.userId, dbUserId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    vin: r.vin,
    plate: r.plate,
    riskScore: r.riskScore,
    riskLevel: r.riskLevel,
    status: r.status,
    sourcesCompleted: r.sourcesCompleted,
    sourcesRequested: r.sourcesRequested,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    vehicle: { make: r.make, model: r.model, year: r.year },
  }));
}

export interface ReportDetail {
  id: string;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
  riskScore: number | null;
  riskLevel: string;
  status: string;
  summary: {
    red_flags: string[];
    green_flags: string[];
    key_findings: string[];
  } | null;
  totalCostUsd: string;
  totalQueryTimeMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
  vehicle: {
    make: string | null;
    model: string | null;
    year: number | null;
    body: string | null;
  };
  ai: {
    model: string;
    riskScore: number | null;
    riskLevel: string;
    confidence: string | null;
    executiveSummary: string | null;
    redFlags: unknown;
    greenFlags: unknown;
    crossSourceFindings: unknown;
    recommendations: unknown;
    questionsForSeller: unknown;
    marketContext: unknown;
    costUsd: string;
    latencyMs: number | null;
  } | null;
  sources: Array<{
    sourceKey: string;
    name: string | null;
    country: string | null;
    status: string;
    cached: boolean;
    responseTimeMs: number | null;
    costUsd: string;
    error: string | null;
    parsedData: unknown;
    normalizedFacts: unknown;
  }>;
}

export async function getReportDetail(
  reportId: string,
  dbUserId: string | null,
): Promise<ReportDetail | null> {
  const reportRows = await db
    .select({
      id: reports.id,
      userId: reports.userId,
      vin: reports.vinQueried,
      plate: reports.plateQueried,
      plateState: reports.plateState,
      riskScore: reports.riskScore,
      riskLevel: reports.riskLevel,
      status: reports.status,
      summary: reports.summary,
      totalCostUsd: reports.totalCostUsd,
      totalQueryTimeMs: reports.totalQueryTimeMs,
      createdAt: reports.createdAt,
      completedAt: reports.completedAt,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      body: vehicles.bodyClass,
    })
    .from(reports)
    .leftJoin(vehicles, eq(reports.vehicleId, vehicles.id))
    .where(eq(reports.id, reportId))
    .limit(1);

  const row = reportRows[0];
  if (!row) return null;
  if (row.userId && dbUserId && row.userId !== dbUserId) return null;

  const [sourcesRows, aiRows] = await Promise.all([
    db
      .select({
        sourceKey: reportSources.sourceKey,
        status: reportSources.status,
        cached: reportSources.cached,
        responseTimeMs: reportSources.responseTimeMs,
        costUsd: reportSources.costUsd,
        error: reportSources.errorMessage,
        parsedData: reportSources.parsedData,
        normalizedFacts: reportSources.normalizedFacts,
        name: sourceRegistry.name,
        country: sourceRegistry.country,
      })
      .from(reportSources)
      .leftJoin(sourceRegistry, eq(reportSources.sourceRegistryId, sourceRegistry.id))
      .where(eq(reportSources.reportId, reportId)),
    db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.reportId, reportId))
      .orderBy(desc(aiAnalyses.version))
      .limit(1),
  ]);

  const ai = aiRows[0];

  return {
    id: row.id,
    vin: row.vin,
    plate: row.plate,
    plateState: row.plateState,
    riskScore: row.riskScore,
    riskLevel: row.riskLevel,
    status: row.status,
    summary: row.summary,
    totalCostUsd: row.totalCostUsd,
    totalQueryTimeMs: row.totalQueryTimeMs,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    vehicle: {
      make: row.make,
      model: row.model,
      year: row.year,
      body: row.body,
    },
    ai: ai
      ? {
          model: ai.model,
          riskScore: ai.riskScore,
          riskLevel: ai.riskLevel,
          confidence: ai.confidence,
          executiveSummary: ai.executiveSummary,
          redFlags: ai.redFlags,
          greenFlags: ai.greenFlags,
          crossSourceFindings: ai.crossSourceFindings,
          recommendations: ai.recommendations,
          questionsForSeller: ai.questionsForSeller,
          marketContext: ai.marketContext,
          costUsd: ai.costUsd,
          latencyMs: ai.latencyMs,
        }
      : null,
    sources: sourcesRows.map((s) => ({
      sourceKey: s.sourceKey,
      name: s.name,
      country: s.country,
      status: s.status,
      cached: s.cached,
      responseTimeMs: s.responseTimeMs,
      costUsd: s.costUsd,
      error: s.error,
      parsedData: s.parsedData,
      normalizedFacts: s.normalizedFacts,
    })),
  };
}
