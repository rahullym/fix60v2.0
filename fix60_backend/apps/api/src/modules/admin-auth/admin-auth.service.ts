import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { adminUsers, type Database } from '@fix60/db';
import {
  errorCodes,
  type AdminLoginRequest,
  type AdminLoginResponse,
  type AdminMe,
  type AdminSessionResponse,
  type AdminTotpRequest,
  type ApiEnv,
  type AuthTokens,
  type ChangeAdminPasswordRequest,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { PrincipalService } from '../../common/access/principal.service';
import { TOKEN_AUDIENCE } from '../../common/access/token-audience';
import { ApiException, notFound, unauthenticated } from '../../common/api-exception';
import { AuditService } from '../../common/audit/audit.service';
import { decryptSecret, encryptSecret } from '../../common/crypto';
import type { RequestMeta } from '../../common/request-context';
import { generateTotpSecret, totpUri, verifyTotp } from '../../common/totp';
import { API_ENV } from '../../config/env';
import { DATABASE } from '../../database/database.module';
import { hashPassword, verifyPassword } from '../auth/password';
import { SessionsService } from '../sessions/sessions.service';
import { afterFailedAttempt, isLocked } from './lockout';

type AdminRow = typeof adminUsers.$inferSelect;
type ChallengePurpose = 'verify' | 'enroll';

const CHALLENGE_TTL_SECONDS = 300;
const TOTP_ISSUER = 'Fix60 Admin';

const invalidCredentials = (): ApiException =>
  unauthenticated('Email or password is incorrect', errorCodes.invalidCredentials);
const accountLocked = (): ApiException =>
  new ApiException(
    HttpStatus.LOCKED,
    errorCodes.accountLocked,
    'Too many attempts. Try again in 15 minutes',
  );

@Injectable()
export class AdminAuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
    private readonly principals: PrincipalService,
    private readonly audit: AuditService,
  ) {}

  async login(request: AdminLoginRequest, meta: RequestMeta): Promise<AdminLoginResponse> {
    const admin = await this.findByEmail(request.email);
    if (!admin) {
      await verifyPassword(request.password, await this.getDummyHash());
      throw invalidCredentials();
    }
    if (isLocked(admin, new Date())) {
      throw accountLocked();
    }
    const isValid = await verifyPassword(request.password, admin.passwordHash);
    if (!isValid || admin.status !== 'active') {
      await this.recordFailure(admin, 'admin.login_failed', meta);
      throw invalidCredentials();
    }
    await this.db
      .update(adminUsers)
      .set({ failedLoginCount: 0 })
      .where(eq(adminUsers.id, admin.id));

    if (admin.totpSecretEnc) {
      return {
        status: 'totp_required',
        challengeToken: await this.signChallenge(admin.id, 'verify'),
      };
    }
    if (!this.env.ADMIN_TOTP_REQUIRED) {
      return { status: 'authenticated', ...(await this.completeLogin(admin, meta, {})) };
    }
    const secret = generateTotpSecret();
    await this.db
      .update(adminUsers)
      .set({ totpPendingSecretEnc: encryptSecret(secret, this.env.ADMIN_TOTP_ENCRYPTION_KEY) })
      .where(eq(adminUsers.id, admin.id));
    return {
      status: 'totp_enrollment_required',
      challengeToken: await this.signChallenge(admin.id, 'enroll'),
      otpauthUrl: totpUri(secret, admin.email, TOTP_ISSUER),
      secret,
    };
  }

  async verifyTotp(request: AdminTotpRequest, meta: RequestMeta): Promise<AdminSessionResponse> {
    const challenge = await this.readChallenge(request.challengeToken);
    const admin = await this.findById(challenge.adminId);
    if (!admin || admin.status !== 'active') {
      throw unauthenticated('Sign in again', errorCodes.invalidChallenge);
    }
    if (isLocked(admin, new Date())) {
      throw accountLocked();
    }
    const encrypted =
      challenge.purpose === 'enroll' ? admin.totpPendingSecretEnc : admin.totpSecretEnc;
    if (!encrypted) {
      throw unauthenticated('Sign in again', errorCodes.invalidChallenge);
    }
    const secret = decryptSecret(encrypted, this.env.ADMIN_TOTP_ENCRYPTION_KEY);
    const step = verifyTotp(secret, request.code, Date.now(), admin.totpLastStep);
    if (step === null) {
      await this.recordFailure(admin, 'admin.totp_failed', meta);
      throw unauthenticated('Code is incorrect or expired', errorCodes.invalidTotp);
    }
    const enrolment =
      challenge.purpose === 'enroll'
        ? { totpSecretEnc: encrypted, totpPendingSecretEnc: null, totpEnabledAt: new Date() }
        : {};
    return this.completeLogin(admin, meta, { ...enrolment, totpLastStep: step });
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    return (await this.sessions.refresh(refreshToken, 'admin', meta)).tokens;
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revokeFamilyOf(refreshToken);
  }

  async me(principal: AdminPrincipal): Promise<AdminMe> {
    const admin = await this.findById(principal.id);
    if (!admin) {
      throw notFound('Admin');
    }
    return this.toAdminMe(admin);
  }

  /** Changing the password ends every other session. */
  async changePassword(
    principal: AdminPrincipal,
    request: ChangeAdminPasswordRequest,
    meta: RequestMeta,
  ): Promise<void> {
    const admin = await this.findById(principal.id);
    if (!admin || !(await verifyPassword(request.currentPassword, admin.passwordHash))) {
      throw invalidCredentials();
    }
    const passwordHash = await hashPassword(request.newPassword);
    await this.db.transaction(async (tx) => {
      await tx.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, admin.id));
      await this.sessions.revokeAll({ kind: 'admin', id: admin.id }, tx);
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          action: 'admin.password_changed',
          entityType: 'admin_user',
          entityId: admin.id,
          meta,
        },
        tx,
      );
    });
  }

  private async completeLogin(
    admin: AdminRow,
    meta: RequestMeta,
    changes: Partial<AdminRow>,
  ): Promise<AdminSessionResponse> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(adminUsers)
        .set({ ...changes, failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
        .where(eq(adminUsers.id, admin.id));
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          action: changes.totpEnabledAt ? 'admin.totp_enrolled' : 'admin.login',
          entityType: 'admin_user',
          entityId: admin.id,
          meta,
        },
        tx,
      );
    });
    const tokens = await this.sessions.start({ kind: 'admin', id: admin.id }, meta);
    return { admin: await this.toAdminMe(admin), ...tokens };
  }

  private async recordFailure(admin: AdminRow, action: string, meta: RequestMeta): Promise<void> {
    const next = afterFailedAttempt(admin, new Date());
    await this.db.update(adminUsers).set(next).where(eq(adminUsers.id, admin.id));
    await this.audit.record({
      actorType: 'admin',
      actorId: admin.id,
      action,
      entityType: 'admin_user',
      entityId: admin.id,
      diff: { locked: next.lockedUntil !== null && next.lockedUntil !== admin.lockedUntil },
      meta,
    });
  }

  private async toAdminMe(admin: AdminRow): Promise<AdminMe> {
    const access = await this.principals.loadAdminAccess(admin.id);
    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      isSuper: access.isSuper,
      roles: access.roles.map(({ slug, name }) => ({ slug, name })),
      permissions: access.permissions,
    };
  }

  private signChallenge(adminId: string, purpose: ChallengePurpose): Promise<string> {
    return this.jwt.signAsync(
      { purpose },
      {
        subject: adminId,
        audience: TOKEN_AUDIENCE.adminChallenge,
        expiresIn: CHALLENGE_TTL_SECONDS,
        algorithm: 'HS256',
      },
    );
  }

  private async readChallenge(
    token: string,
  ): Promise<{ adminId: string; purpose: ChallengePurpose }> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; purpose: ChallengePurpose }>(token, {
        audience: TOKEN_AUDIENCE.adminChallenge,
        algorithms: ['HS256'],
      });
      if (claims.purpose !== 'verify' && claims.purpose !== 'enroll') {
        throw new Error('Unknown challenge purpose');
      }
      return { adminId: claims.sub, purpose: claims.purpose };
    } catch {
      throw unauthenticated('Sign in again', errorCodes.invalidChallenge);
    }
  }

  private async findByEmail(email: string): Promise<AdminRow | null> {
    const [row] = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(sql`lower(${adminUsers.email}) = ${email.toLowerCase()}`, isNull(adminUsers.deletedAt)),
      );
    return row ?? null;
  }

  private async findById(id: string): Promise<AdminRow | null> {
    const [row] = await this.db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, id), isNull(adminUsers.deletedAt)));
    return row ?? null;
  }

  /** Keeps response time similar for unknown emails. */
  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword('fix60-timing-equaliser');
    return this.dummyHash;
  }
}
