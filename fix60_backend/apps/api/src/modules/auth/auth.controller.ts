import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  firebaseSignInRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type AuthSessionResponse,
  type AuthTokens,
  type FirebaseSignInResponse,
} from '@fix60/shared';
import { Public } from '../../common/access/access.decorators';
import { parse } from '../../common/parse';
import { requestMeta } from '../../common/request-context';
import { FirebaseAuthService } from '../../integrations/firebase/firebase-auth.service';
import { AuthService } from './auth.service';

const APP_CHECK_HEADER = 'x-firebase-appcheck';

/**
 * Per-IP limits sized for carrier-grade NAT, where many Indian mobile users share one IP.
 * OTP sending itself is rate-limited per phone by Firebase.
 */
const SIGN_IN_LIMIT = { default: { limit: 30, ttl: 60_000 } };
const REGISTER_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@Controller('auth')
@Public()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly firebase: FirebaseAuthService,
  ) {}

  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  @Throttle(SIGN_IN_LIMIT)
  async signIn(@Body() body: unknown, @Req() request: Request): Promise<FirebaseSignInResponse> {
    await this.firebase.assertAppCheck(request.header(APP_CHECK_HEADER));
    return this.auth.signIn(parse(firebaseSignInRequestSchema, body), requestMeta(request));
  }

  @Post('register')
  @Throttle(REGISTER_LIMIT)
  async register(@Body() body: unknown, @Req() request: Request): Promise<AuthSessionResponse> {
    await this.firebase.assertAppCheck(request.header(APP_CHECK_HEADER));
    return this.auth.register(parse(registerRequestSchema, body), requestMeta(request));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() body: unknown, @Req() request: Request): Promise<AuthTokens> {
    return this.auth.refresh(parse(refreshRequestSchema, body).refreshToken, requestMeta(request));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: unknown): Promise<void> {
    await this.auth.logout(parse(logoutRequestSchema, body).refreshToken);
  }
}
