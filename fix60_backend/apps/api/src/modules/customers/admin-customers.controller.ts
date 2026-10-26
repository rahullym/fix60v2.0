import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  adminCustomerListQuerySchema,
  suspendAccountRequestSchema,
  updatePersonRequestSchema,
  type AdminCustomerDetail,
  type AdminCustomerSummary,
  type Paged,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { AdminAccess, CurrentAdmin } from '../../common/access/access.decorators';
import { parse, parseUuid } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { AccountsService } from '../accounts/accounts.service';
import { AdminCustomersService } from './admin-customers.service';

@Controller('admin/customers')
@AdminAccess('customers.read')
export class AdminCustomersController {
  constructor(
    private readonly customers: AdminCustomersService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<Paged<AdminCustomerSummary>> {
    return this.customers.list(parse(adminCustomerListQuerySchema, query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<AdminCustomerDetail> {
    return this.customers.get(parseUuid(id));
  }

  @Patch(':id')
  @AdminAccess('customers.read', 'customers.manage')
  async update(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminCustomerDetail> {
    const userId = parseUuid(id);
    await this.accounts.updatePerson(
      actor,
      userId,
      'customer',
      parse(updatePersonRequestSchema, body),
      requestMeta(request),
    );
    return this.customers.get(userId);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @AdminAccess('customers.read', 'customers.manage')
  async suspend(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AdminCustomerDetail> {
    const userId = parseUuid(id);
    const { reason } = parse(suspendAccountRequestSchema, body);
    await this.accounts.suspend(actor, userId, 'customer', reason, requestMeta(request));
    return this.customers.get(userId);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @AdminAccess('customers.read', 'customers.manage')
  async reactivate(
    @CurrentAdmin() actor: AdminPrincipal,
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AdminCustomerDetail> {
    const userId = parseUuid(id);
    await this.accounts.reactivate(actor, userId, 'customer', requestMeta(request));
    return this.customers.get(userId);
  }
}

@Module({ controllers: [AdminCustomersController], providers: [AdminCustomersService] })
export class AdminCustomersModule {}
