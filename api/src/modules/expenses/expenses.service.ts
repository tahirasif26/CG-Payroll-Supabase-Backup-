import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppRole, ExpenseStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { TypedConfigService } from '@config/typed-config.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  CreateExpenseDto,
  DecideExpenseDto,
  ListExpensesQuery,
  UpdateExpenseDto,
} from './dto/expense.schemas';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: TypedConfigService,
  ) {}

  async list(
    clientId: string,
    callerEmployeeId: string | null,
    query: ListExpensesQuery,
    canSeeAll: boolean,
  ) {
    const scope = query.scope ?? (canSeeAll ? 'all' : 'mine');
    if (scope === 'mine' && !callerEmployeeId) {
      return emptyPage(query);
    }
    const where: Prisma.ExpenseWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as ExpenseStatus } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.employeeId
        ? { employeeId: query.employeeId }
        : scope === 'mine'
          ? { employeeId: callerEmployeeId! }
          : {}),
      ...(query.from || query.to
        ? {
            expenseDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
              { projectCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: { employee: { select: { firstName: true, lastName: true, empId: true } } },
        skip,
        take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(clientId: string, id: string) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, clientId },
      include: { employee: true },
    });
    if (!exp) throw notFound();
    return exp;
  }

  async create(
    clientId: string,
    callerEmployeeId: string | null,
    dto: CreateExpenseDto,
    canSubmitForOthers: boolean,
  ) {
    const employeeId = dto.employeeId ?? callerEmployeeId;
    if (!employeeId) {
      throw new BadRequestException({
        code: 'NO_EMPLOYEE_CONTEXT',
        message: 'Caller has no employee record and no employeeId provided',
      });
    }
    if (dto.employeeId && dto.employeeId !== callerEmployeeId && !canSubmitForOthers) {
      throw new ForbiddenException({
        code: 'CANNOT_SUBMIT_FOR_OTHERS',
        message: 'Only admin / HR may file expenses on behalf of others',
      });
    }
    return this.prisma.expense.create({
      data: {
        clientId,
        employeeId,
        category: dto.category ?? null,
        amount: dto.amount,
        currency: dto.currency,
        expenseDate: new Date(dto.expenseDate),
        description: dto.description ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        projectCode: dto.projectCode ?? null,
        status: dto.status as ExpenseStatus,
      },
    });
  }

  async update(clientId: string, id: string, dto: UpdateExpenseDto) {
    const exp = await this.findById(clientId, id);
    if (exp.status !== ExpenseStatus.draft && exp.status !== ExpenseStatus.rejected) {
      throw new BadRequestException({
        code: 'NOT_EDITABLE',
        message: 'Only draft or rejected expenses can be edited',
      });
    }
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.expenseDate ? { expenseDate: new Date(dto.expenseDate) } : {}),
      },
    });
  }

  async submit(clientId: string, id: string) {
    const exp = await this.findById(clientId, id);
    if (exp.status !== ExpenseStatus.draft && exp.status !== ExpenseStatus.rejected) {
      throw new BadRequestException({
        code: 'NOT_SUBMITTABLE',
        message: 'Only draft or rejected expenses can be submitted',
      });
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.submitted, rejectionReason: null },
    });

    const submittedByName = exp.employee
      ? `${exp.employee.firstName} ${exp.employee.lastName}`.trim() || 'A colleague'
      : 'A colleague';
    await this.notifyApprovers({
      clientId,
      requestId: updated.id,
      submittedByName,
      detail:
        `${updated.currency} ${formatMinor(updated.amount)}` +
        (updated.category ? ` — ${updated.category}` : ''),
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
      const reviewUrl = `${this.config.get('FRONTEND_URL')}/expenses/${input.requestId}`;
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
            requestType: 'expense',
            submittedByName: input.submittedByName,
            detail: input.detail,
            reviewUrl,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify expense approvers: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async decide(
    clientId: string,
    id: string,
    decidingEmployeeId: string | null,
    dto: DecideExpenseDto,
  ) {
    const exp = await this.findById(clientId, id);
    if (exp.status !== ExpenseStatus.submitted) {
      throw new BadRequestException({
        code: 'NOT_SUBMITTED',
        message: 'Only submitted expenses can be approved or rejected',
      });
    }
    if (dto.decision === 'reject' && !dto.rejectionReason) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'rejectionReason is required when rejecting',
      });
    }
    return this.prisma.expense.update({
      where: { id },
      data:
        dto.decision === 'approve'
          ? {
              status: ExpenseStatus.approved,
              approvedById: decidingEmployeeId,
              approvedAt: new Date(),
            }
          : {
              status: ExpenseStatus.rejected,
              approvedById: decidingEmployeeId,
              approvedAt: new Date(),
              rejectionReason: dto.rejectionReason,
            },
    });
  }

  async markPaid(clientId: string, id: string) {
    const exp = await this.findById(clientId, id);
    if (exp.status !== ExpenseStatus.approved) {
      throw new BadRequestException({
        code: 'NOT_APPROVED',
        message: 'Only approved expenses can be marked paid',
      });
    }
    return this.prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.paid, paidAt: new Date() },
    });
  }

  async delete(clientId: string, id: string) {
    const exp = await this.findById(clientId, id);
    if (exp.status === ExpenseStatus.paid || exp.status === ExpenseStatus.approved) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE',
        message: 'Approved or paid expenses cannot be deleted',
      });
    }
    return this.prisma.expense.delete({ where: { id } });
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
  return new NotFoundException({ code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' });
}

function formatMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const major = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${major.toString()}.${cents}`;
}
