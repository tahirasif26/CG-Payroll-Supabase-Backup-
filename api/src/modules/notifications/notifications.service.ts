import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  CreateNotificationDto,
  ListNotificationsQuery,
  MarkReadDto,
} from './dto/notification.schemas';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Read ─────────────────────────────────────────────────────────────

  async listForUser(userId: string, clientId: string, query: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      clientId,
      ...(query.state === 'unread' ? { readAt: null } : {}),
      ...(query.state === 'read' ? { readAt: { not: null } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
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

  async unreadCount(userId: string, clientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, clientId, readAt: null },
    });
  }

  // ─── Mutate (self only) ───────────────────────────────────────────────

  async markRead(userId: string, clientId: string, dto: MarkReadDto): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: dto.ids }, userId, clientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markAllRead(userId: string, clientId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, clientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async delete(userId: string, clientId: string, id: string): Promise<{ deleted: boolean }> {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId, clientId },
    });
    return { deleted: result.count > 0 };
  }

  // ─── Internal API for other modules ───────────────────────────────────

  /**
   * Programmatic notification creation. Called from approval, payroll, etc.
   * — never directly from an HTTP controller in this module. Mirror of
   * Supabase `public.create_notification`.
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  /**
   * Broadcast to every admin in a client. Mirror of Supabase
   * `public.notify_client_admins`.
   */
  async notifyClientAdmins(input: Omit<CreateNotificationDto, 'userId'>) {
    const admins = await this.prisma.userRole.findMany({
      where: {
        clientId: input.clientId,
        role: { appRole: 'admin' },
      },
      select: { userId: true },
    });
    if (admins.length === 0) return { created: 0 };
    const data = admins.map((a) => ({ ...input, userId: a.userId }));
    const result = await this.prisma.notification.createMany({ data });
    return { created: result.count };
  }
}
