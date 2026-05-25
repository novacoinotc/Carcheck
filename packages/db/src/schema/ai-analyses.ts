import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { riskLevelEnum } from './enums';

/**
 * Stores Claude AI interpretation of all raw source data for a report.
 * Versioned so we can regenerate with newer prompts/models without losing history.
 */
export const aiAnalyses = pgTable(
  'ai_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .references(() => reports.id, { onDelete: 'cascade' })
      .notNull(),
    version: integer('version').default(1).notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    riskScore: integer('risk_score'),
    riskLevel: riskLevelEnum('risk_level').default('unknown').notNull(),
    confidence: decimal('confidence', { precision: 5, scale: 2 }),
    executiveSummary: text('executive_summary'),
    redFlags: jsonb('red_flags').$type<
      Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; finding: string; sources: string[] }>
    >(),
    greenFlags: jsonb('green_flags').$type<Array<{ finding: string; sources: string[] }>>(),
    crossSourceFindings: jsonb('cross_source_findings').$type<
      Array<{ finding: string; sources: string[]; explanation: string }>
    >(),
    recommendations: jsonb('recommendations').$type<
      Array<{ priority: 'must_check' | 'should_check' | 'nice_to_check'; action: string; reason: string }>
    >(),
    questionsForSeller: jsonb('questions_for_seller').$type<string[]>(),
    marketContext: jsonb('market_context').$type<{
      fair_price_mxn?: { low: number; mid: number; high: number };
      comparable_listings?: number;
      market_notes?: string;
    }>(),
    rawOutput: jsonb('raw_output').$type<Record<string, unknown>>(),
    inputTokens: integer('input_tokens'),
    cachedInputTokens: integer('cached_input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: decimal('cost_usd', { precision: 10, scale: 4 }).default('0').notNull(),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('ai_analyses_report_id_idx').on(t.reportId),
    index('ai_analyses_version_idx').on(t.reportId, t.version),
  ],
);

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAiAnalysis = typeof aiAnalyses.$inferInsert;
