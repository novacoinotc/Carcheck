import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').unique().notNull(),
    scopes: jsonb('scopes').$type<string[]>().default(['report:create', 'report:read']).notNull(),
    rateLimitPerMinute: integer('rate_limit_per_minute').default(60).notNull(),
    monthlyQuota: integer('monthly_quota'),
    monthlyUsed: integer('monthly_used').default(0).notNull(),
    monthlyResetAt: timestamp('monthly_reset_at', { withTimezone: true }),
    ipAllowlist: jsonb('ip_allowlist').$type<string[]>(),
    webhookUrl: text('webhook_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('api_keys_hash_idx').on(t.keyHash),
    index('api_keys_user_id_idx').on(t.userId),
    index('api_keys_active_idx').on(t.isActive),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
