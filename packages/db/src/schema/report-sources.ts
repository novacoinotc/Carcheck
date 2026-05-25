import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  decimal,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { sourceRegistry } from './source-registry';
import { sourceStatusEnum, riskLevelEnum } from './enums';

/**
 * One row per (report, source) tuple. Holds the raw data returned by each
 * source plus normalized/parsed output and per-section risk grade.
 */
export const reportSources = pgTable(
  'report_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .references(() => reports.id, { onDelete: 'cascade' })
      .notNull(),
    sourceKey: text('source_key').notNull(),
    sourceRegistryId: uuid('source_registry_id').references(() => sourceRegistry.id, {
      onDelete: 'set null',
    }),
    status: sourceStatusEnum('status').default('pending').notNull(),
    attempt: integer('attempt').default(1).notNull(),
    responseTimeMs: integer('response_time_ms'),
    rawData: jsonb('raw_data').$type<unknown>(),
    parsedData: jsonb('parsed_data').$type<Record<string, unknown>>(),
    normalizedFacts: jsonb('normalized_facts').$type<
      Array<{ key: string; value: unknown; confidence: number }>
    >(),
    sectionRisk: riskLevelEnum('section_risk').default('unknown').notNull(),
    sectionScore: integer('section_score'),
    sectionFindings: jsonb('section_findings').$type<{
      red_flags?: string[];
      green_flags?: string[];
      notes?: string[];
    }>(),
    cached: boolean('cached').default(false).notNull(),
    cacheHitAt: timestamp('cache_hit_at', { withTimezone: true }),
    costUsd: decimal('cost_usd', { precision: 10, scale: 4 }).default('0').notNull(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    httpStatus: integer('http_status'),
    workerNode: text('worker_node'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('report_sources_report_source_idx').on(t.reportId, t.sourceKey),
    index('report_sources_status_idx').on(t.status),
    index('report_sources_source_key_idx').on(t.sourceKey),
  ],
);

export type ReportSource = typeof reportSources.$inferSelect;
export type NewReportSource = typeof reportSources.$inferInsert;
