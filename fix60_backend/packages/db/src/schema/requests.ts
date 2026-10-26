import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgSequence,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';
import { services } from './catalog';
import { auditColumns, geographyPoint, tstzRange, uuidPk } from './columns';
import {
  actorTypeEnum,
  bookingStatusEnum,
  invitationStatusEnum,
  requestSourceEnum,
  requestStatusEnum,
} from './enums';
import { localities } from './locations';
import { providerProfiles, providerServices } from './providers';
import { users } from './users';

export const requestCodeSeq = pgSequence('request_code_seq', { startWith: 1 });
export const bookingCodeSeq = pgSequence('booking_code_seq', { startWith: 1 });

/** A customer's need. Becomes a booking only through the confirm transition. */
export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuidPk(),
    code: text('code').notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    source: requestSourceEnum('source').notNull(),
    /** Set for directed requests (customer picked a provider). */
    targetProviderId: uuid('target_provider_id').references(() => providerProfiles.id),
    localityId: uuid('locality_id')
      .notNull()
      .references(() => localities.id),
    point: geographyPoint('point').notNull(),
    /** Landmark / area description. The full address is shared only after booking confirmation. */
    areaNote: text('area_note'),
    preferredDate: date('preferred_date').notNull(),
    startTime: time('start_time').notNull(),
    durationHours: numeric('duration_hours', { precision: 4, scale: 1, mode: 'number' }).notNull(),
    budgetAmount: numeric('budget_amount', { precision: 10, scale: 2, mode: 'number' }),
    requirements: text('requirements'),
    contactPhone: text('contact_phone').notNull(),
    contactWhatsapp: text('contact_whatsapp'),
    status: requestStatusEnum('status').notNull().default('submitted'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).notNull().defaultNow(),
    assignedToId: uuid('assigned_to_id').references(() => adminUsers.id),
    cancelledBy: actorTypeEnum('cancelled_by'),
    cancelReason: text('cancel_reason'),
    /** Set by the moderation keyword filter; routes the request to the admin review queue. */
    flaggedAt: timestamp('flagged_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('service_requests_code').on(table.code),
    index('service_requests_customer_idx').on(table.customerId, table.createdAt),
    index('service_requests_status_idx').on(table.status, table.statusChangedAt),
    index('service_requests_point_gist').using('gist', table.point),
    check(
      'service_requests_duration',
      sql`${table.durationHours} > 0 AND ${table.durationHours} <= 744`,
    ),
    check(
      'service_requests_budget',
      sql`${table.budgetAmount} IS NULL OR ${table.budgetAmount} >= 0`,
    ),
    check(
      'service_requests_directed_target',
      sql`${table.source} <> 'directed' OR ${table.targetProviderId} IS NOT NULL`,
    ),
  ],
);

/** Per-provider offer of a request and that provider's response. */
export const requestInvitations = pgTable(
  'request_invitations',
  {
    id: uuidPk(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    providerServiceId: uuid('provider_service_id')
      .notNull()
      .references(() => providerServices.id),
    status: invitationStatusEnum('status').notNull().default('invited'),
    rankScore: numeric('rank_score', { precision: 8, scale: 3, mode: 'number' }),
    distanceKm: numeric('distance_km', { precision: 6, scale: 2, mode: 'number' }),
    invitedById: uuid('invited_by_id').references(() => adminUsers.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    declineReason: text('decline_reason'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('request_invitations_live')
      .on(table.requestId, table.providerId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('request_invitations_provider_idx').on(table.providerId, table.status),
    index('request_invitations_expiry_idx')
      .on(table.expiresAt)
      .where(sql`${table.status} IN ('invited', 'viewed')`),
  ],
);

export const requestStatusHistory = pgTable(
  'request_status_history',
  {
    id: uuidPk(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id),
    fromStatus: requestStatusEnum('from_status'),
    toStatus: requestStatusEnum('to_status').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('request_status_history_request_idx').on(table.requestId, table.createdAt)],
);

/**
 * Confirmed engagement. Overlapping active bookings for one provider are rejected by the
 * `bookings_no_overlap` EXCLUDE constraint (custom migration), not only by application code.
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuidPk(),
    code: text('code').notNull(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id),
    invitationId: uuid('invitation_id')
      .notNull()
      .references(() => requestInvitations.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providerProfiles.id),
    providerServiceId: uuid('provider_service_id')
      .notNull()
      .references(() => providerServices.id),
    slot: tstzRange('slot').notNull(),
    agreedHourlyRate: numeric('agreed_hourly_rate', { precision: 10, scale: 2, mode: 'number' }),
    status: bookingStatusEnum('status').notNull().default('confirmed'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: actorTypeEnum('cancelled_by'),
    cancelReason: text('cancel_reason'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('bookings_code').on(table.code),
    uniqueIndex('bookings_request_live')
      .on(table.requestId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('bookings_customer_idx').on(table.customerId, table.status),
    index('bookings_provider_idx').on(table.providerId, table.status),
  ],
);

export const bookingStatusHistory = pgTable(
  'booking_status_history',
  {
    id: uuidPk(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    fromStatus: bookingStatusEnum('from_status'),
    toStatus: bookingStatusEnum('to_status').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('booking_status_history_booking_idx').on(table.bookingId, table.createdAt)],
);
