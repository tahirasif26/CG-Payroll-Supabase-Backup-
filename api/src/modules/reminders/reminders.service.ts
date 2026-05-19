import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, ReminderCategory } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ApprovalsService } from '@modules/approvals/approvals.service';

/**
 * Cron-driven dispatcher. Replaces the Supabase `process-reminders` edge
 * function. Runs daily at 06:00 by default; admins can also poke it manually
 * via the controller for testing.
 *
 * Each iteration:
 *  1. Walks every enabled `ReminderRule` per client.
 *  2. For each rule, finds entities whose trigger date falls within one of the
 *     rule's leadDaysBefore values.
 *  3. Creates a Notification per recipient bucket (admin/self/manager).
 *  4. Records a `ReminderDispatch` row keyed for idempotency so we never
 *     double-send.
 *
 * Phase 8 implements probation_end, document_expiry, asset_warranty,
 * advance_settlement, birthday. Additional categories scaffold in as needed.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly approvals: ApprovalsService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────

  list(clientId: string) {
    return this.prisma.reminderRule.findMany({
      where: { clientId },
      orderBy: { category: 'asc' },
    });
  }

  upsert(clientId: string, dto: Prisma.ReminderRuleUncheckedCreateInput) {
    return this.prisma.reminderRule.upsert({
      where: {
        clientId_category_name: {
          clientId,
          category: dto.category as ReminderCategory,
          name: dto.name,
        },
      },
      update: {
        description: dto.description,
        isEnabled: dto.isEnabled,
        leadDaysBefore: dto.leadDaysBefore,
        repeatFrequency: dto.repeatFrequency,
        recipients: dto.recipients,
        priority: dto.priority,
      },
      create: { ...dto, clientId },
    });
  }

  // ─── Cron entry point ─────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runScheduled() {
    try {
      await this.processAllClients();
      await this.approvals.expireDelegations();
    } catch (err) {
      this.logger.error(
        `Daily reminder run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async processAllClients() {
    const clients = await this.prisma.client.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    let dispatched = 0;
    for (const c of clients) {
      dispatched += await this.processClient(c.id);
    }
    return { clients: clients.length, dispatched };
  }

  async processClient(clientId: string): Promise<number> {
    const rules = await this.prisma.reminderRule.findMany({
      where: { clientId, isEnabled: true },
    });
    let total = 0;
    for (const rule of rules) {
      switch (rule.category) {
        case ReminderCategory.probation_end:
          total += await this.processProbationEnd(rule);
          break;
        case ReminderCategory.document_expiry:
          total += await this.processDocumentExpiry(rule);
          break;
        case ReminderCategory.asset_warranty:
          total += await this.processAssetWarranty(rule);
          break;
        case ReminderCategory.advance_settlement:
          total += await this.processAdvanceSettlement(rule);
          break;
        case ReminderCategory.birthday:
          total += await this.processBirthdays(rule);
          break;
        default:
          // Other categories scaffold in here as separate processors.
          break;
      }
    }
    await this.prisma.reminderRule.updateMany({
      where: { clientId },
      data: { lastRunAt: new Date() },
    });
    return total;
  }

  // ─── Category processors (each idempotent via dispatch_key) ────────────

  private async processProbationEnd(rule: { id: string; clientId: string; leadDaysBefore: number[] }) {
    const today = startOfDay(new Date());
    let count = 0;
    for (const lead of rule.leadDaysBefore) {
      const target = addDays(today, lead);
      const employees = await this.prisma.employee.findMany({
        where: {
          clientId: rule.clientId,
          status: 'active',
          probationEndDate: { gte: target, lt: addDays(target, 1) },
        },
        include: { user: { select: { id: true } }, reportsTo: { select: { userId: true } } },
      });
      for (const emp of employees) {
        const recipients = new Set<string>();
        if (emp.user?.id) recipients.add(emp.user.id);
        if (emp.reportsTo?.userId) recipients.add(emp.reportsTo.userId);
        for (const userId of recipients) {
          if (await this.alreadyDispatched(rule.id, 'employee', emp.id, userId, lead)) continue;
          await this.dispatch({
            ruleId: rule.id,
            clientId: rule.clientId,
            entityType: 'employee',
            entityId: emp.id,
            recipientUserId: userId,
            leadDays: lead,
            title: `Probation ends in ${lead} day(s): ${emp.firstName} ${emp.lastName}`,
            category: 'probation_end',
            link: `/employees/${emp.id}`,
          });
          count++;
        }
      }
    }
    return count;
  }

  private async processDocumentExpiry(rule: { id: string; clientId: string; leadDaysBefore: number[] }) {
    const today = startOfDay(new Date());
    let count = 0;
    for (const lead of rule.leadDaysBefore) {
      const target = addDays(today, lead);
      const docs = await this.prisma.employeeDocument.findMany({
        where: {
          clientId: rule.clientId,
          expiryDate: { gte: target, lt: addDays(target, 1) },
        },
        include: { employee: { select: { id: true, firstName: true, lastName: true, userId: true } } },
      });
      for (const d of docs) {
        const userId = d.employee.userId;
        if (!userId) continue;
        if (await this.alreadyDispatched(rule.id, 'document', d.id, userId, lead)) continue;
        await this.dispatch({
          ruleId: rule.id,
          clientId: rule.clientId,
          entityType: 'document',
          entityId: d.id,
          recipientUserId: userId,
          leadDays: lead,
          title: `${d.docType ?? 'Document'} expires in ${lead} day(s)`,
          category: 'document_expiry',
          link: `/account`,
        });
        count++;
      }
    }
    return count;
  }

  private async processAssetWarranty(rule: { id: string; clientId: string; leadDaysBefore: number[] }) {
    const today = startOfDay(new Date());
    let count = 0;
    for (const lead of rule.leadDaysBefore) {
      const target = addDays(today, lead);
      const assets = await this.prisma.asset.findMany({
        where: {
          clientId: rule.clientId,
          warrantyExpiry: { gte: target, lt: addDays(target, 1) },
        },
      });
      // Asset warranty notifies client admins (broadcast).
      for (const a of assets) {
        const admins = await this.prisma.userRole.findMany({
          where: { clientId: rule.clientId, role: { appRole: 'admin' } },
          select: { userId: true },
        });
        for (const adm of admins) {
          if (await this.alreadyDispatched(rule.id, 'asset', a.id, adm.userId, lead)) continue;
          await this.dispatch({
            ruleId: rule.id,
            clientId: rule.clientId,
            entityType: 'asset',
            entityId: a.id,
            recipientUserId: adm.userId,
            leadDays: lead,
            title: `Asset ${a.assetTag} warranty expires in ${lead} day(s)`,
            category: 'asset_warranty',
            link: `/assets/inventory`,
          });
          count++;
        }
      }
    }
    return count;
  }

  private async processAdvanceSettlement(rule: { id: string; clientId: string; leadDaysBefore: number[] }) {
    const today = startOfDay(new Date());
    let count = 0;
    for (const lead of rule.leadDaysBefore) {
      const target = addDays(today, lead);
      const advances = await this.prisma.advance.findMany({
        where: {
          clientId: rule.clientId,
          status: 'approved',
          settlementDueDate: { gte: target, lt: addDays(target, 1) },
        },
        include: { employee: { select: { userId: true } } },
      });
      for (const a of advances) {
        const userId = a.employee.userId;
        if (!userId) continue;
        if (await this.alreadyDispatched(rule.id, 'advance', a.id, userId, lead)) continue;
        await this.dispatch({
          ruleId: rule.id,
          clientId: rule.clientId,
          entityType: 'advance',
          entityId: a.id,
          recipientUserId: userId,
          leadDays: lead,
          title: `Advance "${a.name}" settlement due in ${lead} day(s)`,
          category: 'advance_settlement',
          link: '/advances',
        });
        count++;
      }
    }
    return count;
  }

  private async processBirthdays(rule: { id: string; clientId: string }) {
    const today = startOfDay(new Date());
    const month = today.getMonth() + 1;
    const day = today.getDate();
    // Same-day broadcast to client admins.
    const employees = await this.prisma.employee.findMany({
      where: { clientId: rule.clientId, status: 'active', dateOfBirth: { not: null } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    });
    const todays = employees.filter(
      (e) => e.dateOfBirth && e.dateOfBirth.getMonth() + 1 === month && e.dateOfBirth.getDate() === day,
    );
    if (todays.length === 0) return 0;

    const admins = await this.prisma.userRole.findMany({
      where: { clientId: rule.clientId, role: { appRole: 'admin' } },
      select: { userId: true },
    });
    let count = 0;
    for (const emp of todays) {
      for (const adm of admins) {
        if (await this.alreadyDispatched(rule.id, 'employee', emp.id, adm.userId, 0)) continue;
        await this.dispatch({
          ruleId: rule.id,
          clientId: rule.clientId,
          entityType: 'employee',
          entityId: emp.id,
          recipientUserId: adm.userId,
          leadDays: 0,
          title: `🎂 Birthday today: ${emp.firstName} ${emp.lastName}`,
          category: 'birthday',
          link: '/birthdays',
        });
        count++;
      }
    }
    return count;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private async alreadyDispatched(
    ruleId: string,
    entityType: string,
    entityId: string,
    recipientUserId: string,
    leadDays: number,
  ): Promise<boolean> {
    const key = `${ruleId}:${entityType}:${entityId}:${recipientUserId}:${leadDays}`;
    const exists = await this.prisma.reminderDispatch.findUnique({ where: { dispatchKey: key } });
    return !!exists;
  }

  private async dispatch(input: {
    ruleId: string;
    clientId: string;
    entityType: string;
    entityId: string;
    recipientUserId: string;
    leadDays: number;
    title: string;
    category: string;
    link?: string;
  }) {
    const notif = await this.notifications.create({
      clientId: input.clientId,
      userId: input.recipientUserId,
      title: input.title,
      category: input.category,
      link: input.link ?? null,
      severity: 'info',
      entityType: input.entityType,
      entityId: input.entityId,
    });
    await this.prisma.reminderDispatch.create({
      data: {
        ruleId: input.ruleId,
        clientId: input.clientId,
        entityType: input.entityType,
        entityId: input.entityId,
        recipientUserId: input.recipientUserId,
        notificationId: notif.id,
        leadDaysUsed: input.leadDays,
        dispatchKey: `${input.ruleId}:${input.entityType}:${input.entityId}:${input.recipientUserId}:${input.leadDays}`,
      },
    });
  }
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
