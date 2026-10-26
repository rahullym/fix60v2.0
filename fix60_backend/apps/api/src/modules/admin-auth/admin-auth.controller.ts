import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  adminLoginRequestSchema,
  adminTotpRequestSchema,
  changeAdminPasswordRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  type AdminLoginResponse,
  type AdminMe,
  type AdminSessionResponse,
  type AuthTokens,
} from '@fix60/shared';
import type { AdminPrincipal } from '../../common/access/access-policy';
import { AdminAccess, CurrentAdmin, Public } from '../../common/access/access.decorators';
import { parse } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() body: unknown, @Req() request: Request): Promise<AdminLoginResponse> {
    return this.adminAuth.login(parse(adminLoginRequestSchema, body), requestMeta(request));
  }

  @Post('totp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyTotp(@Body() body: unknown, @Req() request: Request): Promise<AdminSessionResponse> {
    return this.adminAuth.verifyTotp(parse(adminTotpRequestSchema, body), requestMeta(request));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() body: unknown, @Req() request: Request): Promise<AuthTokens> {
    return this.adminAuth.refresh(
      parse(refreshRequestSchema, body).refreshToken,
      requestMeta(request),
    );
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: unknown): Promise<void> {
    await this.adminAuth.logout(parse(logoutRequestSchema, body).refreshToken);
  }

  @Get('me')
  @AdminAccess()
  me(@CurrentAdmin() admin: AdminPrincipal): Promise<AdminMe> {
    return this.adminAuth.me(admin);
  }

  @Post('change-password')
  @AdminAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<void> {
    await this.adminAuth.changePassword(
      admin,
      parse(changeAdminPasswordRequestSchema, body),
      requestMeta(request),
    );
  }
}
