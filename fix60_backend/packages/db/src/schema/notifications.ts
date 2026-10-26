import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';
import { auditColumns, uuidPk } from './columns';
import { deliveryStatusEnum, notificationChannelEnum } from './enums';
import { users } from './users';

/** Message copy per event × channel × locale. WhatsApp rows reference a Meta-approved template name. */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuidPk(),
    event: text('event').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    locale: text('locale').notNull().default('en'),
    title: text('title'),
    body: text('body').notNull(),
    whatsappTemplateName: text('whatsapp_template_name'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('notification_templates_live')
      .on(table.event, table.channel, table.locale)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** In-app inbox entry. Exactly one recipient. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuidPk(),
    userId: uuid('user_id').references(() => users.id),
    adminId: uuid('admin_id').references(() => adminUsers.id),
    event: text('event').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, string>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index('notifications_user_idx').on(table.userId, table.createdAt),
    index('notifications_admin_idx').on(table.adminId, table.createdAt),
    check('notifications_one_recipient', sql`num_nonnulls(${table.userId}, ${table.adminId}) = 1`),
  ],
);

/**
 * One attempt to deliver a notification on an external channel. `is_test_mode` rows were
 * handled by a test adapter and must never be reported as delivered to a real person.
 */
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuidPk(),
    notificationId: uuid('notification_id').references(() => notifications.id),
    userId: uuid('user_id').references(() => users.id),
    channel: notificationChannelEnum('channel').notNull(),
    event: text('event').notNull(),
    /** Masked destination, e.g. +91******3210. */
    destinationMasked: text('destination_masked'),
    provider: text('provider').notNull(),
    isTestMode: boolean('is_test_mode').notNull(),
    status: deliveryStatusEnum('status').notNull().default('queued'),
    providerMessageId: text('provider_message_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    attemptCount: integer('attempt_count').notNull().default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index('notification_deliveries_status_idx').on(table.status, table.createdAt),
    uniqueIndex('notification_deliveries_provider_msg')
      .on(table.provider, table.providerMessageId)
      .where(sql`${table.providerMessageId} IS NOT NULL`),
  ],
);
