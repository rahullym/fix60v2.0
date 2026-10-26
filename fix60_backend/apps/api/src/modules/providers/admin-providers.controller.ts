import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  adminProviderListQuerySchema,
  suspendAccountRequestSchema,
  updatePersonRequestSchema,
  type AdminProviderDetail,
  type AdminProviderSummary,
  type Paged,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { AdminAccess, CurrentAdmin } from '../../common/access/access.decorators';
import { parse, parseUuid } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { AccountsService } from '../accounts/accounts.service';
import { AdminProvidersService } from './admin-providers.service';

/** `:id` is the provider profile id. */
@Controller('admin/providers')
@AdminAccess('providers.read')
export class AdminProvidersController {
  constructor(
    private readonly providers: AdminProvidersService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<Paged<AdminProviderSummary>> {
    return this.providers.list(parse(adminProviderListQuerySchema, query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<AdminProviderDetail> {
    return this.providers.get(parseUuid(id));
  }

  @Patch(':id')
  @AdminAccess('providers.read', 'providers.manage')
  async update(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminProviderDetail> {
    const profileId = parseUuid(id);
    const changes = parse(updatePersonRequestSchema, body);
    const userId = await this.providers.userIdOf(profileId);
    await this.accounts.updatePerson(actor, userId, 'provider', changes, requestMeta(request));
    return this.providers.get(profileId);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @AdminAccess('providers.read', 'providers.manage')
  async suspend(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminProviderDetail> {
    const profileId = parseUuid(id);
    const { reason } = parse(suspendAccountRequestSchema, body);
    const userId = await this.providers.userIdOf(profileId);
    await this.accounts.suspend(actor, userId, 'provider', reason, requestMeta(request));
    return this.providers.get(profileId);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @AdminAccess('providers.read', 'providers.manage')
  async reactivate(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AdminProviderDetail> {
    const profileId = parseUuid(id);
    const userId = await this.providers.userIdOf(profileId);
    await this.accounts.reactivate(actor, userId, 'provider', requestMeta(request));
    return this.providers.get(profileId);
  }
}

@Module({ controllers: [AdminProvidersController], providers: [AdminProvidersService] })
export class AdminProvidersModule {}
