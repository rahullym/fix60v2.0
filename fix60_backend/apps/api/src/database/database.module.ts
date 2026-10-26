import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabase, type Database, type DatabaseHandle } from '@fix60/db';
import type { ApiEnv } from '@fix60/shared';
import { API_ENV } from '../config/env';

export const DATABASE = Symbol('DATABASE');
const DATABASE_HANDLE = Symbol('DATABASE_HANDLE');

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_HANDLE) private readonly handle: DatabaseHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_HANDLE,
      inject: [API_ENV],
      useFactory: (env: ApiEnv): DatabaseHandle => createDatabase(env.DATABASE_URL),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_HANDLE],
      useFactory: (handle: DatabaseHandle): Database => handle.db,
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
