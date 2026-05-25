import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { users } from './users';

export const sharedLinks = pgTable(
  'shared_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .references(() => reports.id, { onDelete: 'cascade' })
      .notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    token: text('token').unique().notNull(),
    label: text('label'),
    accessCount: integer('access_count').default(0).notNull(),
    maxAccesses: integer('max_accesses'),
    isActive: boolean('is_active').default(true).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('shared_links_token_idx').on(t.token),
    index('shared_links_report_idx').on(t.reportId),
  ],
);

export type SharedLink = typeof sharedLinks.$inferSelect;
export type NewSharedLink = typeof sharedLinks.$inferInsert;
