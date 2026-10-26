import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  inet,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';
import { auditColumns, uuidPk } from './columns';
import {
  consentSourceEnum,
  consentTypeEnum,
  devicePlatformEnum,
  genderEnum,
  userRoleEnum,
  userStatusEnum,
} from './enums';
import { districts, localities } from './locations';

/** Customers and providers, authenticated by Firebase phone OTP. One role per account in Phase 1. */
export const users = pgTable(
  'users',
  {
    id: uuidPk(),
    role: userRoleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('active'),
    firebaseUid: text('firebase_uid'),
    /** E.164, e.g. +919876543210. Verified by Firebase. */
    phone: text('phone'),
    whatsappPhone: text('whatsapp_phone'),
    email: text('email'),
    fullName: text('full_name').notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: genderEnum('gender'),
    /** Storage key, never a public URL. */
    profilePhotoKey: text('profile_photo_key'),
    preferredLocale: text('preferred_locale').notNull().default('en'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('users_firebase_uid_live')
      .on(table.firebaseUid)
      .where(sql`${table.deletedAt} IS NULL AND ${table.firebaseUid} IS NOT NULL`),
    uniqueIndex('users_phone_live')
      .on(table.phone)
      .where(sql`${table.deletedAt} IS NULL AND ${table.phone} IS NOT NULL`),
    index('users_role_status_idx').on(table.role, table.status),
    check(
      'users_provider_adult',
      sql`${table.role} <> 'provider' OR ${table.dateOfBirth} IS NULL OR ${table.dateOfBirth} <= (${table.createdAt} - interval '18 years')::date`,
    ),
  ],
);

export const customerProfiles = pgTable(
  'customer_profiles',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    districtId: uuid('district_id').references(() => districts.id),
    localityId: uuid('locality_id').references(() => localities.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('customer_profiles_user_live')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/**
 * Opaque refresh tokens (sha256 stored). Each login starts a `family`; reuse of a rotated
 * token revokes the whole family. Exactly one of user_id / admin_id is set.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuidPk(),
    userId: uuid('user_id').references(() => users.id),
    adminId: uuid('admin_id').references(() => adminUsers.id),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash').on(table.tokenHash),
    index('refresh_tokens_family_idx').on(table.familyId),
    check('refresh_tokens_one_subject', sql`num_nonnulls(${table.userId}, ${table.adminId}) = 1`),
  ],
);

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    token: text('token').notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('device_tokens_token_live')
      .on(table.token)
      .where(sql`${table.deletedAt} IS NULL`),
    index('device_tokens_user_idx').on(table.userId),
  ],
);

/** Append-style consent ledger: every grant or withdrawal is a new row; the latest per type wins. */
export const consents = pgTable(
  'consents',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: consentTypeEnum('type').notNull(),
    isGranted: boolean('is_granted').notNull(),
    policyVersion: text('policy_version').notNull(),
    source: consentSourceEnum('source').notNull(),
    ipAddress: inet('ip_address'),
    ...auditColumns,
  },
  (table) => [index('consents_user_type_idx').on(table.userId, table.type, table.createdAt)],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuidPk(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('user_blocks_pair_live')
      .on(table.blockerId, table.blockedId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('user_blocks_blocked_idx').on(table.blockedId),
    check('user_blocks_not_self', sql`${table.blockerId} <> ${table.blockedId}`),
  ],
);

/** Account deletion with a grace period; a job anonymises PII when `scheduled_for` passes. */
export const accountDeletionRequests = pgTable(
  'account_deletion_requests',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    reason: text('reason'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('account_deletion_open')
      .on(table.userId)
      .where(
        sql`${table.cancelledAt} IS NULL AND ${table.completedAt} IS NULL AND ${table.deletedAt} IS NULL`,
      ),
  ],
);
