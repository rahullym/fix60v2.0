import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ApiEnv } from '@fix60/shared';
import { AccessGuard } from './common/access/access.guard';
import { PrincipalService } from './common/access/principal.service';
import { AuditModule } from './common/audit/audit.service';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { ConfigModule } from './config/config.module';
import { API_ENV } from './config/env';
import { DatabaseModule } from './database/database.module';
import { PushModule } from './integrations/push/push.module';
import { StorageModule } from './integrations/storage/storage.module';
import { AccountsModule } from './modules/accounts/accounts.service';
import { AdminCustomersModule } from './modules/customers/admin-customers.controller';
import { AdminProvidersModule } from './modules/providers/admin-providers.controller';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BrandingModule } from './modules/branding/branding.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { SessionsModule } from './modules/sessions/sessions.service';

/** JWT signing and principal loading, shared by the global guard and the auth modules. */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => ({
        secret: env.JWT_SECRET,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [PrincipalService],
  exports: [JwtModule, PrincipalService],
})
class SecurityModule {}

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SecurityModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    AuditModule,
    SessionsModule,
    StorageModule,
    PushModule,
    HealthModule,
    BrandingModule,
    AuthModule,
    MeModule,
    AdminAuthModule,
    AdminUsersModule,
    AuditLogsModule,
    AccountsModule,
    AdminCustomersModule,
    AdminProvidersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*path');
  }
}
