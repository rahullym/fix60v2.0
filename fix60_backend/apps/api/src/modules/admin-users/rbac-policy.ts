import type { AdminPermission } from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';

export interface GrantableRole {
  isSuper: boolean;
  permissions: readonly AdminPermission[];
}

/**
 * Prevents privilege escalation: only a Super Admin may hand out a super role, and anyone else
 * may only grant permissions they already hold.
 */
export function canGrantRoles(actor: AdminPrincipal, roles: readonly GrantableRole[]): boolean {
  if (actor.isSuper) {
    return true;
  }
  return roles.every(
    (role) =>
      !role.isSuper && role.permissions.every((permission) => actor.permissions.has(permission)),
  );
}

/** Same rule for defining a role's permission set. */
export function canDefinePermissions(
  actor: AdminPrincipal,
  permissions: readonly AdminPermission[],
): boolean {
  return actor.isSuper || permissions.every((permission) => actor.permissions.has(permission));
}

export interface SuperAdminChange {
  isCurrentlyActiveSuper: boolean;
  willBeActiveSuper: boolean;
  otherActiveSuperCount: number;
}

/** True when the change would leave the platform without an active Super Admin. */
export function removesLastSuperAdmin(change: SuperAdminChange): boolean {
  return (
    change.isCurrentlyActiveSuper && !change.willBeActiveSuper && change.otherActiveSuperCount === 0
  );
}
