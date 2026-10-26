import { Inject, Injectable } from '@nestjs/common';
import { and, avg, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  bookings,
  providerApplications,
  providerProfiles,
  providerServiceAreas,
  providerServices,
  reviews,
  services,
  users,
  verificationDocuments,
  type Database,
} from '@fix60/db';
import type {
  AdminBookingSummary,
  AdminProviderDetail,
  AdminProviderListQuery,
  AdminProviderSummary,
  Paged,
} from '@fix60/shared';
import { notFound } from '../../common/api-exception';
import { escapeLike, toIso } from '../../common/format';
import { DATABASE } from '../../database/database.module';

const RECENT_BOOKINGS = 10;

function serviceCount(status: 'approved' | 'pending') {
  return sql<number>`(
    SELECT count(*)::int FROM ${providerServices}
    WHERE ${providerServices.providerId} = ${providerProfiles.id}
      AND ${providerServices.status} = ${status}
      AND ${providerServices.deletedAt} IS NULL
  )`;
}

const summaryColumns = {
  profile: providerProfiles,
  user: users,
  approvedServiceCount: serviceCount('approved'),
  pendingServiceCount: serviceCount('pending'),
};

type SummaryRow = {
  profile: typeof providerProfiles.$inferSelect;
  user: typeof users.$inferSelect;
  approvedServiceCount: number;
  pendingServiceCount: number;
};

function toSummary(row: SummaryRow): AdminProviderSummary {
  return {
    id: row.profile.id,
    userId: row.user.id,
    code: row.profile.code,
    fullName: row.user.fullName,
    phone: row.user.phone,
    status: row.profile.status,
    accountStatus: row.user.status,
    approvedServiceCount: row.approvedServiceCount,
    pendingServiceCount: row.pendingServiceCount,
    yearsExperience: row.profile.yearsExperience,
    createdAt: row.profile.createdAt.toISOString(),
  };
}

