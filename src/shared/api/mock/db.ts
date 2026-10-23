import type { ConsentType, Gender, Locale, UserRole, UserStatus } from '../types';
import { mockError } from './router';

/** Mock-only user row (superset of `Me`). */
export interface MockUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  phone: string;
  whatsappPhone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  preferredLocale: Locale | string;
  districtId: string | null;
  localityId: string | null;
  providerCode: string | null;
  createdAt: string;
  consents: Record<ConsentType, boolean>;
  deletionScheduledFor: string | null;
}

let idCounter = 0;

/** UUID-shaped id, stable per session. */
export function newId(): string {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `00000000-0000-7000-8000-${hex}`;
}

export const nowIso = (): string => new Date().toISOString();

type RegisteredListener = (user: MockUser) => void;
const registeredListeners: RegisteredListener[] = [];

/** In-memory state for the mock API. Feature handlers add their own collections in seed.ts. */
export const db = {
  users: new Map<string, MockUser>(),
  refreshTokens: new Map<string, string>(),

  requireUser(userId: string): MockUser {
    const user = this.users.get(userId);
    if (!user) {
      throw mockError(404, 'NOT_FOUND', 'User not found');
    }
    return user;
  },

  /** Lets feature modules create role-specific rows (e.g. a provider application) on signup. */
  onUserRegistered(user: MockUser): void {
    registeredListeners.forEach((listener) => listener(user));
  },

  addRegisteredListener(listener: RegisteredListener): void {
    registeredListeners.push(listener);
  },
};
