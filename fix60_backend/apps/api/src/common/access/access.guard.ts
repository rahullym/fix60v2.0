import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { accessTokenPayloadSchema, errorCodes } from '@fix60/shared';
import { ApiException, forbidden, unauthenticated } from '../api-exception';
import { evaluateAccess, type AccessPolicy, type Principal } from './access-policy';
import { ACCESS_POLICY_KEY, type AuthenticatedRequest } from './access.decorators';
import { PrincipalService } from './principal.service';
import { TOKEN_AUDIENCE } from './token-audience';

function bearerToken(request: Request): string | null {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Global guard: authenticates the bearer token and enforces the route's declared access policy. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly principals: PrincipalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AccessPolicy | undefined>(ACCESS_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (policy?.kind === 'public') {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const principal = await this.authenticate(request);
    const decision = evaluateAccess(policy, principal);
    if (decision === 'unauthenticated') {
      throw unauthenticated();
    }
    if (decision === 'suspended') {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        errorCodes.accountSuspended,
        'Account suspended',
      );
    }
    if (decision === 'forbidden') {
      throw forbidden();
    }
    request.principal = principal ?? undefined;
    return true;
  }

  private async authenticate(request: Request): Promise<Principal | null> {
    const token = bearerToken(request);
    if (!token) {
      return null;
    }
    let claims: unknown;
    try {
      claims = await this.jwt.verifyAsync(token, {
        algorithms: ['HS256'],
        audience: [TOKEN_AUDIENCE.user, TOKEN_AUDIENCE.admin],
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw unauthenticated('Access token expired', errorCodes.tokenExpired);
      }
      throw unauthenticated();
    }
    const parsed = accessTokenPayloadSchema.safeParse(claims);
    const audience = (claims as { aud?: unknown }).aud;
    if (!parsed.success || audience !== TOKEN_AUDIENCE[parsed.data.kind]) {
      throw unauthenticated();
    }
    if (parsed.data.kind === 'admin') {
      return this.principals.loadAdmin(parsed.data.sub);
    }
    const user = await this.principals.loadUser(parsed.data.sub);
    return user && user.role === parsed.data.role ? user : null;
  }
}
