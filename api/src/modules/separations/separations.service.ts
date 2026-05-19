import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma, SeparationStatus, SeparationType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import { calculateEosb, type SupportedEosbCountry, type SeparationReason } from './eosb';
import type {
  CreateSeparationDto,
  EosbCalcDto,
  ListSeparationsQuery,
} from './dto/separation.schemas';

@Injectable()
export class SeparationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string, query: ListSeparationsQuery) {
    const where: Prisma.SeparationWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as SeparationStatus } : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.separation.findMany({
        where,
        orderBy: { lastWorkingDate: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, empId: true } },
        },
        skip,
        take,
      }),
      this.prisma.separation.count({ where }),
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

  async findById(clientId: string, id: string) {
    const s = await this.prisma.separation.findFirst({
      where: { id, clientId },
      include: { employee: true },
    });
    if (!s) throw new NotFoundException({ code: 'SEPARATION_NOT_FOUND', message: 'Separation not found' });
    return s;
  }

  /** Pure preview — does not persist. Useful for the FE wizard. */
  previewEosb(dto: EosbCalcDto) {
    const result = calculateEosb(dto.country as SupportedEosbCountry, {
      lastBasic: dto.lastBasic,
      joiningDate: dto.joiningDate,
      lastWorkingDate: dto.lastWorkingDate,
      reason: dto.reason as SeparationReason,
    });
    return {
      amount: result.amount.toString(),
      breakdown: {
        ...result.breakdown,
        components: result.breakdown.components.map((c) => ({
          label: c.label,
          amount: c.amount.toString(),
        })),
      },
    };
  }

  async create(clientId: string, dto: CreateSeparationDto) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, clientId },
      select: { id: true, joiningDate: true, workLocationCountry: true, compensation: { where: { effectiveTo: null } } },
    });
    if (!emp) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' });
    }
    if (!emp.joiningDate) {
      throw new BadRequestException({
        code: 'NO_JOINING_DATE',
        message: 'Employee has no joining date — cannot compute EOSB',
      });
    }

    const baseRow = emp.compensation.find((c) => c.componentType === 'base');
    const lastBasic = baseRow ? baseRow.amount : BigInt(0);

    // EOSB is computed only for KSA / UAE in Phase 7; other countries get 0.
    const country = (emp.workLocationCountry ?? '').toUpperCase();
    let eosbAmount = BigInt(0);
    let eosbBreakdown: Prisma.InputJsonValue = {};
    if (country === 'SA' || country === 'AE') {
      const r = calculateEosb(country as SupportedEosbCountry, {
        lastBasic,
        joiningDate: emp.joiningDate.toISOString().slice(0, 10),
        lastWorkingDate: dto.lastWorkingDate,
        reason: dto.type as SeparationReason,
      });
      eosbAmount = r.amount;
      eosbBreakdown = {
        yearsOfService: r.breakdown.yearsOfService,
        components: r.breakdown.components.map((c) => ({
          label: c.label,
          amountMinor: c.amount.toString(),
        })),
        notes: r.breakdown.notes,
      };
    }

    const totalSettlement =
      eosbAmount +
      (dto.unpaidSalaryMinor ?? BigInt(0)) +
      (dto.leaveEncashmentMinor ?? BigInt(0)) +
      (dto.noticePeriodPayMinor ?? BigInt(0)) -
      (dto.loanDeductionMinor ?? BigInt(0));

    return this.prisma.separation.create({
      data: {
        clientId,
        employeeId: dto.employeeId,
        lastWorkingDate: new Date(dto.lastWorkingDate),
        reason: dto.reason ?? null,
        type: dto.type as SeparationType,
        noticePeriodDays: dto.noticePeriodDays,
        noticePeriodServed: dto.noticePeriodServed,
        unpaidSalaryMinor: dto.unpaidSalaryMinor ?? BigInt(0),
        eosbAmountMinor: eosbAmount,
        eosbBreakdown,
        leaveEncashmentMinor: dto.leaveEncashmentMinor ?? BigInt(0),
        noticePeriodPayMinor: dto.noticePeriodPayMinor ?? BigInt(0),
        loanDeductionMinor: dto.loanDeductionMinor ?? BigInt(0),
        totalSettlementMinor: totalSettlement,
      },
    });
  }

  async approve(clientId: string, id: string, userId: string) {
    const s = await this.findById(clientId, id);
    if (s.status !== SeparationStatus.pending) {
      throw new BadRequestException({
        code: 'NOT_PENDING',
        message: 'Only pending separations can be approved',
      });
    }
    return this.prisma.separation.update({
      where: { id },
      data: { status: SeparationStatus.approved, approvedByUserId: userId },
    });
  }

  /** Mark processed + flip employee.status. Optionally records the payroll_run_id. */
  async process(clientId: string, id: string, payrollRunId?: string) {
    const s = await this.findById(clientId, id);
    if (s.status !== SeparationStatus.approved) {
      throw new BadRequestException({
        code: 'NOT_APPROVED',
        message: 'Only approved separations can be processed',
      });
    }
    await this.prisma.$transaction([
      this.prisma.separation.update({
        where: { id },
        data: {
          status: SeparationStatus.processed,
          processedDate: new Date(),
          payrollRunId: payrollRunId ?? null,
        },
      }),
      this.prisma.employee.update({
        where: { id: s.employeeId },
        data: { status: EmployeeStatus.separated, separationDate: s.lastWorkingDate },
      }),
    ]);
    return this.findById(clientId, id);
  }
}
