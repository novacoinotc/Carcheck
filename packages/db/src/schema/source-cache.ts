import { pgTable, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Persistent fallback for the Redis primary cache. Survives Redis cold/flush.
 * Cache key convention: `${source_key}:${id_type}:${id_value}` e.g. "repuve:vin:1HGCM82633A123456"
 */
export const sourceCache = pgTable(
  'source_cache',
  {
    cacheKey: text('cache_key').primaryKey(),
    sourceKey: text('source_key').notNull(),
    data: jsonb('data').$type<unknown>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('source_cache_expires_at_idx').on(t.expiresAt),
    index('source_cache_source_key_idx').on(t.sourceKey),
  ],
);

export type SourceCacheEntry = typeof sourceCache.$inferSelect;
export type NewSourceCacheEntry = typeof sourceCache.$inferInsert;
