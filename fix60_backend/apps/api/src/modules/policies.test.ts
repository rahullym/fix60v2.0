import { describe, expect, it } from 'vitest';
import type { AdminPermission } from '@fix60/shared';
import type { AdminPrincipal } from '../common/access/access-policy';
import {
  canReactivate,
  canSuspend,
  providerStatusAfterReactivation,
} from './accounts/account-status';
import { afterFailedAttempt, isLocked, MAX_FAILED_ATTEMPTS } from './admin-auth/lockout';
import {
  canDefinePermissions,
  canGrantRoles,
  removesLastSuperAdmin,
} from './admin-users/rbac-policy';
import { ageOn, isAdult, todayInIndia } from './auth/age';
import { registrationConsentRecords } from './auth/consent-records';
import { classifyRefreshToken } from './sessions/refresh-policy';

describe('age', () => {
  it('counts whole years, birthday inclusive', () => {
    expect(ageOn('2008-10-24', '2026-10-24')).toBe(18);
    expect(ageOn('2008-10-25', '2026-10-24')).toBe(17);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });

  it('uses the Indian calendar date, not UTC', () => {
    // 20:00 UTC on the 23rd is already the 24th in India (UTC+5:30).
    expect(todayInIndia(new Date('2026-10-23T20:00:00Z'))).toBe('2026-10-24');
    expect(isAdult('2008-10-24', new Date('2026-10-23T20:00:00Z'))).toBe(true);
    expect(isAdult('2008-10-24', new Date('2026-10-23T17:00:00Z'))).toBe(false);
  });
});

describe('classifyRefreshToken', () => {
  const now = new Date('2026-10-24T00:00:00Z');
  const future = new Date('2026-11-24T00:00:00Z');

  it('accepts a fresh token', () => {
    expect(classifyRefreshToken({ expiresAt: future, rotatedAt: null, revokedAt: null }, now)).toBe(
      'valid',
    );
  });

  it('flags a rotated token as reuse', () => {
    expect(classifyRefreshToken({ expiresAt: future, rotatedAt: now, revokedAt: null }, now)).toBe(
      'reused',
    );
  });

  it('treats revoked before reused, and expiry', () => {
    expect(classifyRefreshToken({ expiresAt: future, rotatedAt: now, revokedAt: now }, now)).toBe(
      'revoked',
    );
    expect(classifyRefreshToken({ expiresAt: now, rotatedAt: null, revokedAt: null }, now)).toBe(
      'expired',
    );
  });
});

describe('admin lockout', () => {
  const now = new Date('2026-10-24T10:00:00Z');

  it(`locks after ${MAX_FAILED_ATTEMPTS} failures for 15 minutes`, () => {
    let state = { failedLoginCount: 0, lockedUntil: null as Date | null };
    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      state = afterFailedAttempt(state, now);
      expect(isLocked(state, now)).toBe(false);
    }
    state = afterFailedAttempt(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(isLocked(state, new Date(now.getTime() + 15 * 60_000))).toBe(false);
    expect(state.failedLoginCount).toBe(0);
  });
});

describe('RBAC escalation rules', () => {
  const actor = (permissions: AdminPermission[], isSuper = false): AdminPrincipal => ({
    kind: 'admin',
    id: 'a',
    isSuper,
    permissions: new Set(permissions),
  });

  it('only Super Admin grants super roles', () => {
    expect(canGrantRoles(actor(['admins.manage']), [{ isSuper: true, permissions: [] }])).toBe(
      false,
    );
    expect(canGrantRoles(actor([], true), [{ isSuper: true, permissions: [] }])).toBe(true);
  });

  it('non-super admins grant only permissions they hold', () => {
    const manager = actor(['admins.manage', 'customers.read']);
    expect(canGrantRoles(manager, [{ isSuper: false, permissions: ['customers.read'] }])).toBe(
      true,
    );
    expect(canGrantRoles(manager, [{ isSuper: false, permissions: ['finance.manage'] }])).toBe(
      false,
    );
    expect(canDefinePermissions(manager, ['customers.read', 'documents.view'])).toBe(false);
  });

  it('protects the last active Super Admin', () => {
    expect(
      removesLastSuperAdmin({
        isCurrentlyActiveSuper: true,
        willBeActiveSuper: false,
        otherActiveSuperCount: 0,
      }),
    ).toBe(true);
    expect(
      removesLastSuperAdmin({
        isCurrentlyActiveSuper: true,
        willBeActiveSuper: false,
        otherActiveSuperCount: 1,
      }),
    ).toBe(false);
    expect(
      removesLastSuperAdmin({
        isCurrentlyActiveSuper: false,
        willBeActiveSuper: false,
        otherActiveSuperCount: 0,
      }),
    ).toBe(false);
  });
});

describe('registrationConsentRecords', () => {
  it('records every consent with its policy version', () => {
    const records = registrationConsentRecords(
      {
        terms: true,
        privacy: true,
        safetyPolicy: true,
        serviceCommunications: true,
        whatsappUpdates: false,
      },
      { terms: '3', privacy: '2' },
      'app',
    );
    expect(records).toEqual([
      { type: 'terms', isGranted: true, policyVersion: '3', source: 'app' },
      { type: 'privacy', isGranted: true, policyVersion: '2', source: 'app' },
      { type: 'safety_policy', isGranted: true, policyVersion: '1', source: 'app' },
      { type: 'service_communications', isGranted: true, policyVersion: '1', source: 'app' },
      { type: 'whatsapp_updates', isGranted: false, policyVersion: '1', source: 'app' },
    ]);
  });
});

describe('account status', () => {
  it('suspends only active accounts', () => {
    expect(canSuspend('active')).toBe(true);
    expect(canSuspend('suspended')).toBe(false);
    expect(canSuspend('pending_deletion')).toBe(false);
    expect(canSuspend('deleted')).toBe(false);
  });

  it('reactivates only suspended accounts', () => {
    expect(canReactivate('suspended')).toBe(true);
    expect(canReactivate('active')).toBe(false);
    expect(canReactivate('deleted')).toBe(false);
  });

  it('returns a provider to active only if they were ever approved', () => {
    expect(providerStatusAfterReactivation(new Date('2026-01-01T00:00:00Z'))).toBe('active');
    expect(providerStatusAfterReactivation(null)).toBe('onboarding');
  });
});
