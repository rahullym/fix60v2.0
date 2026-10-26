import { describe, expect, it } from 'vitest';
import type { AdminPermission } from '@fix60/shared';
import { adminCan, evaluateAccess, type AdminPrincipal, type UserPrincipal } from './access-policy';

const customer: UserPrincipal = { kind: 'user', id: 'u1', role: 'customer', status: 'active' };
const provider: UserPrincipal = { kind: 'user', id: 'u2', role: 'provider', status: 'active' };
const admin = (permissions: AdminPermission[], isSuper = false): AdminPrincipal => ({
  kind: 'admin',
  id: 'a1',
  isSuper,
  permissions: new Set(permissions),
});

describe('evaluateAccess', () => {
  it('denies routes that declare no policy, even for a Super Admin', () => {
    expect(evaluateAccess(undefined, admin([], true))).toBe('forbidden');
    expect(evaluateAccess(undefined, null)).toBe('forbidden');
  });

  it('allows public routes without a principal', () => {
    expect(evaluateAccess({ kind: 'public' }, null)).toBe('allow');
  });

  it('requires authentication for protected routes', () => {
    expect(evaluateAccess({ kind: 'user', roles: [] }, null)).toBe('unauthenticated');
    expect(evaluateAccess({ kind: 'admin', permissions: [] }, null)).toBe('unauthenticated');
  });

  it('enforces user roles', () => {
    const providerOnly = { kind: 'user', roles: ['provider'] } as const;
    expect(evaluateAccess(providerOnly, provider)).toBe('allow');
    expect(evaluateAccess(providerOnly, customer)).toBe('forbidden');
    expect(evaluateAccess({ kind: 'user', roles: [] }, customer)).toBe('allow');
  });

  it('blocks suspended and deleted users', () => {
    expect(evaluateAccess({ kind: 'user', roles: [] }, { ...customer, status: 'suspended' })).toBe(
      'suspended',
    );
    expect(evaluateAccess({ kind: 'user', roles: [] }, { ...customer, status: 'deleted' })).toBe(
      'unauthenticated',
    );
  });

  it('never lets a user token through an admin route or vice versa', () => {
    expect(evaluateAccess({ kind: 'admin', permissions: [] }, customer)).toBe('forbidden');
    expect(evaluateAccess({ kind: 'user', roles: [] }, admin([], true))).toBe('forbidden');
  });

  it('requires every listed permission', () => {
    const policy = {
      kind: 'admin',
      permissions: ['applications.review', 'documents.view'],
    } as const;
    expect(evaluateAccess(policy, admin(['applications.review']))).toBe('forbidden');
    expect(evaluateAccess(policy, admin(['applications.review', 'documents.view']))).toBe('allow');
  });

  it('lets Super Admin bypass permission lists', () => {
    expect(
      evaluateAccess({ kind: 'admin', permissions: ['finance.manage'] }, admin([], true)),
    ).toBe('allow');
  });
});

describe('adminCan', () => {
  it('checks a single permission', () => {
    expect(adminCan(admin(['audit.read']), 'audit.read')).toBe(true);
    expect(adminCan(admin(['audit.read']), 'admins.manage')).toBe(false);
    expect(adminCan(admin([], true), 'admins.manage')).toBe(true);
  });
});
