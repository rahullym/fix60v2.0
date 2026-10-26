import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import type { Database } from '@fix60/db';
import { Public } from '../../common/access/access.decorators';
import { DATABASE } from '../../database/database.module';

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  async check(): Promise<{ status: 'ok'; version: string }> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', version: process.env.GIT_SHA ?? 'dev' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
