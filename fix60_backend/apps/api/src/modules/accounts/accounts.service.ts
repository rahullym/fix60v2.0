import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { providerProfiles, users, type Database } from '@fix60/db';
import type { UpdatePersonRequest, UserRole } from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { invalidTransition, notFound } from '../../common/api-exception';
import { AuditService } from '../../common/audit/audit.service';
import type { RequestMeta } from '../../common/request-context';
import { DATABASE } from '../../database/database.module';
import type { Transaction } from '../auth/users.repository';
import { SessionsService } from '../sessions/sessions.service';
import { canReactivate, canSuspend, providerStatusAfterReactivation } from './account-status';

const labels: Record<UserRole, string> = { customer: 'Customer', provider: 'Provider' };

/** Admin actions on a customer or provider account: suspend, reactivate, correct contact details. */
@Injectable()
export class AccountsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
  ) {}

  /** Blocks sign-in and every app call at once (tokens are checked live), and hides a provider from matching. */
  async suspend(
    actor: AdminPrincipal,
    userId: string,
    role: UserRole,
    reason: string,
    meta: RequestMeta,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId, role);
      if (!canSuspend(user.status)) {
        throw invalidTransition(`Only an active account can be suspended (it is ${user.status})`);
      }
      const now = new Date();
      await tx
        .update(users)
        .set({ status: 'suspended', suspendedAt: now, suspensionReason: reason })
        .where(eq(users.id, userId));
      if (role === 'provider') {
        await tx
          .update(providerProfiles)
          .set({ status: 'suspended', suspendedAt: now, suspensionReason: reason })
          .where(and(eq(providerProfiles.userId, userId), isNull(providerProfiles.deletedAt)));
      }
      await this.sessions.revokeAll({ kind: 'user', id: userId }, tx);
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: `${role}.suspended`,
          entityType: 'user',
          entityId: userId,
          diff: { reason },
          meta,
        },
        tx,
      );
    });
  }

  async reactivate(
    actor: AdminPrincipal,
    userId: string,
    role: UserRole,
    meta: RequestMeta,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId, role);
      if (!canReactivate(user.status)) {
        throw invalidTransition(`Only a suspended account can be reactivated (it is ${user.status})`);
      }
      await tx
        .update(users)
        .set({ status: 'active', suspendedAt: null, suspensionReason: null })
        .where(eq(users.id, userId));
      if (role === 'provider') {
        const [profile] = await tx
          .select({ id: providerProfiles.id, approvedAt: providerProfiles.approvedAt })
          .from(providerProfiles)
          .where(and(eq(providerProfiles.userId, userId), isNull(providerProfiles.deletedAt)));
        if (profile) {
          await tx
            .update(providerProfiles)
            .set({
              status: providerStatusAfterReactivation(profile.approvedAt),
              suspendedAt: null,
              suspensionReason: null,
            })
            .where(eq(providerProfiles.id, profile.id));
        }
      }
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: `${role}.reactivated`,
          entityType: 'user',
          entityId: userId,
          meta,
        },
        tx,
      );
    });
  }

  async updatePerson(
    actor: AdminPrincipal,
    userId: string,
    role: UserRole,
    request: UpdatePersonRequest,
    meta: RequestMeta,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const before = await this.lockUser(tx, userId, role);
      await tx.update(users).set(request).where(eq(users.id, userId));
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: `${role}.updated`,
          entityType: 'user',
          entityId: userId,
          diff: {
            before: { fullName: before.fullName, email: before.email },
            after: request,
          },
          meta,
        },
        tx,
      );
    });
  }

  private async lockUser(tx: Transaction, userId: string, role: UserRole) {
    const [user] = await tx
      .select({
        status: users.status,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, role), isNull(users.deletedAt)))
      .for('update');
    if (!user) {
      throw notFound(labels[role]);
    }
    return user;
  }
}

@Global()
@Module({ providers: [AccountsService], exports: [AccountsService] })
export class AccountsModule {}
