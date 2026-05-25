import { pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', [
  'consumer',
  'dealer',
  'fleet',
  'insurer',
  'api_partner',
  'admin',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'paid',
  'processing',
  'partial',
  'completed',
  'failed',
  'refunded',
]);

export const riskLevelEnum = pgEnum('risk_level', ['green', 'yellow', 'red', 'unknown']);

export const sourceStatusEnum = pgEnum('source_status', [
  'pending',
  'in_progress',
  'success',
  'partial',
  'failed',
  'timeout',
  'not_applicable',
  'cached',
  'skipped',
]);

export const sourceCountryEnum = pgEnum('source_country', [
  'mx_federal',
  'mx_state',
  'mx_municipal',
  'usa_federal',
  'usa_state',
  'usa_private',
  'market',
  'oem',
  'international',
]);

export const sourceCategoryEnum = pgEnum('source_category', [
  'theft',
  'liens_finance',
  'fines_taxes',
  'recalls',
  'title_brands',
  'accidents',
  'emissions',
  'inspections',
  'service_history',
  'auctions',
  'market_value',
  'specs_decode',
  'customs_import',
  'insurance',
  'listings',
  'fleet_history',
]);

export const accessMethodEnum = pgEnum('access_method', [
  'api_free',
  'api_paid',
  'scraping',
  'scraping_captcha',
  'partner_api',
  'manual',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partial_refund',
  'chargeback',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'mercadopago',
  'stripe',
  'manual',
  'credits',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'report_create',
  'report_view',
  'report_share',
  'report_pdf_download',
  'payment_received',
  'refund_issued',
  'api_call',
  'user_signup',
  'user_login',
  'admin_action',
  'data_export',
  'data_deletion',
  'source_failure',
]);
