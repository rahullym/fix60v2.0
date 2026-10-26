import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '@fix60/db';
import {
  errorCodes,
  type AuthSessionResponse,
  type AuthTokens,
  type FirebaseSignInRequest,
  type FirebaseSignInResponse,
  type RegisterRequest,
} from '@fix60/shared';
import { conflict, forbidden, notFound, unprocessable } from '../../common/api-exception';
import { AuditService } from '../../common/audit/audit.service';
import type { RequestMeta } from '../../common/request-context';
import { DATABASE } from '../../database/database.module';
import { FirebaseAuthService } from '../../integrations/firebase/firebase-auth.service';
import { SessionsService } from '../sessions/sessions.service';
import { isAdult } from './age';
import { consentPolicyPage, registrationConsentRecords } from './consent-records';
import { resolveCustomerLocation } from './customer-location';
import { isUniqueViolation, UsersRepository, type UserRow } from './users.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly firebase: FirebaseAuthService,
    private readonly usersRepository: UsersRepository,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
  ) {}

  /** Exchanges a Firebase phone ID token for a session, or asks the app to register. */
  async signIn(request: FirebaseSignInRequest, meta: RequestMeta): Promise<FirebaseSignInResponse> {
    const identity = await this.firebase.verifyIdToken(request.idToken);
    const user = await this.usersRepository.findLiveByIdentity(identity.uid, identity.phone);
    if (!user) {
      return { status: 'registration_required', phone: identity.phone };
    }
    this.assertCanSignIn(user, request.role);
    await this.usersRepository.touchLogin(user.id);
    const tokens = await this.sessions.start({ kind: 'user', id: user.id, role: user.role }, meta);
    return { status: 'authenticated', user: await this.me(user.id), ...tokens };
  }

  async register(request: RegisterRequest, meta: RequestMeta): Promise<AuthSessionResponse> {
    const identity = await this.firebase.verifyIdToken(request.idToken);
    if (await this.usersRepository.findLiveByIdentity(identity.uid, identity.phone)) {
      throw conflict(errorCodes.alreadyRegistered, 'This phone number is already registered');
    }
    if (request.role === 'provider' && !isAdult(request.dateOfBirth)) {
      throw unprocessable(errorCodes.underage, 'Service providers must be at least 18 years old');
    }
    const location =
      request.role === 'customer'
        ? await resolveCustomerLocation(
            this.usersRepository,
            request.districtId ?? null,
            request.localityId ?? null,
          )
        : null;
    const policyVersions = await this.usersRepository.policyVersions(
      Object.values(consentPolicyPage),
    );
    const consentRecords = registrationConsentRecords(request.consents, policyVersions, 'app');

    let user: UserRow;
    try {
      user = await this.db.transaction(async (tx) => {
        const created = await this.usersRepository.create(
          tx,
          {
            role: request.role,
            firebaseUid: identity.uid,
            phone: identity.phone,
            fullName: request.fullName,
            email: request.email ?? null,
            whatsappPhone: request.whatsappPhone ?? null,
            dateOfBirth: request.dateOfBirth ?? null,
            preferredLocale: request.preferredLocale,
            districtId: location?.districtId ?? null,
            localityId: location?.localityId ?? null,
          },
          consentRecords,
          meta.ipAddress,
        );
        await this.audit.record(
          {
            actorType: request.role,
            actorId: created.id,
            action: 'user.registered',
            entityType: 'user',
            entityId: created.id,
            diff: { role: request.role, consents: consentRecords },
            meta,
          },
          tx,
        );
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(errorCodes.alreadyRegistered, 'This phone number is already registered');
      }
      throw error;
    }
    const tokens = await this.sessions.start({ kind: 'user', id: user.id, role: user.role }, meta);
    return { user: await this.me(user.id), ...tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    return (await this.sessions.refresh(refreshToken, 'user', meta)).tokens;
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revokeFamilyOf(refreshToken);
  }

  private assertCanSignIn(user: UserRow, requestedRole: UserRow['role']): void {
    if (user.role !== requestedRole) {
      throw conflict(errorCodes.roleMismatch, `This number is registered as a ${user.role}`);
    }
    if (user.status === 'suspended') {
      throw forbidden('Account suspended', errorCodes.accountSuspended);
    }
    if (user.status === 'deleted') {
      throw forbidden('Account deleted', errorCodes.accountDeleted);
    }
  }

  private async me(
    id: string,
  ): Promise<NonNullable<Awaited<ReturnType<UsersRepository['loadMe']>>>> {
    const me = await this.usersRepository.loadMe(id);
    if (!me) {
      throw notFound('User');
    }
    return me;
  }
}
