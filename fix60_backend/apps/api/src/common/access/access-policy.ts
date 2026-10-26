import type { AdminPermission, UserRole, UserStatus } from '@fix60/shared';

/** Authenticated phone-account caller (customer or provider). */
export interface UserPrincipal {
  kind: 'user';
  id: string;
  role: UserRole;
  status: UserStatus;
}

/** Authenticated back-office caller with permissions resolved fresh on every request. */
export interface AdminPrincipal {
  kind: 'admin';
  id: string;
  isSuper: boolean;
  permissions: ReadonlySet<AdminPermission>;
}

export type Principal = UserPrincipal | AdminPrincipal;

/** Declared on every route. A route without a policy is denied. */
export type AccessPolicy =
  | { kind: 'public' }
  | { kind: 'user'; roles: readonly UserRole[] }
  | { kind: 'admin'; permissions: readonly AdminPermission[] };

export type AccessDecision = 'allow' | 'unauthenticated' | 'forbidden' | 'suspended';

/** Pure policy check. `permissions` are all required; Super Admin bypasses them. */
export function evaluateAccess(
  policy: AccessPolicy | undefined,
  principal: Principal | null,
): AccessDecision {
  if (!policy) {
    return 'forbidden';
  }
  if (policy.kind === 'public') {
    return 'allow';
  }
  if (!principal) {
    return 'unauthenticated';
  }
  if (policy.kind === 'user') {
    if (principal.kind !== 'user') {
      return 'forbidden';
    }
    if (principal.status === 'suspended') {
      return 'suspended';
    }
    if (principal.status === 'deleted') {
      return 'unauthenticated';
    }
    return policy.roles.length === 0 || policy.roles.includes(principal.role)
      ? 'allow'
      : 'forbidden';
  }
  if (principal.kind !== 'admin') {
    return 'forbidden';
  }
  if (principal.isSuper) {
    return 'allow';
  }
  return policy.permissions.every((permission) => principal.permissions.has(permission))
    ? 'allow'
    : 'forbidden';
}

/** Whether an admin may perform an action, for checks inside services. */
export function adminCan(principal: AdminPrincipal, permission: AdminPermission): boolean {
  return principal.isSuper || principal.permissions.has(permission);
}
