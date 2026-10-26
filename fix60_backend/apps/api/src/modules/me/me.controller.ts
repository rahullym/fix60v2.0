import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  registerDeviceRequestSchema,
  updateConsentsRequestSchema,
  updateMeRequestSchema,
  type ConsentState,
  type Me,
} from '@fix60/shared';
import type { UserPrincipal } from '../../common/access/access-policy';
import { CurrentUser, UserAccess } from '../../common/access/access.decorators';
import { parse } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { MeService } from './me.service';

@Controller('me')
@UserAccess()
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  get(@CurrentUser() user: UserPrincipal): Promise<Me> {
    return this.me.get(user);
  }

  @Patch()
  update(
    @CurrentUser() user: UserPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<Me> {
    return this.me.update(user, parse(updateMeRequestSchema, body), requestMeta(request));
  }

  @Get('consents')
  listConsents(@CurrentUser() user: UserPrincipal): Promise<ConsentState[]> {
    return this.me.listConsents(user);
  }

  @Put('consents')
  updateConsents(
    @CurrentUser() user: UserPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ConsentState[]> {
    return this.me.updateConsents(
      user,
      parse(updateConsentsRequestSchema, body),
      requestMeta(request),
    );
  }

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerDevice(@CurrentUser() user: UserPrincipal, @Body() body: unknown): Promise<void> {
    await this.me.registerDevice(user, parse(registerDeviceRequestSchema, body));
  }
}
