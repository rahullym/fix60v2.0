import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AdminPermission, UserRole } from '@fix60/shared';
import type { AccessPolicy, AdminPrincipal, Principal, UserPrincipal } from './access-policy';

export const ACCESS_POLICY_KEY = 'fix60:access';

export interface AuthenticatedRequest {
  principal?: Principal;
  requestId?: string;
}

/** No authentication. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata<string, AccessPolicy>(ACCESS_POLICY_KEY, { kind: 'public' });

/** Customer/provider token required; restrict to `roles` when given. */
export const UserAccess = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata<string, AccessPolicy>(ACCESS_POLICY_KEY, { kind: 'user', roles });

/** Admin token required, holding every listed permission. */
export const AdminAccess = (...permissions: AdminPermission[]): MethodDecorator & ClassDecorator =>
  SetMetadata<string, AccessPolicy>(ACCESS_POLICY_KEY, { kind: 'admin', permissions });

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserPrincipal => {
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().principal;
    if (principal?.kind !== 'user') {
      throw new Error('CurrentUser used on a route without UserAccess');
    }
    return principal;
  },
);

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal => {
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().principal;
    if (principal?.kind !== 'admin') {
      throw new Error('CurrentAdmin used on a route without AdminAccess');
    }
    return principal;
  },
);
