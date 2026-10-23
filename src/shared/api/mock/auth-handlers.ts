import type { AuthTokens, Me, RegisterRequest, UpdateMeRequest, UserRole } from '../types';
import { ageFrom } from '../../lib/format';
import { db, newId, nowIso, type MockUser } from './db';
import { mockError, noContent, ok, route, type MockContext } from './router';

let tokenCounter = 0;

/** `mock.<userId>.<n>` access tokens; refresh tokens are single-use. */
export function issueTokens(userId: string): AuthTokens {
  tokenCounter += 1;
  const refreshToken = `mockrefresh.${userId}.${tokenCounter}.${Math.random().toString(36).slice(2)}`;
  db.refreshTokens.set(refreshToken, userId);
  return { accessToken: `mock.${userId}.${tokenCounter}`, refreshToken, accessTokenExpiresIn: 900 };
}

export function resolveAuth(token: string): MockContext['auth'] | 'expired' {
  const [prefix, userId] = token.split('.');
  if (prefix !== 'mock' || !userId) {
    return null;
  }
  const user = db.users.get(userId);
  return user ? { userId: user.id, role: user.role } : null;
}

export function toMe(user: MockUser): Me {
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
    districtId: user.districtId,
    localityId: user.localityId,
    providerCode: user.providerCode,
  };
}

function phoneFromIdToken(idToken: string): string {
  if (!idToken.startsWith('dev:')) {
    throw mockError(401, 'INVALID_FIREBASE_TOKEN', 'Mock API accepts dev:<phone> tokens only');
  }
  return idToken.slice(4);
}

function findByPhone(phone: string): MockUser | undefined {
  return [...db.users.values()].find((user) => user.phone === phone && user.status !== 'deleted');
}

export function registerAuthRoutes(): void {
  route(
    'POST',
    '/auth/firebase',
    ({ body }) => {
      const { idToken, role } = body as { idToken: string; role: UserRole };
      const phone = phoneFromIdToken(idToken);
      const user = findByPhone(phone);
      if (!user) {
        return ok({ status: 'registration_required', phone });
      }
      if (user.role !== role) {
        throw mockError(409, 'ROLE_MISMATCH', 'Registered with the other role');
      }
      if (user.status === 'suspended') {
        throw mockError(403, 'ACCOUNT_SUSPENDED', 'Suspended');
      }
      return ok({ status: 'authenticated', user: toMe(user), ...issueTokens(user.id) });
    },
    { isPublic: true },
  );

  route(
    'POST',
    '/auth/register',
    ({ body }) => {
      const request = body as RegisterRequest;
      const phone = phoneFromIdToken(request.idToken);
      if (findByPhone(phone)) {
        throw mockError(409, 'ALREADY_REGISTERED', 'Already registered');
      }
      if (!request.consents?.terms || !request.consents.privacy || !request.consents.safetyPolicy) {
        throw mockError(400, 'CONSENT_REQUIRED', 'Consents required');
      }
      if (request.role === 'provider' && ageFrom(request.dateOfBirth) < 18) {
        throw mockError(422, 'UNDERAGE', 'Under 18');
      }
      const user: MockUser = {
        id: newId(),
        role: request.role,
        status: 'active',
        fullName: request.fullName,
        phone,
        whatsappPhone: request.whatsappPhone ?? null,
        email: request.email ?? null,
        dateOfBirth: request.dateOfBirth ?? null,
        gender: null,
        preferredLocale: request.preferredLocale,
        districtId: request.role === 'customer' ? (request.districtId ?? null) : null,
        localityId: request.role === 'customer' ? (request.localityId ?? null) : null,
        providerCode: request.role === 'provider' ? `PRV-${1000 + db.users.size + 1}` : null,
        createdAt: nowIso(),
        consents: {
          terms: true,
          privacy: true,
          safety_policy: true,
          service_communications: request.consents.serviceCommunications,
          whatsapp_updates: request.consents.whatsappUpdates,
          marketing: false,
          provider_declaration: false,
        },
        deletionScheduledFor: null,
      };
      db.users.set(user.id, user);
      db.onUserRegistered(user);
      return ok({ user: toMe(user), ...issueTokens(user.id) }, 201);
    },
    { isPublic: true },
  );

  route(
    'POST',
    '/auth/refresh',
    ({ body }) => {
      const { refreshToken } = body as { refreshToken: string };
      const userId = db.refreshTokens.get(refreshToken);
      if (!userId) {
        throw mockError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
      }
      db.refreshTokens.delete(refreshToken);
      return ok(issueTokens(userId));
    },
    { isPublic: true },
  );

  route(
    'POST',
    '/auth/logout',
    ({ body }) => {
      db.refreshTokens.delete((body as { refreshToken: string }).refreshToken);
      return noContent();
    },
    { isPublic: true },
  );

  route('GET', '/me', ({ auth }) => toMe(db.requireUser(auth!.userId)));

  route('PATCH', '/me', ({ auth, body }) => {
    const user = db.requireUser(auth!.userId);
    Object.assign(user, Object.fromEntries(Object.entries(body as UpdateMeRequest).filter(([, value]) => value !== undefined)));
    return toMe(user);
  });
}
