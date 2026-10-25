import type { AuthTokens, Gender, Me, RegisterRequest, UpdateMeRequest, UserRole } from '../types';
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

const GENDERS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];

/** Body as an object; a missing body becomes `{}`. */
function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function phoneFromIdToken(idToken: unknown): string {
  if (typeof idToken !== 'string' || !idToken.startsWith('dev:')) {
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
      const { idToken, role } = asRecord(body) as { idToken?: unknown; role?: UserRole };
      const phone = phoneFromIdToken(idToken);
      const user = findByPhone(phone);
      if (!user) {
        return ok({ status: 'registration_required', phone });
      }
      if (role !== undefined && user.role !== role) {
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
      const request = asRecord(body) as unknown as RegisterRequest;
      const phone = phoneFromIdToken(request.idToken);
      if (request.role !== 'customer' && request.role !== 'provider') {
        throw mockError(400, 'VALIDATION_FAILED', 'role must be customer or provider');
      }
      if (typeof request.fullName !== 'string' || request.fullName.trim() === '') {
        throw mockError(400, 'VALIDATION_FAILED', 'fullName is required');
      }
      if (findByPhone(phone)) {
        throw mockError(409, 'ALREADY_REGISTERED', 'Already registered');
      }
      if (!request.consents?.terms || !request.consents.privacy || !request.consents.safetyPolicy) {
        throw mockError(400, 'CONSENT_REQUIRED', 'Consents required');
      }
      if (request.role === 'provider' && (!request.dateOfBirth || ageFrom(request.dateOfBirth) < 18)) {
        throw mockError(422, 'UNDERAGE', 'Under 18');
      }
      const user: MockUser = {
        id: newId(),
        role: request.role,
        status: 'active',
        fullName: request.fullName.trim(),
        phone,
        whatsappPhone: request.whatsappPhone ?? null,
        email: request.email ?? null,
        dateOfBirth: request.dateOfBirth ?? null,
        gender: null,
        preferredLocale: request.preferredLocale === 'ml' ? 'ml' : 'en',
        districtId: request.role === 'customer' ? (request.districtId ?? null) : null,
        localityId: request.role === 'customer' ? (request.localityId ?? null) : null,
        providerCode: request.role === 'provider' ? `PRV-${1000 + db.users.size + 1}` : null,
        createdAt: nowIso(),
        consents: {
          terms: true,
          privacy: true,
          safety_policy: true,
          service_communications: request.consents.serviceCommunications === true,
          whatsapp_updates: request.consents.whatsappUpdates === true,
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
      const refreshToken = asRecord(body).refreshToken;
      const userId = typeof refreshToken === 'string' ? db.refreshTokens.get(refreshToken) : undefined;
      if (!userId || typeof refreshToken !== 'string') {
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
      const refreshToken = asRecord(body).refreshToken;
      if (typeof refreshToken === 'string') {
        db.refreshTokens.delete(refreshToken);
      }
      return noContent();
    },
    { isPublic: true },
  );

  route('GET', '/me', ({ auth }) => toMe(db.requireUser(auth!.userId)));

  route('PATCH', '/me', ({ auth, body }) => {
    const user = db.requireUser(auth!.userId);
    const input = asRecord(body) as Partial<Record<keyof UpdateMeRequest, unknown>>;
    if (typeof input.fullName === 'string' && input.fullName.trim() !== '') user.fullName = input.fullName.trim();
    if (input.email === null || typeof input.email === 'string') user.email = input.email || null;
    if (input.whatsappPhone === null || typeof input.whatsappPhone === 'string') user.whatsappPhone = input.whatsappPhone || null;
    if (input.gender === null || GENDERS.includes(input.gender as Gender)) user.gender = (input.gender as Gender | null) ?? null;
    if (input.preferredLocale === 'en' || input.preferredLocale === 'ml') user.preferredLocale = input.preferredLocale;
    if (input.districtId === null || typeof input.districtId === 'string') user.districtId = input.districtId || null;
    if (input.localityId === null || typeof input.localityId === 'string') user.localityId = input.localityId || null;
    return toMe(user);
  });
}
