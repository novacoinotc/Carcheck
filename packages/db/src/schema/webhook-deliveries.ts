import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { apiKeys } from './api-keys';
import { reports } from './reports';

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    targetUrl: text('target_url').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    httpStatus: integer('http_status'),
    responseBody: text('response_body'),
    attempt: integer('attempt').default(1).notNull(),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('webhook_deliveries_api_key_idx').on(t.apiKeyId),
    index('webhook_deliveries_report_idx').on(t.reportId),
    index('webhook_deliveries_next_retry_idx').on(t.nextRetryAt),
  ],
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
