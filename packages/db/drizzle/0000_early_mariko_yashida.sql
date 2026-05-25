CREATE TYPE "public"."access_method" AS ENUM('api_free', 'api_paid', 'scraping', 'scraping_captcha', 'partner_api', 'manual');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('consumer', 'dealer', 'fleet', 'insurer', 'api_partner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('report_create', 'report_view', 'report_share', 'report_pdf_download', 'payment_received', 'refund_issued', 'api_call', 'user_signup', 'user_login', 'admin_action', 'data_export', 'data_deletion', 'source_failure');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('mercadopago', 'stripe', 'manual', 'credits');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'paid', 'processing', 'partial', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('green', 'yellow', 'red', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_category" AS ENUM('theft', 'liens_finance', 'fines_taxes', 'recalls', 'title_brands', 'accidents', 'emissions', 'inspections', 'service_history', 'auctions', 'market_value', 'specs_decode', 'customs_import', 'insurance', 'listings', 'fleet_history');--> statement-breakpoint
CREATE TYPE "public"."source_country" AS ENUM('mx_federal', 'mx_state', 'mx_municipal', 'usa_federal', 'usa_state', 'usa_private', 'market', 'oem', 'international');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('pending', 'in_progress', 'success', 'partial', 'failed', 'timeout', 'not_applicable', 'cached', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'processing', 'paid', 'failed', 'refunded', 'partial_refund', 'chargeback');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"first_name" text,
	"last_name" text,
	"company" text,
	"rfc" text,
	"account_type" "account_type" DEFAULT 'consumer' NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"referral_code" text,
	"referred_by" uuid,
	"locale" text DEFAULT 'es-MX' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vin" text,
	"make" text,
	"model" text,
	"year" integer,
	"trim" text,
	"body_class" text,
	"engine" text,
	"transmission" text,
	"fuel_type" text,
	"drive_type" text,
	"plant_country" text,
	"plant_state" text,
	"plant_city" text,
	"manufacturer" text,
	"gvwr_lb" integer,
	"decoded_data" jsonb,
	"known_plates_mx" jsonb,
	"known_plates_us" jsonb,
	"is_chocolate" text,
	"import_pedimento" text,
	"import_year" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
CREATE TABLE "source_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"country" "source_country" NOT NULL,
	"state_code" text,
	"category" "source_category" NOT NULL,
	"access_method" "access_method" NOT NULL,
	"base_url" text,
	"docs_url" text,
	"requires_vin" boolean DEFAULT false NOT NULL,
	"requires_plate" boolean DEFAULT false NOT NULL,
	"accepts_either" boolean DEFAULT false NOT NULL,
	"typical_latency_ms" integer,
	"timeout_ms" integer DEFAULT 15000 NOT NULL,
	"cost_usd_per_call" numeric(10, 4) DEFAULT '0' NOT NULL,
	"cache_ttl_seconds" integer DEFAULT 86400 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_tier_1" boolean DEFAULT false NOT NULL,
	"runs_on" text DEFAULT 'vercel' NOT NULL,
	"legal_notes" text,
	"config" jsonb,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"success_rate_7d" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_registry_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"vehicle_id" uuid,
	"vin_queried" text,
	"plate_queried" text,
	"plate_state" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"risk_score" integer,
	"risk_level" "risk_level" DEFAULT 'unknown' NOT NULL,
	"sources_requested" integer DEFAULT 0 NOT NULL,
	"sources_completed" integer DEFAULT 0 NOT NULL,
	"sources_failed" integer DEFAULT 0 NOT NULL,
	"coverage" jsonb,
	"summary" jsonb,
	"pdf_url" text,
	"pdf_generated_at" timestamp with time zone,
	"price_paid_centavos" integer,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"total_cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_query_time_ms" integer,
	"workflow_run_id" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"source_registry_id" uuid,
	"status" "source_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"response_time_ms" integer,
	"raw_data" jsonb,
	"parsed_data" jsonb,
	"normalized_facts" jsonb,
	"section_risk" "risk_level" DEFAULT 'unknown' NOT NULL,
	"section_score" integer,
	"section_findings" jsonb,
	"cached" boolean DEFAULT false NOT NULL,
	"cache_hit_at" timestamp with time zone,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"error_code" text,
	"error_message" text,
	"http_status" integer,
	"worker_node" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"risk_score" integer,
	"risk_level" "risk_level" DEFAULT 'unknown' NOT NULL,
	"confidence" numeric(5, 2),
	"executive_summary" text,
	"red_flags" jsonb,
	"green_flags" jsonb,
	"cross_source_findings" jsonb,
	"recommendations" jsonb,
	"questions_for_seller" jsonb,
	"market_context" jsonb,
	"raw_output" jsonb,
	"input_tokens" integer,
	"cached_input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"report_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"provider_reference_id" text,
	"amount_centavos" integer NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"description" text,
	"fee_centavos" integer,
	"net_centavos" integer,
	"metadata" jsonb,
	"refunded_amount_centavos" integer DEFAULT 0 NOT NULL,
	"refund_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "credits_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"transaction_id" uuid,
	"report_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"created_by" uuid,
	"token" text NOT NULL,
	"label" text,
	"access_count" integer DEFAULT 0 NOT NULL,
	"max_accesses" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "shared_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '["report:create","report:read"]'::jsonb NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
	"monthly_quota" integer,
	"monthly_used" integer DEFAULT 0 NOT NULL,
	"monthly_reset_at" timestamp with time zone,
	"ip_allowlist" jsonb,
	"webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid,
	"report_id" uuid,
	"event_type" text NOT NULL,
	"target_url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"http_status" integer,
	"response_body" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_sources" ADD CONSTRAINT "report_sources_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_sources" ADD CONSTRAINT "report_sources_source_registry_id_source_registry_id_fk" FOREIGN KEY ("source_registry_id") REFERENCES "public"."source_registry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_account_type_idx" ON "users" USING btree ("account_type");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_vin_idx" ON "vehicles" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "vehicles_make_model_year_idx" ON "vehicles" USING btree ("make","model","year");--> statement-breakpoint
CREATE UNIQUE INDEX "source_registry_key_idx" ON "source_registry" USING btree ("key");--> statement-breakpoint
CREATE INDEX "source_registry_country_idx" ON "source_registry" USING btree ("country");--> statement-breakpoint
CREATE INDEX "source_registry_category_idx" ON "source_registry" USING btree ("category");--> statement-breakpoint
CREATE INDEX "source_registry_enabled_idx" ON "source_registry" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "reports_user_id_idx" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_vehicle_id_idx" ON "reports" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "reports_vin_idx" ON "reports" USING btree ("vin_queried");--> statement-breakpoint
CREATE INDEX "reports_plate_idx" ON "reports" USING btree ("plate_queried","plate_state");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_sources_report_source_idx" ON "report_sources" USING btree ("report_id","source_key");--> statement-breakpoint
CREATE INDEX "report_sources_status_idx" ON "report_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_sources_source_key_idx" ON "report_sources" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "ai_analyses_report_id_idx" ON "ai_analyses" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "ai_analyses_version_idx" ON "ai_analyses" USING btree ("report_id","version");--> statement-breakpoint
CREATE INDEX "source_cache_expires_at_idx" ON "source_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "source_cache_source_key_idx" ON "source_cache" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_provider_payment_id_idx" ON "transactions" USING btree ("provider","provider_payment_id") WHERE "transactions"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_report_id_idx" ON "transactions" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credits_ledger_user_id_idx" ON "credits_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credits_ledger_reason_idx" ON "credits_ledger" USING btree ("reason");--> statement-breakpoint
CREATE UNIQUE INDEX "shared_links_token_idx" ON "shared_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "shared_links_report_idx" ON "shared_links" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_api_key_idx" ON "webhook_deliveries" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_report_idx" ON "webhook_deliveries" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_next_retry_idx" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");