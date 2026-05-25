import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { reports } from './reports';
import { transactionStatusEnum, paymentProviderEnum } from './enums';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
    provider: paymentProviderEnum('provider').notNull(),
    providerPaymentId: text('provider_payment_id'),
    providerReferenceId: text('provider_reference_id'),
    amountCentavos: integer('amount_centavos').notNull(),
    currency: text('currency').default('MXN').notNull(),
    status: transactionStatusEnum('status').default('pending').notNull(),
    paymentMethod: text('payment_method'),
    description: text('description'),
    feeCentavos: integer('fee_centavos'),
    netCentavos: integer('net_centavos'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    refundedAmountCentavos: integer('refunded_amount_centavos').default(0).notNull(),
    refundReason: text('refund_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('transactions_provider_payment_id_idx')
      .on(t.provider, t.providerPaymentId)
      .where(sql`${t.providerPaymentId} IS NOT NULL`),
    index('transactions_user_id_idx').on(t.userId),
    index('transactions_report_id_idx').on(t.reportId),
    index('transactions_status_idx').on(t.status),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
