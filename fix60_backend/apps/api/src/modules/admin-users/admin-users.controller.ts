import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  adminPermissions,
  createAdminRoleRequestSchema,
  createAdminUserRequestSchema,
  paginationQuerySchema,
  updateAdminRoleRequestSchema,
  updateAdminUserRequestSchema,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
  type ItemList,
  type Paged,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { AdminAccess, CurrentAdmin } from '../../common/access/access.decorators';
import { parse, parseUuid } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { AdminUsersService } from './admin-users.service';

const listAdminsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(80).optional(),
});

@Controller('admin')
@AdminAccess('admins.manage')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get('permissions')
  listPermissions(): ItemList<AdminPermission> {
    return { items: [...adminPermissions] };
  }

  @Get('roles')
  async listRoles(): Promise<ItemList<AdminRole>> {
    return { items: await this.adminUsers.listRoles() };
  }

  @Post('roles')
  createRole(
    @CurrentAdmin() actor: AdminPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminRole> {
    return this.adminUsers.createRole(
      actor,
      parse(createAdminRoleRequestSchema, body),
      requestMeta(request),
    );
  }

  @Patch('roles/:id')
  updateRole(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminRole> {
    return this.adminUsers.updateRole(
      actor,
      parseUuid(id),
      parse(updateAdminRoleRequestSchema, body),
      requestMeta(request),
    );
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.adminUsers.deleteRole(actor, parseUuid(id), requestMeta(request));
  }

  @Get('admin-users')
  listAdmins(@Query() query: unknown): Promise<Paged<AdminUser>> {
    return this.adminUsers.listAdmins(parse(listAdminsQuerySchema, query));
  }

  @Post('admin-users')
  createAdmin(
    @CurrentAdmin() actor: AdminPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminUser> {
    return this.adminUsers.createAdmin(
      actor,
      parse(createAdminUserRequestSchema, body),
      requestMeta(request),
    );
  }

  @Patch('admin-users/:id')
  updateAdmin(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminUser> {
    return this.adminUsers.updateAdmin(
      actor,
      parseUuid(id),
      parse(updateAdminUserRequestSchema, body),
      requestMeta(request),
    );
  }
}
