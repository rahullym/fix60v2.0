import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';
import { serviceQuestions, services } from './catalog';
import { auditColumns, geographyPoint, tstzRange, uuidPk } from './columns';
import {
  applicationStatusEnum,
  availabilityTypeEnum,
  dayPartEnum,
  documentStatusEnum,
  documentTypeEnum,
  providerServiceStatusEnum,
  providerStatusEnum,
  qualificationKindEnum,
  travelPreferenceEnum,
} from './enums';
import { localities } from './locations';
import { users } from './users';

export const providerCodeSeq = pgSequence('provider_code_seq', { startWith: 1001 });
export const applicationCodeSeq = pgSequence('application_code_seq', { startWith: 1 });

/** Provider-only profile. Public fields are whitelisted in the API; this row is never serialised as-is. */
export const providerProfiles = pgTable(
  'provider_profiles',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    /** Public handle, e.g. PRV-1042. */
    code: text('code').notNull(),
    status: providerStatusEnum('status').notNull().default('onboarding'),
    bio: text('bio'),
    yearsExperience: smallint('years_experience'),
    previousWork: text('previous_work'),
    languages: text('languages')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    travelPreference: travelPreferenceEnum('travel_preference'),
    availabilityTypes: availabilityTypeEnum('availability_types')
      .array()
      .notNull()
      .default(sql`'{}'`),
    dayParts: dayPartEnum('day_parts')
      .array()
      .notNull()
      .default(sql`'{}'`),
    maxHoursPerDay: smallint('max_hours_per_day'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('provider_profiles_user_live')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('provider_profiles_code').on(table.code),
    index('provider_profiles_status_idx').on(table.status),
    check(
      'provider_profiles_max_hours',
      sql`${table.maxHoursPerDay} IS NULL OR ${table.maxHoursPerDay} BETWEEN 1 AND 24`,
    ),
    check(
      'provider_profiles_years',
      sql`${table.yearsExperience} IS NULL OR ${table.yearsExperience} BETWEEN 0 AND 70`,
    ),
  ],
);

/** A provider's offer for one service. Approval is per service. Rates are informational in Phase 1. */
export const providerServices = pgTable(
  'provider_services',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    status: providerServiceStatusEnum('status').notNull().default('pending'),
    yearsExperience: smallint('years_experience'),
    hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2, mode: 'number' }),
    dailyRate: numeric('daily_rate', { precision: 10, scale: 2, mode: 'number' }),
    monthlyRate: numeric('monthly_rate', { precision: 12, scale: 2, mode: 'number' }),
    isNegotiable: boolean('is_negotiable').notNull().default(false),
    minBookingMinutes: integer('min_booking_minutes').notNull().default(60),
    reviewedById: uuid('reviewed_by_id').references(() => adminUsers.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('provider_services_live')
      .on(table.providerId, table.serviceId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('provider_services_service_status_idx').on(table.serviceId, table.status),
    check(
      'provider_services_rates_positive',
      sql`coalesce(${table.hourlyRate}, 0) >= 0 AND coalesce(${table.dailyRate}, 0) >= 0 AND coalesce(${table.monthlyRate}, 0) >= 0`,
    ),
    check('provider_services_min_booking', sql`${table.minBookingMinutes} BETWEEN 15 AND 43200`),
  ],
);

