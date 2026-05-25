import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdvanceStatus, AppRole, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { TypedConfigService } from '@config/typed-config.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  CreateAdvanceDto,
  DecideAdvanceDto,
  ListAdvancesQuery,
  SettleAdvanceDto,
  UpdateAdvanceDto,
} from './dto/advance.schemas';

@Injectable()
export class AdvancesService {
  private readonly logger = new Logger(AdvancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: TypedConfigService,
  ) {}

  async list(
    clientId: string,
    callerEmployeeId: string | null,
    query: ListAdvancesQuery,
    canSeeAll: boolean,
  ) {
    const scope = query.scope ?? (canSeeAll ? 'all' : 'mine');
    if (scope === 'mine' && !callerEmployeeId) return emptyPage(query);

    const where: Prisma.AdvanceWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as AdvanceStatus } : {}),
      ...(query.employeeId
        ? { employeeId: query.employeeId }
        : scope === 'mine'
          ? { employeeId: callerEmployeeId! }
          : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { purpose: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.advance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { firstName: true, lastName: true, empId: true } } },
        skip,
        take,
      }),
      this.prisma.advance.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(clientId: string, id: string) {
    const a = await this.prisma.advance.findFirst({
      where: { id, clientId },
      include: { employee: true },
    });
    if (!a) throw notFound();
    return a;
  }

  async create(
    clientId: string,
    callerEmployeeId: string | null,
    dto: CreateAdvanceDto,
    canForOthers: boolean,
  ) {
    const employeeId = dto.employeeId ?? callerEmployeeId;
    if (!employeeId) {
      throw new BadRequestException({
        code: 'NO_EMPLOYEE_CONTEXT',
        message: 'No employeeId provided and caller has no employee record',
      });
    }
    if (dto.employeeId && dto.employeeId !== callerEmployeeId && !canForOthers) {
      throw new ForbiddenException({
        code: 'CANNOT_SUBMIT_FOR_OTHERS',
        message: 'Only admin / HR may file advances on behalf of others',
      });
    }
    return this.prisma.advance.create({
      data: {
        clientId,
        employeeId,
        name: dto.name,
        purpose: dto.purpose ?? null,
        amount: dto.amount,
        currency: dto.currency,
        expectedSpendDate: dto.expectedSpendDate ? new Date(dto.expectedSpendDate) : null,
        settlementDueDate: dto.settlementDueDate ? new Date(dto.settlementDueDate) : null,
        notes: dto.notes ?? null,
        status: dto.status as AdvanceStatus,
      },
    });
  }

  async update(clientId: string, id: string, dto: UpdateAdvanceDto) {
    const a = await this.findById(clientId, id);
    if (a.status !== AdvanceStatus.draft && a.status !== AdvanceStatus.rejected) {
      throw new BadRequestException({
        code: 'NOT_EDITABLE',
        message: 'Only draft or rejected advances can be edited',
      });
    }
    return this.prisma.advance.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.expectedSpendDate !== undefined
          ? { expectedSpendDate: dto.expectedSpendDate ? new Date(dto.expectedSpendDate) : null }
          : {}),
        ...(dto.settlementDueDate !== undefined
          ? { settlementDueDate: dto.settlementDueDate ? new Date(dto.settlementDueDate) : null }
          : {}),
      },
    });
  }

  async submit(clientId: string, id: string) {
    const a = await this.findById(clientId, id);
    if (a.status !== AdvanceStatus.draft && a.status !== AdvanceStatus.rejected) {
      throw new BadRequestException({
        code: 'NOT_SUBMITTABLE',
        message: 'Only draft or rejected advances can be submitted',
      });
    }
    const updated = await this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.submitted, rejectionReason: null },
    });

    const submittedByName = a.employee
      ? `${a.employee.firstName} ${a.employee.lastName}`.trim() || 'A colleague'
      : 'A colleague';
    await this.notifyApprovers({
      clientId,
      requestId: updated.id,
      submittedByName,
      detail: `${updated.currency} ${formatMinor(updated.amount)} — ${updated.name}`,
    });

    return updated;
  }

  private async notifyApprovers(input: {
    clientId: string;
    requestId: string;
    submittedByName: string;
    detail: string;
  }): Promise<void> {
    try {
      const approvers = await this.prisma.user.findMany({
        where: {
          status: UserStatus.active,
          userRoles: {
            some: {
              clientId: input.clientId,
              role: { appRole: { in: [AppRole.admin, AppRole.hr] } },
            },
          },
        },
        select: { email: true, profile: { select: { fullName: true } } },
      });
      const reviewUrl = `${this.config.get('FRONTEND_URL')}/advances/${input.requestId}`;
      const seen = new Set<string>();
      const recipients = approvers.filter((a) => {
        if (seen.has(a.email)) return false;
        seen.add(a.email);
        return true;
      });
      await Promise.all(
        recipients.map((a) =>
          this.mail.sendApprovalNotification({
            to: a.email,
            approverName: a.profile?.fullName ?? null,
            requestType: 'advance',
            submittedByName: input.submittedByName,
            detail: input.detail,
            reviewUrl,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify advance approvers: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async decide(
    clientId: string,
    id: string,
    decidingEmployeeId: string | null,
    dto: DecideAdvanceDto,
  ) {
    const a = await this.findById(clientId, id);
    if (a.status !== AdvanceStatus.submitted) {
      throw new BadRequestException({
        code: 'NOT_SUBMITTED',
        message: 'Only submitted advances can be approved or rejected',
      });
    }
    if (dto.decision === 'reject' && !dto.rejectionReason) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'rejectionReason is required when rejecting',
      });
    }
    return this.prisma.advance.update({
      where: { id },
      data:
        dto.decision === 'approve'
          ? {
              status: AdvanceStatus.approved,
              approvedById: decidingEmployeeId,
              approvedAt: new Date(),
            }
          : {
              status: AdvanceStatus.rejected,
              approvedById: decidingEmployeeId,
              approvedAt: new Date(),
              rejectionReason: dto.rejectionReason,
            },
    });
  }

  async settle(clientId: string, id: string, dto: SettleAdvanceDto) {
    const a = await this.findById(clientId, id);
    if (a.status !== AdvanceStatus.approved) {
      throw new BadRequestException({
        code: 'NOT_APPROVED',
        message: 'Only approved advances can be settled',
      });
    }
    return this.prisma.advance.update({
      where: { id },
      data: {
        status: AdvanceStatus.settled,
        settledAt: new Date(),
        ...(dto.amountUsed !== undefined ? { amountUsed: dto.amountUsed } : {}),
      },
    });
  }

  async cancel(clientId: string, id: string) {
    const a = await this.findById(clientId, id);
    if (a.status === AdvanceStatus.settled) {
      throw new BadRequestException({
        code: 'ALREADY_SETTLED',
        message: 'Settled advances cannot be cancelled',
      });
    }
    return this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.cancelled },
    });
  }
}

function paginate<T>(items: T[], total: number, query: { page: number; pageSize: number }) {
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
function emptyPage(query: { page: number; pageSize: number }) {
  return paginate([], 0, query);
}
function notFound() {
  return new NotFoundException({ code: 'ADVANCE_NOT_FOUND', message: 'Advance not found' });
}

function formatMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const major = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${major.toString()}.${cents}`;
}
