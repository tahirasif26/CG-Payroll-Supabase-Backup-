import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type { ListAuditQuery, RecordAuditDto } from './dto/audit.schemas';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Read (admin) ────────────────────────────────────────────────────

  async list(clientId: string, query: ListAuditQuery) {
    const where: Prisma.AuditLogWhereInput = {
      clientId,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { entityLabel: { contains: query.search, mode: 'insensitive' } },
              { userEmail: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data: items,
      meta: {
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      },
    };
  }

  // ─── Write (other modules call this) ─────────────────────────────────

  /**
   * Best-effort log. We never block a domain operation because audit failed —
   * Prisma errors are caught and warn-logged. Higher-stakes integrity audit
   * (immutable + hash-chained) lands in Phase 10 hardening.
   */
  async record(dto: RecordAuditDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...dto,
          // Prisma 6 distinguishes "SQL NULL" from "JSON null". For nullable
          // Json columns we must use `Prisma.JsonNull`, not native null.
          beforeValue:
            dto.beforeValue == null
              ? Prisma.JsonNull
              : (dto.beforeValue as Prisma.InputJsonValue),
          afterValue:
            dto.afterValue == null
              ? Prisma.JsonNull
              : (dto.afterValue as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      this.logger.warn(
        `audit log write failed for ${dto.entityType}/${dto.entityId ?? '?'}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
