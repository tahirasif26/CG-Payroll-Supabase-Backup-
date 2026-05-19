import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, LoanTxnType, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  AdjustLoanDto,
  ApproveLoanDto,
  CreateLoanDto,
  ListLoansQuery,
  PauseLoanDto,
  UpdateLoanDto,
} from './dto/loan.schemas';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    clientId: string,
    callerEmployeeId: string | null,
    query: ListLoansQuery,
    canSeeAll: boolean,
  ) {
    const scope = query.scope ?? (canSeeAll ? 'all' : 'mine');
    if (scope === 'mine' && !callerEmployeeId) return emptyPage(query);
    const where: Prisma.LoanWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as LoanStatus } : {}),
      ...(query.employeeId
        ? { employeeId: query.employeeId }
        : scope === 'mine'
          ? { employeeId: callerEmployeeId! }
          : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { firstName: true, lastName: true, empId: true } } },
        skip,
        take,
      }),
      this.prisma.loan.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(clientId: string, id: string) {
    const l = await this.prisma.loan.findFirst({
      where: { id, clientId },
      include: {
        employee: true,
        transactions: { orderBy: { date: 'desc' } },
      },
    });
    if (!l) throw notFound();
    return l;
  }

  async create(clientId: string, dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: {
        clientId,
        employeeId: dto.employeeId,
        principal: dto.principal,
        remainingBalance: dto.principal,
        monthlyDeduction: dto.monthlyDeduction,
        interestRateBps: dto.interestRateBps,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        reason: dto.reason ?? null,
        status: LoanStatus.draft,
      },
    });
  }

  async update(clientId: string, id: string, dto: UpdateLoanDto) {
    const l = await this.findById(clientId, id);
    if (l.status !== LoanStatus.draft) {
      throw new BadRequestException({
        code: 'NOT_EDITABLE',
        message: 'Only draft loans can be edited',
      });
    }
    return this.prisma.loan.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.principal !== undefined ? { remainingBalance: dto.principal } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
      },
    });
  }

  /**
   * Approval flips status to `active` and records a `disbursement` transaction
   * equal to the principal. Rejection sets status to `cancelled`.
   */
  async approve(
    clientId: string,
    id: string,
    decidingEmployeeId: string | null,
    dto: ApproveLoanDto,
  ) {
    const l = await this.findById(clientId, id);
    if (l.status !== LoanStatus.draft) {
      throw new BadRequestException({
        code: 'NOT_PENDING',
        message: 'Only draft loans can be approved or rejected',
      });
    }
    if (dto.decision === 'reject') {
      return this.prisma.loan.update({
        where: { id },
        data: { status: LoanStatus.cancelled },
      });
    }
    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.active,
          approvedById: decidingEmployeeId,
          approvedAt: new Date(),
        },
      }),
      this.prisma.loanTransaction.create({
        data: {
          loanId: id,
          clientId,
          type: LoanTxnType.disbursement,
          amount: l.principal,
          balanceAfter: l.principal,
          emiAtTime: l.monthlyDeduction,
          date: new Date(),
          note: 'Loan approved and disbursed',
        },
      }),
    ]);
    return this.findById(clientId, id);
  }

  async pause(clientId: string, id: string, dto: PauseLoanDto) {
    const l = await this.findById(clientId, id);
    if (l.status !== LoanStatus.active) {
      throw new BadRequestException({ code: 'NOT_ACTIVE', message: 'Only active loans can be paused' });
    }
    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.paused,
          pausedUntil: new Date(dto.until),
          prePauseEmi: l.monthlyDeduction,
          monthlyDeduction: BigInt(0),
        },
      }),
      this.prisma.loanTransaction.create({
        data: {
          loanId: id,
          clientId,
          type: LoanTxnType.pause,
          amount: BigInt(0),
          balanceAfter: l.remainingBalance,
          emiAtTime: l.monthlyDeduction,
          date: new Date(),
          note: dto.reason ?? `Paused until ${dto.until}`,
        },
      }),
    ]);
    return this.findById(clientId, id);
  }

  async resume(clientId: string, id: string) {
    const l = await this.findById(clientId, id);
    if (l.status !== LoanStatus.paused) {
      throw new BadRequestException({ code: 'NOT_PAUSED', message: 'Only paused loans can be resumed' });
    }
    const restoredEmi = l.prePauseEmi ?? BigInt(0);
    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.active,
          pausedUntil: null,
          monthlyDeduction: restoredEmi,
          prePauseEmi: null,
        },
      }),
      this.prisma.loanTransaction.create({
        data: {
          loanId: id,
          clientId,
          type: LoanTxnType.resume,
          amount: BigInt(0),
          balanceAfter: l.remainingBalance,
          emiAtTime: restoredEmi,
          date: new Date(),
          note: 'Loan resumed',
        },
      }),
    ]);
    return this.findById(clientId, id);
  }

  /**
   * Record an EMI / prepayment / writeoff / adjustment. The balance moves by
   * `amount` (or to zero on writeoff). When the new balance hits zero the loan
   * is marked `completed`.
   */
  async adjust(clientId: string, id: string, dto: AdjustLoanDto) {
    const l = await this.findById(clientId, id);
    if (l.status !== LoanStatus.active && l.status !== LoanStatus.paused) {
      throw new BadRequestException({
        code: 'NOT_OPEN',
        message: 'Only active or paused loans can be adjusted',
      });
    }

    let newBalance: bigint;
    if (dto.type === LoanTxnType.writeoff) {
      newBalance = BigInt(0);
    } else if (dto.type === LoanTxnType.adjustment) {
      // Adjustment is a positive (debit) or negative (credit) delta against balance.
      newBalance = l.remainingBalance + dto.amount;
    } else {
      // emi or prepayment reduce balance
      newBalance = l.remainingBalance - dto.amount;
    }
    if (newBalance < BigInt(0)) newBalance = BigInt(0);

    const becomesCompleted = newBalance === BigInt(0) && l.status === LoanStatus.active;

    await this.prisma.$transaction([
      this.prisma.loanTransaction.create({
        data: {
          loanId: id,
          clientId,
          type: dto.type as LoanTxnType,
          amount: dto.amount,
          balanceAfter: newBalance,
          emiAtTime: l.monthlyDeduction,
          date: new Date(dto.date),
          note: dto.note,
        },
      }),
      this.prisma.loan.update({
        where: { id },
        data: {
          remainingBalance: newBalance,
          ...(becomesCompleted ? { status: LoanStatus.completed } : {}),
        },
      }),
    ]);
    return this.findById(clientId, id);
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
  return new NotFoundException({ code: 'LOAN_NOT_FOUND', message: 'Loan not found' });
}