export const providerServiceAnswers = pgTable(
  'provider_service_answers',
  {
    id: uuidPk(),
    providerServiceId: uuid('provider_service_id')
      .notNull()
      .references(() => providerServices.id),
    questionId: uuid('question_id')
      .notNull()
      .references(() => serviceQuestions.id),
    value: jsonb('value').$type<string | number | boolean | string[]>().notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('provider_service_answers_live')
      .on(table.providerServiceId, table.questionId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const providerQualifications = pgTable(
  'provider_qualifications',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    kind: qualificationKindEnum('kind').notNull(),
    title: text('title').notNull(),
    issuer: text('issuer'),
    year: smallint('year'),
    documentId: uuid('document_id').references(() => verificationDocuments.id),
    ...auditColumns,
  },
  (table) => [index('provider_qualifications_provider_idx').on(table.providerId)],
);

/** Coverage circle. Matching checks `ST_DWithin(center, request.point, radius_km * 1000)`. */
export const providerServiceAreas = pgTable(
  'provider_service_areas',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    localityId: uuid('locality_id').references(() => localities.id),
    center: geographyPoint('center').notNull(),
    radiusKm: numeric('radius_km', { precision: 5, scale: 1, mode: 'number' }).notNull(),
    ...auditColumns,
  },
  (table) => [
    index('provider_service_areas_center_gist').using('gist', table.center),
    index('provider_service_areas_provider_idx').on(table.providerId),
    check('provider_service_areas_radius', sql`${table.radiusKm} > 0 AND ${table.radiusKm} <= 100`),
  ],
);

/** Weekly recurring windows in the provider's local time (Asia/Kolkata). 0 = Sunday. */
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    ...auditColumns,
  },
  (table) => [
    index('availability_rules_provider_idx').on(table.providerId, table.weekday),
    check('availability_rules_weekday', sql`${table.weekday} BETWEEN 0 AND 6`),
    check('availability_rules_order', sql`${table.startTime} < ${table.endTime}`),
  ],
);

/** Time off that overrides the weekly rules. */
export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    during: tstzRange('during').notNull(),
    reason: text('reason'),
    ...auditColumns,
  },
  (table) => [
    index('availability_exceptions_during_gist').using('gist', table.providerId, table.during),
  ],
);

/** One wizard run. `draft` holds unsubmitted step data so the app can resume. */
export const providerApplications = pgTable(
  'provider_applications',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    /** Public reference, e.g. APP-26-000017. */
    code: text('code').notNull(),
    status: applicationStatusEnum('status').notNull().default('draft'),
    currentStep: smallint('current_step').notNull().default(1),
    draft: jsonb('draft').$type<Record<string, unknown>>().notNull().default({}),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: uuid('decided_by_id').references(() => adminUsers.id),
    decisionNote: text('decision_note'),
    assignedToId: uuid('assigned_to_id').references(() => adminUsers.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('provider_applications_code').on(table.code),
    uniqueIndex('provider_applications_one_open')
      .on(table.providerId)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.status} IN ('draft', 'submitted', 'under_review', 'info_required')`,
      ),
    index('provider_applications_status_idx').on(table.status, table.submittedAt),
    check('provider_applications_step', sql`${table.currentStep} BETWEEN 1 AND 9`),
  ],
);

/**
 * Restricted data. Bytes live in the private bucket under `storage_key`; reads go through
 * short-lived signed URLs issued to permitted admins only. Only the last 4 digits of an ID number are kept.
 */
export const verificationDocuments = pgTable(
  'verification_documents',
  {
    id: uuidPk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    applicationId: uuid('application_id').references(() => providerApplications.id),
    serviceId: uuid('service_id').references(() => services.id),
    type: documentTypeEnum('type').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    sha256: text('sha256'),
    idNumberLast4: text('id_number_last4'),
    status: documentStatusEnum('status').notNull().default('pending'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    reviewedById: uuid('reviewed_by_id').references(() => adminUsers.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    purgeAfter: timestamp('purge_after', { withTimezone: true }),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('verification_documents_key').on(table.storageKey),
    index('verification_documents_provider_idx').on(table.providerId, table.type),
    index('verification_documents_purge_idx')
      .on(table.purgeAfter)
      .where(sql`${table.purgedAt} IS NULL`),
    check(
      'verification_documents_last4',
      sql`${table.idNumberLast4} IS NULL OR ${table.idNumberLast4} ~ '^[0-9A-Z]{4}$'`,
    ),
  ],
);

export const applicationReviews = pgTable(
  'application_reviews',
  {
    id: uuidPk(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => providerApplications.id),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    action: text('action').notNull(),
    note: text('note'),
    ...auditColumns,
  },
  (table) => [
    index('application_reviews_application_idx').on(table.applicationId, table.createdAt),
  ],
);
