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
import { users } from './users';
import { vehicles } from './vehicles';
import { reportStatusEnum, riskLevelEnum } from './enums';

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
    vinQueried: text('vin_queried'),
    plateQueried: text('plate_queried'),
    plateState: text('plate_state'),
    status: reportStatusEnum('status').default('pending').notNull(),
    riskScore: integer('risk_score'),
    riskLevel: riskLevelEnum('risk_level').default('unknown').notNull(),
    sourcesRequested: integer('sources_requested').default(0).notNull(),
    sourcesCompleted: integer('sources_completed').default(0).notNull(),
    sourcesFailed: integer('sources_failed').default(0).notNull(),
    coverage: jsonb('coverage').$type<{
      mx_federal?: number;
      mx_state?: number;
      usa?: number;
      market?: number;
      oem?: number;
    }>(),
    summary: jsonb('summary').$type<{
      red_flags: string[];
      green_flags: string[];
      key_findings: string[];
    }>(),
    pdfUrl: text('pdf_url'),
    pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),
    pricePaidCentavos: integer('price_paid_centavos'),
    currency: text('currency').default('MXN').notNull(),
    totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 4 }).default('0').notNull(),
    totalQueryTimeMs: integer('total_query_time_ms'),
    workflowRunId: text('workflow_run_id'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('reports_user_id_idx').on(t.userId),
    index('reports_vehicle_id_idx').on(t.vehicleId),
    index('reports_vin_idx').on(t.vinQueried),
    index('reports_plate_idx').on(t.plateQueried, t.plateState),
    index('reports_status_idx').on(t.status),
    index('reports_created_at_idx').on(t.createdAt),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
