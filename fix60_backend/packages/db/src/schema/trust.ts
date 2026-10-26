import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgSequence,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';
import { auditColumns, uuidPk } from './columns';
import {
  reportReasonEnum,
  reportStatusEnum,
  reviewStatusEnum,
  supportTicketStatusEnum,
} from './enums';
import { providerProfiles } from './providers';
import { bookings, serviceRequests } from './requests';
import { users } from './users';

export const reportCodeSeq = pgSequence('report_code_seq', { startWith: 1 });
export const ticketCodeSeq = pgSequence('ticket_code_seq', { startWith: 1 });

/** One review per completed booking, written by the customer. */
export const reviews = pgTable(
  'reviews',
  {
    id: uuidPk(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    rating: smallint('rating').notNull(),
    comment: text('comment'),
    status: reviewStatusEnum('status').notNull().default('published'),
    moderatedById: uuid('moderated_by_id').references(() => adminUsers.id),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderationNote: text('moderation_note'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('reviews_booking_live')
      .on(table.bookingId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('reviews_provider_idx').on(table.providerId, table.status),
    check('reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

/** Safety / misconduct reports. Visible only to the reporter and permitted admins. */
export const reports = pgTable(
  'reports',
  {
    id: uuidPk(),
    code: text('code').notNull(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id),
    subjectUserId: uuid('subject_user_id')
      .notNull()
      .references(() => users.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    requestId: uuid('request_id').references(() => serviceRequests.id),
    reason: reportReasonEnum('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('open'),
    assignedToId: uuid('assigned_to_id').references(() => adminUsers.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('reports_code').on(table.code),
    index('reports_status_idx').on(table.status, table.createdAt),
    index('reports_subject_idx').on(table.subjectUserId),
    check('reports_not_self', sql`${table.reporterId} <> ${table.subjectUserId}`),
  ],
);

export const reportActions = pgTable(
  'report_actions',
  {
    id: uuidPk(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    action: text('action').notNull(),
    note: text('note'),
    ...auditColumns,
  },
  (table) => [index('report_actions_report_idx').on(table.reportId, table.createdAt)],
);

export const savedProviders = pgTable(
  'saved_providers',
  {
    id: uuidPk(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('saved_providers_live')
      .on(table.customerId, table.providerId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuidPk(),
    code: text('code').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    subject: text('subject').notNull(),
    status: supportTicketStatusEnum('status').notNull().default('open'),
    assignedToId: uuid('assigned_to_id').references(() => adminUsers.id),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('support_tickets_code').on(table.code),
    index('support_tickets_user_idx').on(table.userId, table.createdAt),
    index('support_tickets_status_idx').on(table.status, table.lastMessageAt),
  ],
);

export const supportMessages = pgTable(
  'support_messages',
  {
    id: uuidPk(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id),
    senderUserId: uuid('sender_user_id').references(() => users.id),
    senderAdminId: uuid('sender_admin_id').references(() => adminUsers.id),
    body: text('body').notNull(),
    ...auditColumns,
  },
  (table) => [
    index('support_messages_ticket_idx').on(table.ticketId, table.createdAt),
    check(
      'support_messages_one_sender',
      sql`num_nonnulls(${table.senderUserId}, ${table.senderAdminId}) = 1`,
    ),
  ],
);
