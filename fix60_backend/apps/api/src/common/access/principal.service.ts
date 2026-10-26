import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  adminRolePermissions,
  adminRoles,
  adminUserRoles,
  adminUsers,
  users,
  type Database,
} from '@fix60/db';
import { adminPermissionSchema, type AdminPermission } from '@fix60/shared';
import { DATABASE } from '../../database/database.module';
import type { AdminPrincipal, UserPrincipal } from './access-policy';

export interface AdminAccessSummary {
  isSuper: boolean;
  roles: { id: string; slug: string; name: string }[];
  permissions: AdminPermission[];
}

/** Loads the live state behind a token, so suspensions and role changes apply immediately. */
@Injectable()
export class PrincipalService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async loadUser(id: string): Promise<UserPrincipal | null> {
    const [row] = await this.db
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    return row ? { kind: 'user', ...row } : null;
  }

  async loadAdmin(id: string): Promise<AdminPrincipal | null> {
    const [admin] = await this.db
      .select({ id: adminUsers.id, status: adminUsers.status })
      .from(adminUsers)
      .where(and(eq(adminUsers.id, id), isNull(adminUsers.deletedAt)));
    if (!admin || admin.status !== 'active') {
      return null;
    }
    const access = await this.loadAdminAccess(id);
    return { kind: 'admin', id, isSuper: access.isSuper, permissions: new Set(access.permissions) };
  }

  /** Roles and the union of their permissions, from live (non-deleted) rows only. */
  async loadAdminAccess(adminId: string): Promise<AdminAccessSummary> {
    const roleRows = await this.db
      .select({
        id: adminRoles.id,
        slug: adminRoles.slug,
        name: adminRoles.name,
        isSuper: adminRoles.isSuper,
      })
      .from(adminUserRoles)
      .innerJoin(
        adminRoles,
        and(eq(adminRoles.id, adminUserRoles.roleId), isNull(adminRoles.deletedAt)),
      )
      .where(and(eq(adminUserRoles.adminId, adminId), isNull(adminUserRoles.deletedAt)));
    const permissionRows = await this.db
      .selectDistinct({ permission: adminRolePermissions.permission })
      .from(adminUserRoles)
      .innerJoin(
        adminRoles,
        and(eq(adminRoles.id, adminUserRoles.roleId), isNull(adminRoles.deletedAt)),
      )
      .innerJoin(
        adminRolePermissions,
        and(eq(adminRolePermissions.roleId, adminRoles.id), isNull(adminRolePermissions.deletedAt)),
      )
      .where(and(eq(adminUserRoles.adminId, adminId), isNull(adminUserRoles.deletedAt)));
    const permissions = permissionRows.flatMap((row) => {
      const parsed = adminPermissionSchema.safeParse(row.permission);
      return parsed.success ? [parsed.data] : [];
    });
    return {
      isSuper: roleRows.some((role) => role.isSuper),
      roles: roleRows.map(({ id, slug, name }) => ({ id, slug, name })),
      permissions: permissions.sort(),
    };
  }
}
