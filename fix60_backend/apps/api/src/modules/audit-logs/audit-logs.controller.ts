import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { adminUsers, auditLogs, type Database } from '@fix60/db';
import {
  auditLogQuerySchema,
  type AuditLogEntry,
  type AuditLogQuery,
  type Paged,
} from '@fix60/shared';
import { AdminAccess } from '../../common/access/access.decorators';
import { parse } from '../../common/parse';
import { DATABASE } from '../../database/database.module';

@Injectable()
export class AuditLogsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(query: AuditLogQuery): Promise<Paged<AuditLogEntry>> {
    const filters: SQL[] = [];
    if (query.actorId) {
      filters.push(eq(auditLogs.actorId, query.actorId));
    }
    if (query.entityType) {
      filters.push(eq(auditLogs.entityType, query.entityType));
    }
    if (query.entityId) {
      filters.push(eq(auditLogs.entityId, query.entityId));
    }
    if (query.action) {
      filters.push(eq(auditLogs.action, query.action));
    }
    if (query.from) {
      filters.push(gte(auditLogs.createdAt, new Date(query.from)));
    }
    if (query.to) {
      filters.push(lte(auditLogs.createdAt, new Date(query.to)));
    }
    const where = and(...filters);
    const [rows, [totals]] = await Promise.all([
      this.db
        .select({ log: auditLogs, adminName: adminUsers.fullName })
        .from(auditLogs)
        .leftJoin(
          adminUsers,
          and(eq(auditLogs.actorType, 'admin'), eq(adminUsers.id, auditLogs.actorId)),
        )
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(auditLogs).where(where),
    ]);
    return {
      items: rows.map(({ log, adminName }) => ({
        id: log.id,
        actorType: log.actorType,
        actorId: log.actorId,
        actorName: adminName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        diff: log.diff,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: totals?.total ?? 0,
    };
  }
}

@Controller('admin/audit-logs')
@AdminAccess('audit.read')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(@Query() query: unknown): Promise<Paged<AuditLogEntry>> {
    return this.auditLogs.list(parse(auditLogQuerySchema, query));
  }
}

@Module({ controllers: [AuditLogsController], providers: [AuditLogsService] })
export class AuditLogsModule {}
