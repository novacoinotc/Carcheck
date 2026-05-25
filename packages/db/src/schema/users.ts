import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { accountTypeEnum } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').unique().notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    company: text('company'),
    rfc: text('rfc'),
    accountType: accountTypeEnum('account_type').default('consumer').notNull(),
    credits: integer('credits').default(0).notNull(),
    referralCode: text('referral_code').unique(),
    referredBy: uuid('referred_by'),
    locale: text('locale').default('es-MX').notNull(),
    marketingOptIn: boolean('marketing_opt_in').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_clerk_id_idx').on(t.clerkUserId),
    index('users_email_idx').on(t.email),
    index('users_account_type_idx').on(t.accountType),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
