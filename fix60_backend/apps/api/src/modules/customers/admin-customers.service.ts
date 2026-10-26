import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  bookings,
  consents,
  customerProfiles,
  districts,
  localities,
  providerProfiles,
  providerServices,
  serviceRequests,
  services,
  users,
  type Database,
} from '@fix60/db';
import type {
  AdminBookingSummary,
  AdminCustomerDetail,
  AdminCustomerListQuery,
  AdminCustomerSummary,
  Paged,
} from '@fix60/shared';
import { notFound } from '../../common/api-exception';
import { escapeLike, toIso } from '../../common/format';
import { DATABASE } from '../../database/database.module';

const RECENT_BOOKINGS = 10;

const bookingCount = sql<number>`(
  SELECT count(*)::int FROM ${bookings}
  WHERE ${bookings.customerId} = ${users.id} AND ${bookings.deletedAt} IS NULL
)`;

/** Read side of customer management. Writes go through AccountsService. */
@Injectable()
export class AdminCustomersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(query: AdminCustomerListQuery): Promise<Paged<AdminCustomerSummary>> {
    const filters: (SQL | undefined)[] = [eq(users.role, 'customer'), isNull(users.deletedAt)];
    if (query.status) {
      filters.push(eq(users.status, query.status));
    }
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      filters.push(
        or(ilike(users.fullName, pattern), ilike(users.phone, pattern), ilike(users.email, pattern)),
      );
    }
    const where = and(...filters);
    const [rows, [totals]] = await Promise.all([
      this.db
        .select({ user: users, districtName: districts.name, bookingCount })
        .from(users)
        .leftJoin(
          customerProfiles,
          and(eq(customerProfiles.userId, users.id), isNull(customerProfiles.deletedAt)),
        )
        .leftJoin(districts, eq(districts.id, customerProfiles.districtId))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.user.id,
        fullName: row.user.fullName,
        phone: row.user.phone,
        email: row.user.email,
        status: row.user.status,
        district: row.districtName?.en ?? null,
        bookingCount: row.bookingCount,
        createdAt: row.user.createdAt.toISOString(),
        lastLoginAt: toIso(row.user.lastLoginAt),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: totals?.total ?? 0,
    };
  }

  async get(id: string): Promise<AdminCustomerDetail> {
    const [row] = await this.db
      .select({
        user: users,
        districtName: districts.name,
        localityName: localities.name,
        bookingCount,
      })
      .from(users)
      .leftJoin(
        customerProfiles,
        and(eq(customerProfiles.userId, users.id), isNull(customerProfiles.deletedAt)),
      )
      .leftJoin(districts, eq(districts.id, customerProfiles.districtId))
      .leftJoin(localities, eq(localities.id, customerProfiles.localityId))
      .where(and(eq(users.id, id), eq(users.role, 'customer'), isNull(users.deletedAt)));
    if (!row) {
      throw notFound('Customer');
    }
    const [[requests], [completed], consentRows, recentBookings] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(serviceRequests)
        .where(and(eq(serviceRequests.customerId, id), isNull(serviceRequests.deletedAt))),
      this.db
        .select({ total: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.customerId, id),
            eq(bookings.status, 'service_completed'),
            isNull(bookings.deletedAt),
          ),
        ),
      this.db
        .selectDistinctOn([consents.type], {
          type: consents.type,
          isGranted: consents.isGranted,
          policyVersion: consents.policyVersion,
          createdAt: consents.createdAt,
        })
        .from(consents)
        .where(and(eq(consents.userId, id), isNull(consents.deletedAt)))
        .orderBy(consents.type, desc(consents.createdAt)),
      this.recentBookings(id),
    ]);
    const { user } = row;
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      status: user.status,
      district: row.districtName?.en ?? null,
      bookingCount: row.bookingCount,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: toIso(user.lastLoginAt),
      whatsappPhone: user.whatsappPhone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      preferredLocale: user.preferredLocale,
      locality: row.localityName?.en ?? null,
      suspendedAt: toIso(user.suspendedAt),
      suspensionReason: user.suspensionReason,
      requestCount: requests?.total ?? 0,
      completedBookingCount: completed?.total ?? 0,
      consents: consentRows.map((consent) => ({
        type: consent.type,
        isGranted: consent.isGranted,
        policyVersion: consent.policyVersion,
        at: consent.createdAt.toISOString(),
      })),
      recentBookings,
    };
  }

  private async recentBookings(customerId: string): Promise<AdminBookingSummary[]> {
    const rows = await this.db
      .select({
        id: bookings.id,
        code: bookings.code,
        status: bookings.status,
        slot: bookings.slot,
        serviceName: services.name,
        providerName: users.fullName,
      })
      .from(bookings)
      .innerJoin(providerServices, eq(providerServices.id, bookings.providerServiceId))
      .innerJoin(services, eq(services.id, providerServices.serviceId))
      .innerJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
      .innerJoin(users, eq(users.id, providerProfiles.userId))
      .where(and(eq(bookings.customerId, customerId), isNull(bookings.deletedAt)))
      .orderBy(desc(bookings.createdAt))
      .limit(RECENT_BOOKINGS);
    return rows.map((booking) => ({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      serviceName: booking.serviceName.en,
      counterpartName: booking.providerName,
      startsAt: toIso(booking.slot.start),
    }));
  }
}
