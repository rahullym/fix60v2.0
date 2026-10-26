import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { auditLogs, type Database } from '@fix60/db';
import type { ActorType } from '@fix60/shared';
import { DATABASE } from '../../database/database.module';
import type { RequestMeta } from '../request-context';
import { redactForAudit } from './redact';

export interface AuditEntry {
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
  meta?: RequestMeta;
}

type Executor = Pick<Database, 'insert'>;

/** Writes append-only audit entries. Pass the transaction so the entry commits with the change. */
@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: AuditEntry, executor: Executor = this.db): Promise<void> {
    await executor.insert(auditLogs).values({
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      diff: entry.diff ? redactForAudit(entry.diff) : null,
      requestId: entry.meta?.requestId ?? null,
      ipAddress: entry.meta?.ipAddress ?? null,
      userAgent: entry.meta?.userAgent ?? null,
    });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
