import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { refreshTokens, uuidv7, type Database } from '@fix60/db';
import { errorCodes, type ApiEnv, type AuthTokens, type UserRole } from '@fix60/shared';
import { unauthenticated } from '../../common/api-exception';
import { TOKEN_AUDIENCE } from '../../common/access/token-audience';
import { randomToken, sha256Hex } from '../../common/crypto';
import type { RequestMeta } from '../../common/request-context';
import { API_ENV } from '../../config/env';
import { DATABASE } from '../../database/database.module';
import { classifyRefreshToken } from './refresh-policy';

export type SessionSubject =
  { kind: 'user'; id: string; role: UserRole } | { kind: 'admin'; id: string };

const HOUR_MS = 60 * 60 * 1000;

/** Access JWTs + rotating opaque refresh tokens for both phone accounts and admins. */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly jwt: JwtService,
  ) {}

  /** Starts a new token family (login). */
  start(subject: SessionSubject, meta: RequestMeta): Promise<AuthTokens> {
    return this.issue(subject, uuidv7(), meta, this.db);
  }

  /** Exchanges a refresh token for a new pair. Replaying a rotated token revokes the family. */
  async refresh(
    rawToken: string,
    expectedKind: SessionSubject['kind'],
    meta: RequestMeta,
  ): Promise<{
    tokens: AuthTokens;
    subject: SessionSubject;
  }> {
    const outcome = await this.db.transaction(async (tx) => {
      const [token] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256Hex(rawToken)))
        .for('update');
      if (!token || (expectedKind === 'admin' ? !token.adminId : !token.userId)) {
        return { kind: 'invalid' as const };
      }
      const verdict = classifyRefreshToken(token, new Date());
      if (verdict === 'reused') {
        await tx
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.familyId, token.familyId), isNull(refreshTokens.revokedAt)));
        return { kind: 'reused' as const, familyId: token.familyId };
      }
      if (verdict !== 'valid') {
        return { kind: 'invalid' as const };
      }
      await tx
        .update(refreshTokens)
        .set({ rotatedAt: new Date() })
        .where(eq(refreshTokens.id, token.id));
      return { kind: 'valid' as const, token };
    });

    if (outcome.kind === 'reused') {
      this.logger.warn(`Refresh token reuse detected; family ${outcome.familyId} revoked`);
      throw unauthenticated('Session ended, sign in again', errorCodes.refreshTokenReused);
    }
    if (outcome.kind === 'invalid') {
      throw unauthenticated('Invalid refresh token', errorCodes.invalidRefreshToken);
    }
    const subject = await this.resolveSubject(outcome.token.userId, outcome.token.adminId);
    if (!subject) {
      throw unauthenticated('Invalid refresh token', errorCodes.invalidRefreshToken);
    }
    const tokens = await this.issue(subject, outcome.token.familyId, meta, this.db);
    return { tokens, subject };
  }

  /** Logout: revokes the presented token's family. Unknown tokens are ignored. */
  async revokeFamilyOf(rawToken: string): Promise<void> {
    const [token] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256Hex(rawToken)));
    if (token) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.familyId, token.familyId), isNull(refreshTokens.revokedAt)));
    }
  }

  /** Ends every session of a subject (suspension, admin disabled, password change). */
  async revokeAll(
    subject: Pick<SessionSubject, 'kind' | 'id'>,
    executor: Pick<Database, 'update'> = this.db,
  ): Promise<void> {
    const column = subject.kind === 'admin' ? refreshTokens.adminId : refreshTokens.userId;
    await executor
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(column, subject.id), isNull(refreshTokens.revokedAt)));
  }

  private async issue(
    subject: SessionSubject,
    familyId: string,
    meta: RequestMeta,
    executor: Pick<Database, 'insert'>,
  ): Promise<AuthTokens> {
    const isAdmin = subject.kind === 'admin';
    const accessTtl = isAdmin
      ? this.env.ADMIN_ACCESS_TOKEN_TTL_SECONDS
      : this.env.ACCESS_TOKEN_TTL_SECONDS;
    const refreshTtlMs = isAdmin
      ? this.env.ADMIN_REFRESH_TOKEN_TTL_HOURS * HOUR_MS
      : this.env.REFRESH_TOKEN_TTL_DAYS * 24 * HOUR_MS;
    const claims = isAdmin ? { kind: 'admin' } : { kind: 'user', role: subject.role };
    const accessToken = await this.jwt.signAsync(claims, {
      subject: subject.id,
      audience: isAdmin ? TOKEN_AUDIENCE.admin : TOKEN_AUDIENCE.user,
      expiresIn: accessTtl,
      algorithm: 'HS256',
    });
    const refreshToken = randomToken();
    await executor.insert(refreshTokens).values({
      userId: isAdmin ? null : subject.id,
      adminId: isAdmin ? subject.id : null,
      familyId,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    return { accessToken, refreshToken, accessTokenExpiresIn: accessTtl };
  }

  private async resolveSubject(
    userId: string | null,
    adminId: string | null,
  ): Promise<SessionSubject | null> {
    if (adminId) {
      const admin = await this.db.query.adminUsers.findFirst({
        columns: { id: true, status: true, deletedAt: true },
        where: (table, { eq: equals }) => equals(table.id, adminId),
      });
      return admin && !admin.deletedAt && admin.status === 'active'
        ? { kind: 'admin', id: admin.id }
        : null;
    }
    if (!userId) {
      return null;
    }
    const row = await this.db.query.users.findFirst({
      columns: { id: true, role: true, status: true, deletedAt: true },
      where: (table, { eq: equals }) => equals(table.id, userId),
    });
    if (!row || row.deletedAt || row.status === 'deleted' || row.status === 'suspended') {
      return null;
    }
    return { kind: 'user', id: row.id, role: row.role };
  }
}

@Global()
@Module({ providers: [SessionsService], exports: [SessionsService] })
export class SessionsModule {}
