import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { transactions } from './transactions';
import { reports } from './reports';

/**
 * Append-only ledger of credit movements. Sum per user = current balance.
 */
export const creditsLedger = pgTable(
  'credits_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    delta: integer('delta').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: text('reason').notNull(),
    transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('credits_ledger_user_id_idx').on(t.userId, t.createdAt),
    index('credits_ledger_reason_idx').on(t.reason),
  ],
);

export type CreditLedgerEntry = typeof creditsLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditsLedger.$inferInsert;
