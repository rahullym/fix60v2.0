CREATE TYPE "public"."actor_type" AS ENUM('customer', 'provider', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'info_required', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."availability_type" AS ENUM('hourly', 'part_time', 'full_time', 'daily', 'weekly', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'service_started', 'service_completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."cms_block_type" AS ENUM('banner', 'faq', 'contact', 'testimonial');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('app', 'web', 'admin');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy', 'safety_policy', 'service_communications', 'whatsapp_updates', 'marketing', 'provider_declaration');--> statement-breakpoint
CREATE TYPE "public"."day_part" AS ENUM('morning', 'afternoon', 'evening', 'night');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'verified', 'rejected', 'info_required');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('id_proof', 'address_proof', 'driving_licence', 'police_clearance', 'qualification_certificate', 'training_certificate', 'reference_letter', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('invited', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'push', 'sms', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."provider_service_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('onboarding', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."qualification_kind" AS ENUM('qualification', 'training', 'certification', 'work_experience');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('text', 'textarea', 'number', 'boolean', 'single_select', 'multi_select', 'date');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('harassment', 'unsafe_behaviour', 'false_information', 'inappropriate_request', 'payment_issue', 'misconduct', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'investigating', 'actioned', 'closed');--> statement-breakpoint
CREATE TYPE "public"."request_source" AS ENUM('quick', 'directed', 'admin');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'under_review', 'matching', 'provider_notified', 'provider_accepted', 'provider_declined', 'customer_confirmation_pending', 'booking_confirmed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'awaiting_user', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."travel_preference" AS ENUM('yes', 'no', 'depends_on_distance');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'provider');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'pending_deletion', 'deleted');--> statement-breakpoint
CREATE SEQUENCE "public"."application_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."provider_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."booking_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."request_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."report_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."ticket_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "admin_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_super" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admin_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" "admin_status" DEFAULT 'active' NOT NULL,
	"totp_secret_enc" text,
	"totp_pending_secret_enc" text,
	"totp_enabled_at" timestamp with time zone,
	"totp_last_step" bigint,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"diff" jsonb,
	"request_id" text,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"centroid" geography(Point, 4326),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "localities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"local_body" text,
	"postal_code" text,
	"centroid" geography(Point, 4326) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"is_granted" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"source" "consent_source" NOT NULL,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"district_id" uuid,
	"locality_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_id" uuid,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_one_subject" CHECK (num_nonnulls("refresh_tokens"."user_id", "refresh_tokens"."admin_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_blocks_not_self" CHECK ("user_blocks"."blocker_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"firebase_uid" text,
	"phone" text,
	"whatsapp_phone" text,
	"email" text,
	"full_name" text NOT NULL,
	"date_of_birth" date,
	"gender" "gender",
	"profile_photo_key" text,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_provider_adult" CHECK ("users"."role" <> 'provider' OR "users"."date_of_birth" IS NULL OR "users"."date_of_birth" <= ("users"."created_at" - interval '18 years')::date)
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"image_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"key" text NOT NULL,
	"type" "question_type" NOT NULL,
	"label" jsonb NOT NULL,
	"help_text" jsonb,
	"options" jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_required_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"note" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"image_key" text,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "application_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"during" "tstzrange" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "availability_rules_weekday" CHECK ("availability_rules"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "availability_rules_order" CHECK ("availability_rules"."start_time" < "availability_rules"."end_time")
);
--> statement-breakpoint
CREATE TABLE "provider_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"current_step" smallint DEFAULT 1 NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_id" uuid,
	"decision_note" text,
	"assigned_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "provider_applications_step" CHECK ("provider_applications"."current_step" BETWEEN 1 AND 9)
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" "provider_status" DEFAULT 'onboarding' NOT NULL,
	"bio" text,
	"years_experience" smallint,
	"previous_work" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"travel_preference" "travel_preference",
	"availability_types" "availability_type"[] DEFAULT '{}' NOT NULL,
	"day_parts" "day_part"[] DEFAULT '{}' NOT NULL,
	"max_hours_per_day" smallint,
	"approved_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "provider_profiles_max_hours" CHECK ("provider_profiles"."max_hours_per_day" IS NULL OR "provider_profiles"."max_hours_per_day" BETWEEN 1 AND 24),
	CONSTRAINT "provider_profiles_years" CHECK ("provider_profiles"."years_experience" IS NULL OR "provider_profiles"."years_experience" BETWEEN 0 AND 70)
);
--> statement-breakpoint
CREATE TABLE "provider_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"kind" "qualification_kind" NOT NULL,
	"title" text NOT NULL,
	"issuer" text,
	"year" smallint,
	"document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_service_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_service_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"locality_id" uuid,
	"center" geography(Point, 4326) NOT NULL,
	"radius_km" numeric(5, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "provider_service_areas_radius" CHECK ("provider_service_areas"."radius_km" > 0 AND "provider_service_areas"."radius_km" <= 100)
);
--> statement-breakpoint
CREATE TABLE "provider_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "provider_service_status" DEFAULT 'pending' NOT NULL,
	"years_experience" smallint,
	"hourly_rate" numeric(10, 2),
	"daily_rate" numeric(10, 2),
	"monthly_rate" numeric(12, 2),
	"is_negotiable" boolean DEFAULT false NOT NULL,
	"min_booking_minutes" integer DEFAULT 60 NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "provider_services_rates_positive" CHECK (coalesce("provider_services"."hourly_rate", 0) >= 0 AND coalesce("provider_services"."daily_rate", 0) >= 0 AND coalesce("provider_services"."monthly_rate", 0) >= 0),
	CONSTRAINT "provider_services_min_booking" CHECK ("provider_services"."min_booking_minutes" BETWEEN 15 AND 43200)
);
--> statement-breakpoint
CREATE TABLE "verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"application_id" uuid,
	"service_id" uuid,
	"type" "document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint,
	"sha256" text,
	"id_number_last4" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"purge_after" timestamp with time zone,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "verification_documents_last4" CHECK ("verification_documents"."id_number_last4" IS NULL OR "verification_documents"."id_number_last4" ~ '^[0-9A-Z]{4}$')
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"request_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_service_id" uuid NOT NULL,
	"slot" "tstzrange" NOT NULL,
	"agreed_hourly_rate" numeric(10, 2),
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" "actor_type",
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "request_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_service_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'invited' NOT NULL,
	"rank_score" numeric(8, 3),
	"distance_km" numeric(6, 2),
	"invited_by_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"viewed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"source" "request_source" NOT NULL,
	"target_provider_id" uuid,
	"locality_id" uuid NOT NULL,
	"point" geography(Point, 4326) NOT NULL,
	"area_note" text,
	"preferred_date" date NOT NULL,
	"start_time" time NOT NULL,
	"duration_hours" numeric(4, 1) NOT NULL,
	"budget_amount" numeric(10, 2),
	"requirements" text,
	"contact_phone" text NOT NULL,
	"contact_whatsapp" text,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_to_id" uuid,
	"cancelled_by" "actor_type",
	"cancel_reason" text,
	"flagged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "service_requests_duration" CHECK ("service_requests"."duration_hours" > 0 AND "service_requests"."duration_hours" <= 744),
	CONSTRAINT "service_requests_budget" CHECK ("service_requests"."budget_amount" IS NULL OR "service_requests"."budget_amount" >= 0),
	CONSTRAINT "service_requests_directed_target" CHECK ("service_requests"."source" <> 'directed' OR "service_requests"."target_provider_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "report_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"reporter_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"booking_id" uuid,
	"request_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"assigned_to_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reports_not_self" CHECK ("reports"."reporter_id" <> "reports"."subject_user_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"moderated_by_id" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "saved_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"sender_admin_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "support_messages_one_sender" CHECK (num_nonnulls("support_messages"."sender_user_id", "support_messages"."sender_admin_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"subject" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"assigned_to_id" uuid,
	"last_message_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid,
	"user_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"event" text NOT NULL,
	"destination_masked" text,
	"provider" text NOT NULL,
	"is_test_mode" boolean NOT NULL,
	"status" "delivery_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"whatsapp_template_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_id" uuid,
	"event" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notifications_one_recipient" CHECK (num_nonnulls("notifications"."user_id", "notifications"."admin_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "cms_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "cms_block_type" NOT NULL,
	"content" jsonb NOT NULL,
	"image_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"meta_description" jsonb,
	"version" text DEFAULT '1' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"active_theme_slug" text DEFAULT 'graphite-signal' NOT NULL,
	"support_phone" text,
	"support_whatsapp" text,
	"support_email" text,
	"company_address" text,
	"grievance_officer_name" text,
	"grievance_officer_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tokens" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localities" ADD CONSTRAINT "localities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_questions" ADD CONSTRAINT "service_questions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_required_documents" ADD CONSTRAINT "service_required_documents_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_decided_by_id_admin_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_assigned_to_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_qualifications" ADD CONSTRAINT "provider_qualifications_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_qualifications" ADD CONSTRAINT "provider_qualifications_document_id_verification_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."verification_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_answers" ADD CONSTRAINT "provider_service_answers_provider_service_id_provider_services_id_fk" FOREIGN KEY ("provider_service_id") REFERENCES "public"."provider_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_answers" ADD CONSTRAINT "provider_service_answers_question_id_service_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."service_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_areas" ADD CONSTRAINT "provider_service_areas_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_areas" ADD CONSTRAINT "provider_service_areas_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_reviewed_by_id_admin_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_reviewed_by_id_admin_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_invitation_id_request_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."request_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_service_id_provider_services_id_fk" FOREIGN KEY ("provider_service_id") REFERENCES "public"."provider_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_invitations" ADD CONSTRAINT "request_invitations_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_invitations" ADD CONSTRAINT "request_invitations_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_invitations" ADD CONSTRAINT "request_invitations_provider_service_id_provider_services_id_fk" FOREIGN KEY ("provider_service_id") REFERENCES "public"."provider_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_invitations" ADD CONSTRAINT "request_invitations_invited_by_id_admin_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_target_provider_id_provider_profiles_id_fk" FOREIGN KEY ("target_provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_to_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_id_admin_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_providers" ADD CONSTRAINT "saved_providers_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_providers" ADD CONSTRAINT "saved_providers_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_admin_id_admin_users_id_fk" FOREIGN KEY ("sender_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_role_permissions_live" ON "admin_role_permissions" USING btree ("role_id","permission") WHERE "admin_role_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_roles_slug_live" ON "admin_roles" USING btree ("slug") WHERE "admin_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_user_roles_live" ON "admin_user_roles" USING btree ("admin_id","role_id") WHERE "admin_user_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_live" ON "admin_users" USING btree (lower("email")) WHERE "admin_users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_slug_live" ON "districts" USING btree ("state_id","slug") WHERE "districts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "localities_slug_live" ON "localities" USING btree ("district_id","slug") WHERE "localities"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "localities_postal_idx" ON "localities" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "localities_centroid_gist" ON "localities" USING gist ("centroid");--> statement-breakpoint
CREATE UNIQUE INDEX "states_code_live" ON "states" USING btree ("code") WHERE "states"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_deletion_open" ON "account_deletion_requests" USING btree ("user_id") WHERE "account_deletion_requests"."cancelled_at" IS NULL AND "account_deletion_requests"."completed_at" IS NULL AND "account_deletion_requests"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "consents_user_type_idx" ON "consents" USING btree ("user_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_profiles_user_live" ON "customer_profiles" USING btree ("user_id") WHERE "customer_profiles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_live" ON "device_tokens" USING btree ("token") WHERE "device_tokens"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_live" ON "user_blocks" USING btree ("blocker_id","blocked_id") WHERE "user_blocks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_firebase_uid_live" ON "users" USING btree ("firebase_uid") WHERE "users"."deleted_at" IS NULL AND "users"."firebase_uid" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_live" ON "users" USING btree ("phone") WHERE "users"."deleted_at" IS NULL AND "users"."phone" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_slug_live" ON "service_categories" USING btree ("slug") WHERE "service_categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "service_questions_key_live" ON "service_questions" USING btree ("service_id","key") WHERE "service_questions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "service_required_documents_live" ON "service_required_documents" USING btree ("service_id","document_type") WHERE "service_required_documents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_live" ON "services" USING btree ("slug") WHERE "services"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "application_reviews_application_idx" ON "application_reviews" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "availability_exceptions_during_gist" ON "availability_exceptions" USING gist ("provider_id","during");--> statement-breakpoint
CREATE INDEX "availability_rules_provider_idx" ON "availability_rules" USING btree ("provider_id","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_applications_code" ON "provider_applications" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_applications_one_open" ON "provider_applications" USING btree ("provider_id") WHERE "provider_applications"."deleted_at" IS NULL AND "provider_applications"."status" IN ('draft', 'submitted', 'under_review', 'info_required');--> statement-breakpoint
CREATE INDEX "provider_applications_status_idx" ON "provider_applications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profiles_user_live" ON "provider_profiles" USING btree ("user_id") WHERE "provider_profiles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profiles_code" ON "provider_profiles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "provider_profiles_status_idx" ON "provider_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_qualifications_provider_idx" ON "provider_qualifications" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_service_answers_live" ON "provider_service_answers" USING btree ("provider_service_id","question_id") WHERE "provider_service_answers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "provider_service_areas_center_gist" ON "provider_service_areas" USING gist ("center");--> statement-breakpoint
CREATE INDEX "provider_service_areas_provider_idx" ON "provider_service_areas" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_services_live" ON "provider_services" USING btree ("provider_id","service_id") WHERE "provider_services"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "provider_services_service_status_idx" ON "provider_services" USING btree ("service_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_documents_key" ON "verification_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "verification_documents_provider_idx" ON "verification_documents" USING btree ("provider_id","type");--> statement-breakpoint
CREATE INDEX "verification_documents_purge_idx" ON "verification_documents" USING btree ("purge_after") WHERE "verification_documents"."purged_at" IS NULL;--> statement-breakpoint
CREATE INDEX "booking_status_history_booking_idx" ON "booking_status_history" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_code" ON "bookings" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_request_live" ON "bookings" USING btree ("request_id") WHERE "bookings"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "bookings_provider_idx" ON "bookings" USING btree ("provider_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "request_invitations_live" ON "request_invitations" USING btree ("request_id","provider_id") WHERE "request_invitations"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "request_invitations_provider_idx" ON "request_invitations" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "request_invitations_expiry_idx" ON "request_invitations" USING btree ("expires_at") WHERE "request_invitations"."status" IN ('invited', 'viewed');--> statement-breakpoint
CREATE INDEX "request_status_history_request_idx" ON "request_status_history" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_code" ON "service_requests" USING btree ("code");--> statement-breakpoint
CREATE INDEX "service_requests_customer_idx" ON "service_requests" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status","status_changed_at");--> statement-breakpoint
CREATE INDEX "service_requests_point_gist" ON "service_requests" USING gist ("point");--> statement-breakpoint
CREATE INDEX "report_actions_report_idx" ON "report_actions" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_code" ON "reports" USING btree ("code");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_subject_idx" ON "reports" USING btree ("subject_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_live" ON "reviews" USING btree ("booking_id") WHERE "reviews"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reviews_provider_idx" ON "reviews" USING btree ("provider_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_providers_live" ON "saved_providers" USING btree ("customer_id","provider_id") WHERE "saved_providers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_code" ON "support_tickets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_provider_msg" ON "notification_deliveries" USING btree ("provider","provider_message_id") WHERE "notification_deliveries"."provider_message_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_live" ON "notification_templates" USING btree ("event","channel","locale") WHERE "notification_templates"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_admin_idx" ON "notifications" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "cms_blocks_type_idx" ON "cms_blocks" USING btree ("type","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_slug_live" ON "cms_pages" USING btree ("slug") WHERE "cms_pages"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "themes_slug_live" ON "themes" USING btree ("slug") WHERE "themes"."deleted_at" IS NULL;