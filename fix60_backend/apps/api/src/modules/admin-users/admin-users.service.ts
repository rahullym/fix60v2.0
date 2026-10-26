import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm';
import {
  adminRolePermissions,
  adminRoles,
  adminUserRoles,
  adminUsers,
  type Database,
} from '@fix60/db';
import {
  adminPermissionSchema,
  errorCodes,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
  type CreateAdminRoleRequest,
  type CreateAdminUserRequest,
  type Paged,
  type PaginationQuery,
  type UpdateAdminRoleRequest,
  type UpdateAdminUserRequest,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { badRequest, conflict, forbidden, notFound } from '../../common/api-exception';
import { AuditService } from '../../common/audit/audit.service';
import { escapeLike, toIso } from '../../common/format';
import type { RequestMeta } from '../../common/request-context';
import { DATABASE } from '../../database/database.module';
import { hashPassword } from '../auth/password';
import { isUniqueViolation, type Transaction } from '../auth/users.repository';
import { SessionsService } from '../sessions/sessions.service';
import { canDefinePermissions, canGrantRoles, removesLastSuperAdmin } from './rbac-policy';

type Executor = Database | Transaction;

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
  ) {}

  async listRoles(): Promise<AdminRole[]> {
    const roles = await this.db
      .select()
      .from(adminRoles)
      .where(isNull(adminRoles.deletedAt))
      .orderBy(desc(adminRoles.isSystem), adminRoles.name);
    const permissions = await this.permissionsByRole(roles.map((role) => role.id));
    return roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSuper: role.isSuper,
      isSystem: role.isSystem,
      permissions: permissions.get(role.id) ?? [],
    }));
  }

  async createRole(
    actor: AdminPrincipal,
    request: CreateAdminRoleRequest,
    meta: RequestMeta,
  ): Promise<AdminRole> {
    if (!canDefinePermissions(actor, request.permissions)) {
      throw forbidden('You can only grant permissions you hold');
    }
    try {
      const roleId = await this.db.transaction(async (tx) => {
        const [role] = await tx
          .insert(adminRoles)
          .values({
            slug: request.slug,
            name: request.name,
            description: request.description ?? null,
          })
          .returning({ id: adminRoles.id });
        await tx
          .insert(adminRolePermissions)
          .values(request.permissions.map((permission) => ({ roleId: role!.id, permission })));
        await this.audit.record(
          {
            actorType: 'admin',
            actorId: actor.id,
            action: 'admin_role.created',
            entityType: 'admin_role',
            entityId: role!.id,
            diff: { ...request },
            meta,
          },
          tx,
        );
        return role!.id;
      });
      return this.getRole(roleId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(errorCodes.conflict, 'A role with this slug already exists');
      }
      throw error;
    }
  }

  async updateRole(
    actor: AdminPrincipal,
    roleId: string,
    request: UpdateAdminRoleRequest,
    meta: RequestMeta,
  ): Promise<AdminRole> {
    const role = await this.getRole(roleId);
    if (role.isSystem) {
      throw forbidden('System roles are defined in code and cannot be edited');
    }
    if (request.permissions && !canDefinePermissions(actor, request.permissions)) {
      throw forbidden('You can only grant permissions you hold');
    }
    await this.db.transaction(async (tx) => {
      const { permissions, ...fields } = request;
      if (Object.keys(fields).length > 0) {
        await tx.update(adminRoles).set(fields).where(eq(adminRoles.id, roleId));
      }
      if (permissions) {
        await this.replacePermissions(tx, roleId, role.permissions, permissions);
      }
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: 'admin_role.updated',
          entityType: 'admin_role',
          entityId: roleId,
          diff: { before: role, after: request },
          meta,
        },
        tx,
      );
    });
    return this.getRole(roleId);
  }

  async deleteRole(actor: AdminPrincipal, roleId: string, meta: RequestMeta): Promise<void> {
    const role = await this.getRole(roleId);
    if (role.isSystem) {
      throw forbidden('System roles cannot be deleted');
    }
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx.update(adminRoles).set({ deletedAt: now }).where(eq(adminRoles.id, roleId));
      await tx
        .update(adminUserRoles)
        .set({ deletedAt: now })
        .where(and(eq(adminUserRoles.roleId, roleId), isNull(adminUserRoles.deletedAt)));
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: 'admin_role.deleted',
          entityType: 'admin_role',
          entityId: roleId,
          diff: { slug: role.slug },
          meta,
        },
        tx,
      );
    });
  }

  async listAdmins(query: PaginationQuery & { q?: string }): Promise<Paged<AdminUser>> {
    const pattern = query.q ? `%${escapeLike(query.q)}%` : null;
    const search = pattern
      ? or(ilike(adminUsers.email, pattern), ilike(adminUsers.fullName, pattern))
      : undefined;
    const where = and(isNull(adminUsers.deletedAt), search);
    const [rows, [totals]] = await Promise.all([
      this.db
        .select()
        .from(adminUsers)
        .where(where)
        .orderBy(adminUsers.fullName)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(adminUsers).where(where),
    ]);
    const rolesByAdmin = await this.rolesByAdmin(rows.map((row) => row.id));
    return {
      items: rows.map((row) => this.toAdminUser(row, rolesByAdmin.get(row.id) ?? [])),
      page: query.page,
      pageSize: query.pageSize,
      total: totals?.total ?? 0,
    };
  }

  async createAdmin(
    actor: AdminPrincipal,
    request: CreateAdminUserRequest,
    meta: RequestMeta,
  ): Promise<AdminUser> {
    await this.assertCanGrant(actor, request.roleIds);
    const passwordHash = await hashPassword(request.password);
    try {
      const adminId = await this.db.transaction(async (tx) => {
        const [admin] = await tx
          .insert(adminUsers)
          .values({ email: request.email, fullName: request.fullName, passwordHash })
          .returning({ id: adminUsers.id });
        await tx
          .insert(adminUserRoles)
          .values(request.roleIds.map((roleId) => ({ adminId: admin!.id, roleId })));
        await this.audit.record(
          {
            actorType: 'admin',
            actorId: actor.id,
            action: 'admin_user.created',
            entityType: 'admin_user',
            entityId: admin!.id,
            diff: { email: request.email, fullName: request.fullName, roleIds: request.roleIds },
            meta,
          },
          tx,
        );
        return admin!.id;
      });
      return this.getAdmin(adminId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(errorCodes.conflict, 'An admin with this email already exists');
      }
      throw error;
    }
  }

  async updateAdmin(
    actor: AdminPrincipal,
    adminId: string,
    request: UpdateAdminUserRequest,
    meta: RequestMeta,
  ): Promise<AdminUser> {
    const before = await this.getAdmin(adminId);
    if (adminId === actor.id && (request.status === 'disabled' || request.roleIds)) {
      throw badRequest(errorCodes.validationFailed, 'You cannot change your own status or roles');
    }
    if (request.roleIds) {
      await this.assertCanGrant(actor, request.roleIds);
    }
    if (!actor.isSuper && before.roles.some((role) => role.slug === 'super_admin')) {
      throw forbidden('Only a Super Admin can change another Super Admin');
    }

    await this.db.transaction(async (tx) => {
      await this.assertKeepsASuperAdmin(tx, adminId, before, request);
      const fields = {
        ...(request.fullName ? { fullName: request.fullName } : {}),
        ...(request.status ? { status: request.status } : {}),
        ...(request.resetTotp
          ? {
              totpSecretEnc: null,
              totpPendingSecretEnc: null,
              totpEnabledAt: null,
              totpLastStep: null,
            }
          : {}),
      };
      if (Object.keys(fields).length > 0) {
        await tx.update(adminUsers).set(fields).where(eq(adminUsers.id, adminId));
      }
      if (request.roleIds) {
        await this.replaceRoles(tx, adminId, request.roleIds);
      }
      if (request.status === 'disabled' || request.resetTotp || request.roleIds) {
        await this.sessions.revokeAll({ kind: 'admin', id: adminId }, tx);
      }
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: actor.id,
          action: 'admin_user.updated',
          entityType: 'admin_user',
          entityId: adminId,
          diff: { ...request },
          meta,
        },
        tx,
      );
    });
    return this.getAdmin(adminId);
  }

  private async assertCanGrant(actor: AdminPrincipal, roleIds: string[]): Promise<void> {
    const roles = await this.db
      .select({ id: adminRoles.id, isSuper: adminRoles.isSuper })
      .from(adminRoles)
      .where(and(inArray(adminRoles.id, roleIds), isNull(adminRoles.deletedAt)));
    if (roles.length !== new Set(roleIds).size) {
      throw badRequest(errorCodes.validationFailed, 'Unknown role');
    }
    const permissions = await this.permissionsByRole(roleIds);
    const grantable = roles.map((role) => ({
      isSuper: role.isSuper,
      permissions: permissions.get(role.id) ?? [],
    }));
    if (!canGrantRoles(actor, grantable)) {
      throw forbidden('You can only grant roles within your own permissions');
    }
  }

  private async assertKeepsASuperAdmin(
    tx: Transaction,
    adminId: string,
    before: AdminUser,
    request: UpdateAdminUserRequest,
  ): Promise<void> {
    const isCurrentlyActiveSuper =
      before.status === 'active' && before.roles.some((role) => role.slug === 'super_admin');
    if (!isCurrentlyActiveSuper) {
      return;
    }
    const nextStatus = request.status ?? before.status;
    const nextRoleIsSuper = request.roleIds
      ? (
          await tx
            .select({ id: adminRoles.id })
            .from(adminRoles)
            .where(
              and(
                inArray(adminRoles.id, request.roleIds),
                eq(adminRoles.isSuper, true),
                isNull(adminRoles.deletedAt),
              ),
            )
        ).length > 0
      : true;
    const [others] = await tx
      .select({ total: count() })
      .from(adminUsers)
      .innerJoin(
        adminUserRoles,
        and(eq(adminUserRoles.adminId, adminUsers.id), isNull(adminUserRoles.deletedAt)),
      )
      .innerJoin(
        adminRoles,
        and(
          eq(adminRoles.id, adminUserRoles.roleId),
          eq(adminRoles.isSuper, true),
          isNull(adminRoles.deletedAt),
        ),
      )
      .where(
        and(
          ne(adminUsers.id, adminId),
          eq(adminUsers.status, 'active'),
          isNull(adminUsers.deletedAt),
        ),
      );
    if (
      removesLastSuperAdmin({
        isCurrentlyActiveSuper,
        willBeActiveSuper: nextStatus === 'active' && nextRoleIsSuper,
        otherActiveSuperCount: others?.total ?? 0,
      })
    ) {
      throw conflict(errorCodes.lastSuperAdmin, 'At least one active Super Admin is required');
    }
  }

  private async replaceRoles(tx: Transaction, adminId: string, roleIds: string[]): Promise<void> {
    const live = await tx
      .select({ id: adminUserRoles.id, roleId: adminUserRoles.roleId })
      .from(adminUserRoles)
      .where(and(eq(adminUserRoles.adminId, adminId), isNull(adminUserRoles.deletedAt)));
    const wanted = new Set(roleIds);
    const stale = live.filter((row) => !wanted.has(row.roleId)).map((row) => row.id);
    if (stale.length > 0) {
      await tx
        .update(adminUserRoles)
        .set({ deletedAt: new Date() })
        .where(inArray(adminUserRoles.id, stale));
    }
    const held = new Set(live.map((row) => row.roleId));
    const missing = roleIds.filter((roleId) => !held.has(roleId));
    if (missing.length > 0) {
      await tx.insert(adminUserRoles).values(missing.map((roleId) => ({ adminId, roleId })));
    }
  }

  private async replacePermissions(
    tx: Transaction,
    roleId: string,
    current: AdminPermission[],
    next: AdminPermission[],
  ): Promise<void> {
    const wanted = new Set(next);
    const removed = current.filter((permission) => !wanted.has(permission));
    if (removed.length > 0) {
      await tx
        .update(adminRolePermissions)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(adminRolePermissions.roleId, roleId),
            inArray(adminRolePermissions.permission, removed),
            isNull(adminRolePermissions.deletedAt),
          ),
        );
    }
    const held = new Set(current);
    const added = next.filter((permission) => !held.has(permission));
    if (added.length > 0) {
      await tx
        .insert(adminRolePermissions)
        .values(added.map((permission) => ({ roleId, permission })));
    }
  }

  private async getRole(roleId: string): Promise<AdminRole> {
    const role = (await this.listRoles()).find((candidate) => candidate.id === roleId);
    if (!role) {
      throw notFound('Role');
    }
    return role;
  }

  private async getAdmin(adminId: string): Promise<AdminUser> {
    const [row] = await this.db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, adminId), isNull(adminUsers.deletedAt)));
    if (!row) {
      throw notFound('Admin');
    }
    const roles = await this.rolesByAdmin([adminId]);
    return this.toAdminUser(row, roles.get(adminId) ?? []);
  }

  private async permissionsByRole(
    roleIds: string[],
    executor: Executor = this.db,
  ): Promise<Map<string, AdminPermission[]>> {
    const result = new Map<string, AdminPermission[]>();
    if (roleIds.length === 0) {
      return result;
    }
    const rows = await executor
      .select({ roleId: adminRolePermissions.roleId, permission: adminRolePermissions.permission })
      .from(adminRolePermissions)
      .where(
        and(inArray(adminRolePermissions.roleId, roleIds), isNull(adminRolePermissions.deletedAt)),
      );
    for (const row of rows) {
      const parsed = adminPermissionSchema.safeParse(row.permission);
      if (parsed.success) {
        result.set(row.roleId, [...(result.get(row.roleId) ?? []), parsed.data]);
      }
    }
    return result;
  }

  private async rolesByAdmin(adminIds: string[]): Promise<Map<string, AdminUser['roles']>> {
    const result = new Map<string, AdminUser['roles']>();
    if (adminIds.length === 0) {
      return result;
    }
    const rows = await this.db
      .select({
        adminId: adminUserRoles.adminId,
        id: adminRoles.id,
        slug: adminRoles.slug,
        name: adminRoles.name,
      })
      .from(adminUserRoles)
      .innerJoin(
        adminRoles,
        and(eq(adminRoles.id, adminUserRoles.roleId), isNull(adminRoles.deletedAt)),
      )
      .where(and(inArray(adminUserRoles.adminId, adminIds), isNull(adminUserRoles.deletedAt)));
    for (const { adminId, ...role } of rows) {
      result.set(adminId, [...(result.get(adminId) ?? []), role]);
    }
    return result;
  }

  private toAdminUser(row: typeof adminUsers.$inferSelect, roles: AdminUser['roles']): AdminUser {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      status: row.status,
      isTotpEnabled: row.totpEnabledAt !== null,
      roles,
      lastLoginAt: toIso(row.lastLoginAt),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