/** Read side of provider management. Writes go through AccountsService. */
@Injectable()
export class AdminProvidersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(query: AdminProviderListQuery): Promise<Paged<AdminProviderSummary>> {
    const filters: (SQL | undefined)[] = [isNull(providerProfiles.deletedAt), isNull(users.deletedAt)];
    if (query.status) {
      filters.push(eq(providerProfiles.status, query.status));
    }
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      filters.push(
        or(
          ilike(users.fullName, pattern),
          ilike(users.phone, pattern),
          ilike(users.email, pattern),
          ilike(providerProfiles.code, pattern),
        ),
      );
    }
    const where = and(...filters);
    const [rows, [totals]] = await Promise.all([
      this.db
        .select(summaryColumns)
        .from(providerProfiles)
        .innerJoin(users, eq(users.id, providerProfiles.userId))
        .where(where)
        .orderBy(desc(providerProfiles.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db
        .select({ total: count() })
        .from(providerProfiles)
        .innerJoin(users, eq(users.id, providerProfiles.userId))
        .where(where),
    ]);
    return {
      items: rows.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total: totals?.total ?? 0,
    };
  }

  async get(id: string): Promise<AdminProviderDetail> {
    const [row] = await this.db
      .select(summaryColumns)
      .from(providerProfiles)
      .innerJoin(users, eq(users.id, providerProfiles.userId))
      .where(
        and(eq(providerProfiles.id, id), isNull(providerProfiles.deletedAt), isNull(users.deletedAt)),
      );
    if (!row) {
      throw notFound('Provider');
    }
    const [
      serviceRows,
      [application],
      documentRows,
      [areas],
      [bookingTotals],
      [rating],
      recentBookings,
    ] = await Promise.all([
      this.db
        .select({ offer: providerServices, serviceName: services.name })
        .from(providerServices)
        .innerJoin(services, eq(services.id, providerServices.serviceId))
        .where(and(eq(providerServices.providerId, id), isNull(providerServices.deletedAt)))
        .orderBy(providerServices.createdAt),
      this.db
        .select()
        .from(providerApplications)
        .where(and(eq(providerApplications.providerId, id), isNull(providerApplications.deletedAt)))
        .orderBy(desc(providerApplications.createdAt))
        .limit(1),
      this.db
        .select({
          id: verificationDocuments.id,
          type: verificationDocuments.type,
          status: verificationDocuments.status,
        })
        .from(verificationDocuments)
        .where(
          and(
            eq(verificationDocuments.providerId, id),
            isNull(verificationDocuments.deletedAt),
            isNull(verificationDocuments.purgedAt),
          ),
        )
        .orderBy(verificationDocuments.type),
      this.db
        .select({ total: count() })
        .from(providerServiceAreas)
        .where(and(eq(providerServiceAreas.providerId, id), isNull(providerServiceAreas.deletedAt))),
      this.db
        .select({
          total: count(),
          completed: sql<number>`count(*) FILTER (WHERE ${bookings.status} = 'service_completed')::int`,
        })
        .from(bookings)
        .where(and(eq(bookings.providerId, id), isNull(bookings.deletedAt))),
      this.db
        .select({ average: avg(reviews.rating), total: count() })
        .from(reviews)
        .where(
          and(eq(reviews.providerId, id), eq(reviews.status, 'published'), isNull(reviews.deletedAt)),
        ),
      this.recentBookings(id),
    ]);
    const { profile, user } = row;
    return {
      ...toSummary(row),
      email: user.email,
      whatsappPhone: user.whatsappPhone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      bio: profile.bio,
      languages: profile.languages,
      travelPreference: profile.travelPreference,
      maxHoursPerDay: profile.maxHoursPerDay,
      approvedAt: toIso(profile.approvedAt),
      suspendedAt: toIso(profile.suspendedAt ?? user.suspendedAt),
      suspensionReason: profile.suspensionReason ?? user.suspensionReason,
      lastLoginAt: toIso(user.lastLoginAt),
      services: serviceRows.map(({ offer, serviceName }) => ({
        id: offer.id,
        serviceName: serviceName.en,
        status: offer.status,
        yearsExperience: offer.yearsExperience,
        hourlyRate: offer.hourlyRate,
        dailyRate: offer.dailyRate,
        monthlyRate: offer.monthlyRate,
        isNegotiable: offer.isNegotiable,
      })),
      application: application
        ? {
            code: application.code,
            status: application.status,
            currentStep: application.currentStep,
            submittedAt: toIso(application.submittedAt),
          }
        : null,
      documents: documentRows,
      serviceAreaCount: areas?.total ?? 0,
      bookingCount: bookingTotals?.total ?? 0,
      completedBookingCount: bookingTotals?.completed ?? 0,
      rating: {
        average: rating?.average ? Math.round(Number(rating.average) * 10) / 10 : null,
        count: rating?.total ?? 0,
      },
      recentBookings,
    };
  }

  /** Resolves a provider profile id to its user id, for account actions. */
  async userIdOf(id: string): Promise<string> {
    const [profile] = await this.db
      .select({ userId: providerProfiles.userId })
      .from(providerProfiles)
      .where(and(eq(providerProfiles.id, id), isNull(providerProfiles.deletedAt)));
    if (!profile) {
      throw notFound('Provider');
    }
    return profile.userId;
  }

  private async recentBookings(providerId: string): Promise<AdminBookingSummary[]> {
    const rows = await this.db
      .select({
        id: bookings.id,
        code: bookings.code,
        status: bookings.status,
        slot: bookings.slot,
        serviceName: services.name,
        customerName: users.fullName,
      })
      .from(bookings)
      .innerJoin(providerServices, eq(providerServices.id, bookings.providerServiceId))
      .innerJoin(services, eq(services.id, providerServices.serviceId))
      .innerJoin(users, eq(users.id, bookings.customerId))
      .where(and(eq(bookings.providerId, providerId), isNull(bookings.deletedAt)))
      .orderBy(desc(bookings.createdAt))
      .limit(RECENT_BOOKINGS);
    return rows.map((booking) => ({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      serviceName: booking.serviceName.en,
      counterpartName: booking.customerName,
      startsAt: toIso(booking.slot.start),
    }));
  }
}
