import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sourceCountryEnum, sourceCategoryEnum, accessMethodEnum } from './enums';

/**
 * Catalog of every data source CarCheck can query.
 * Seeded with 50+ entries; used by the orchestrator to know which sources
 * to fan out per report and how to call them.
 */
export const sourceRegistry = pgTable(
  'source_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    country: sourceCountryEnum('country').notNull(),
    stateCode: text('state_code'),
    category: sourceCategoryEnum('category').notNull(),
    accessMethod: accessMethodEnum('access_method').notNull(),
    baseUrl: text('base_url'),
    docsUrl: text('docs_url'),
    requiresVin: boolean('requires_vin').default(false).notNull(),
    requiresPlate: boolean('requires_plate').default(false).notNull(),
    acceptsEither: boolean('accepts_either').default(false).notNull(),
    typicalLatencyMs: integer('typical_latency_ms'),
    timeoutMs: integer('timeout_ms').default(15000).notNull(),
    costUsdPerCall: decimal('cost_usd_per_call', { precision: 10, scale: 4 }).default('0').notNull(),
    cacheTtlSeconds: integer('cache_ttl_seconds').default(86400).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    isTier1: boolean('is_tier_1').default(false).notNull(),
    runsOn: text('runs_on').default('vercel').notNull(),
    legalNotes: text('legal_notes'),
    config: jsonb('config').$type<Record<string, unknown>>(),
    healthStatus: text('health_status').default('unknown').notNull(),
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
    successRate7d: decimal('success_rate_7d', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('source_registry_key_idx').on(t.key),
    index('source_registry_country_idx').on(t.country),
    index('source_registry_category_idx').on(t.category),
    index('source_registry_enabled_idx').on(t.isEnabled),
  ],
);

export type SourceRegistryEntry = typeof sourceRegistry.$inferSelect;
export type NewSourceRegistryEntry = typeof sourceRegistry.$inferInsert;
