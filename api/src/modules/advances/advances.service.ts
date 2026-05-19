import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdvanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.submitted, rejectionReason: null },
    });
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
