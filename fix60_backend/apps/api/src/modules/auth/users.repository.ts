import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  cmsPages,
  consents,
  customerProfiles,
  districts,
  localities,
  providerProfiles,
  users,
  type Database,
} from '@fix60/db';
import type { Me, UserRole } from '@fix60/shared';
import { DATABASE } from '../../database/database.module';
import type { ConsentRecord } from './consent-records';

export type UserRow = typeof users.$inferSelect;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface NewUser {
  role: UserRole;
  firebaseUid: string;
  phone: string;
  fullName: string;
  email: string | null;
  whatsappPhone: string | null;
  dateOfBirth: string | null;
  preferredLocale: string;
  districtId: string | null;
  localityId: string | null;
}

/** Postgres unique-violation, raised when two registrations race for one phone. */
export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause ?? error;
  return (cause as { code?: string }).code === '23505';
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findLiveByIdentity(firebaseUid: string, phone: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(eq(users.firebaseUid, firebaseUid), eq(users.phone, phone)),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findLiveById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    return row ?? null;
  }

  /** Published version per policy page slug. */
  async policyVersions(slugs: string[]): Promise<Record<string, string>> {
    const rows = await this.db
      .select({ slug: cmsPages.slug, version: cmsPages.version })
      .from(cmsPages)
      .where(
        and(
          inArray(cmsPages.slug, slugs),
          eq(cmsPages.isPublished, true),
          isNull(cmsPages.deletedAt),
        ),
      );
    return Object.fromEntries(rows.map((row) => [row.slug, row.version]));
  }

  /** Returns the locality's district, or null when the locality does not exist. */
  async districtOfLocality(localityId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ districtId: localities.districtId })
      .from(localities)
      .where(and(eq(localities.id, localityId), isNull(localities.deletedAt)));
    return row?.districtId ?? null;
  }

  async districtExists(districtId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: districts.id })
      .from(districts)
      .where(and(eq(districts.id, districtId), isNull(districts.deletedAt)));
    return Boolean(row);
  }

  /** Inserts the user, role profile and consent ledger in the caller's transaction. */
  async create(
    tx: Transaction,
    input: NewUser,
    consentRecords: ConsentRecord[],
    ipAddress: string | null,
  ): Promise<UserRow> {
    const [user] = await tx
      .insert(users)
      .values({
        role: input.role,
        firebaseUid: input.firebaseUid,
        phone: input.phone,
        fullName: input.fullName,
        email: input.email,
        whatsappPhone: input.whatsappPhone,
        dateOfBirth: input.dateOfBirth,
        preferredLocale: input.preferredLocale,
        lastLoginAt: new Date(),
      })
      .returning();
    if (input.role === 'customer') {
      await tx
        .insert(customerProfiles)
        .values({ userId: user!.id, districtId: input.districtId, localityId: input.localityId });
    } else {
      await tx.insert(providerProfiles).values({
        userId: user!.id,
        code: sql`'PRV-' || nextval('provider_code_seq')::text`,
      });
    }
    await tx
      .insert(consents)
      .values(consentRecords.map((record) => ({ ...record, userId: user!.id, ipAddress })));
    return user!;
  }

  async touchLogin(id: string): Promise<void> {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async loadMe(id: string): Promise<Me | null> {
    const [row] = await this.db
      .select({
        user: users,
        districtId: customerProfiles.districtId,
        localityId: customerProfiles.localityId,
        providerCode: providerProfiles.code,
      })
      .from(users)
      .leftJoin(
        customerProfiles,
        and(eq(customerProfiles.userId, users.id), isNull(customerProfiles.deletedAt)),
      )
      .leftJoin(
        providerProfiles,
        and(eq(providerProfiles.userId, users.id), isNull(providerProfiles.deletedAt)),
      )
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (!row) {
      return null;
    }
    const { user } = row;
    return {
      id: user.id,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
      phone: user.phone,
      whatsappPhone: user.whatsappPhone,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      preferredLocale: user.preferredLocale,
      districtId: row.districtId,
      localityId: row.localityId,
      providerCode: row.providerCode,
    };
  }
}
