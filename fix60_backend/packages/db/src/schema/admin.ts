import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, uuidPk } from './columns';
import { actorTypeEnum, adminStatusEnum } from './enums';

/** Back-office staff. Separate from `users` so admin credentials never mix with phone accounts. */
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuidPk(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    status: adminStatusEnum('status').notNull().default('active'),
    /** AES-256-GCM ciphertext of the TOTP secret; null until enrolment is confirmed. */
    totpSecretEnc: text('totp_secret_enc'),
    totpPendingSecretEnc: text('totp_pending_secret_enc'),
    totpEnabledAt: timestamp('totp_enabled_at', { withTimezone: true }),
    /** Last accepted 30-second step; codes at or before it are rejected as replays. */
    totpLastStep: bigint('totp_last_step', { mode: 'number' }),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('admin_users_email_live')
      .on(sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Named permission bundles. `is_super` roles bypass permission checks. */
export const adminRoles = pgTable(
  'admin_roles',
  {
    id: uuidPk(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isSuper: boolean('is_super').notNull().default(false),
    isSystem: boolean('is_system').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('admin_roles_slug_live')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Permission keys are defined in code (`@fix60/shared` adminPermissions). */
export const adminRolePermissions = pgTable(
  'admin_role_permissions',
  {
    id: uuidPk(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => adminRoles.id),
    permission: text('permission').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('admin_role_permissions_live')
      .on(table.roleId, table.permission)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const adminUserRoles = pgTable(
  'admin_user_roles',
  {
    id: uuidPk(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => adminRoles.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('admin_user_roles_live')
      .on(table.adminId, table.roleId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/**
 * Append-only trail of privileged actions (a trigger rejects UPDATE/DELETE/TRUNCATE), so no `deleted_at`;
 * `diff` is redacted before insert and never holds secrets or document contents.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuidPk(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    diff: jsonb('diff').$type<Record<string, unknown>>(),
    requestId: text('request_id'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId, table.createdAt),
    index('audit_logs_actor_idx').on(table.actorId, table.createdAt),
    index('audit_logs_created_idx').on(table.createdAt),
  ],
);
