import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { consents, customerProfiles, deviceTokens, users, type Database } from '@fix60/db';
import {
  errorCodes,
  type ConsentState,
  type ConsentType,
  type Me,
  type RegisterDeviceRequest,
  type UpdateConsentsRequest,
  type UpdateMeRequest,
} from '@fix60/shared';
import type { UserPrincipal } from '../../common/access/access-policy';
import { badRequest, notFound } from '../../common/api-exception';
import { AuditService } from '../../common/audit/audit.service';
import type { RequestMeta } from '../../common/request-context';
import { DATABASE } from '../../database/database.module';
import { DEFAULT_POLICY_VERSION } from '../auth/consent-records';
import { resolveCustomerLocation } from '../auth/customer-location';
import { UsersRepository } from '../auth/users.repository';

const optionalConsentFields: Record<keyof UpdateConsentsRequest, ConsentType> = {
  serviceCommunications: 'service_communications',
  whatsappUpdates: 'whatsapp_updates',
  marketing: 'marketing',
};

@Injectable()
export class MeService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly usersRepository: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async get(principal: UserPrincipal): Promise<Me> {
    const me = await this.usersRepository.loadMe(principal.id);
    if (!me) {
      throw notFound('User');
    }
    return me;
  }

  async update(principal: UserPrincipal, request: UpdateMeRequest, meta: RequestMeta): Promise<Me> {
    const { districtId, localityId, ...userFields } = request;
    const changesLocation = districtId !== undefined || localityId !== undefined;
    if (changesLocation && principal.role !== 'customer') {
      throw badRequest(
        errorCodes.validationFailed,
        'Providers update service areas in their application',
      );
    }
    const location = changesLocation
      ? await resolveCustomerLocation(this.usersRepository, districtId ?? null, localityId ?? null)
      : null;

    await this.db.transaction(async (tx) => {
      if (Object.keys(userFields).length > 0) {
        await tx.update(users).set(userFields).where(eq(users.id, principal.id));
      }
      if (location) {
        await tx
          .update(customerProfiles)
          .set(location)
          .where(
            and(eq(customerProfiles.userId, principal.id), isNull(customerProfiles.deletedAt)),
          );
      }
      await this.audit.record(
        {
          actorType: principal.role,
          actorId: principal.id,
          action: 'user.profile_updated',
          entityType: 'user',
          entityId: principal.id,
          diff: { ...userFields, ...(location ?? {}) },
          meta,
        },
        tx,
      );
    });
    return this.get(principal);
  }

  /** Latest state of each consent type. */
  async listConsents(principal: UserPrincipal): Promise<ConsentState[]> {
    const rows = await this.db
      .selectDistinctOn([consents.type], {
        type: consents.type,
        isGranted: consents.isGranted,
        policyVersion: consents.policyVersion,
        createdAt: consents.createdAt,
      })
      .from(consents)
      .where(and(eq(consents.userId, principal.id), isNull(consents.deletedAt)))
      .orderBy(consents.type, desc(consents.createdAt));
    return rows.map((row) => ({
      type: row.type,
      isGranted: row.isGranted,
      policyVersion: row.policyVersion,
      updatedAt: row.createdAt.toISOString(),
    }));
  }

  /** Appends a ledger row per changed consent; history is never rewritten. */
  async updateConsents(
    principal: UserPrincipal,
    request: UpdateConsentsRequest,
    meta: RequestMeta,
  ): Promise<ConsentState[]> {
    const policyVersion =
      (await this.usersRepository.policyVersions(['privacy'])).privacy ?? DEFAULT_POLICY_VERSION;
    const records = (
      Object.entries(request) as [keyof UpdateConsentsRequest, boolean | undefined][]
    )
      .filter((entry): entry is [keyof UpdateConsentsRequest, boolean] => entry[1] !== undefined)
      .map(([field, isGranted]) => ({
        userId: principal.id,
        type: optionalConsentFields[field],
        isGranted,
        policyVersion,
        source: 'app' as const,
        ipAddress: meta.ipAddress,
      }));
    await this.db.transaction(async (tx) => {
      await tx.insert(consents).values(records);
      await this.audit.record(
        {
          actorType: principal.role,
          actorId: principal.id,
          action: 'user.consents_updated',
          entityType: 'user',
          entityId: principal.id,
          diff: { consents: records.map(({ type, isGranted }) => ({ type, isGranted })) },
          meta,
        },
        tx,
      );
    });
    return this.listConsents(principal);
  }

  /** Registers an FCM token for this user; a token moves if another account held it. */
  async registerDevice(principal: UserPrincipal, request: RegisterDeviceRequest): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: deviceTokens.id, userId: deviceTokens.userId })
        .from(deviceTokens)
        .where(and(eq(deviceTokens.token, request.token), isNull(deviceTokens.deletedAt)))
        .for('update');
      if (existing?.userId === principal.id) {
        await tx
          .update(deviceTokens)
          .set({ lastSeenAt: new Date(), platform: request.platform })
          .where(eq(deviceTokens.id, existing.id));
        return;
      }
      if (existing) {
        await tx
          .update(deviceTokens)
          .set({ deletedAt: new Date() })
          .where(eq(deviceTokens.id, existing.id));
      }
      await tx
        .insert(deviceTokens)
        .values({ userId: principal.id, token: request.token, platform: request.platform });
    });
  }
}
