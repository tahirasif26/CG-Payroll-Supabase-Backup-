import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  CreateHolidayDto,
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  DecideLeaveRequestDto,
  ListBalancesQuery,
  ListHolidaysQuery,
  ListRequestsQuery,
  UpdateHolidayDto,
  UpdateLeaveTypeDto,
  UpsertBalanceDto,
} from './dto/leave.schemas';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Leave types ──────────────────────────────────────────────────────

  listTypes(clientId: string) {
    return this.prisma.leaveType.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  createType(clientId: string, dto: CreateLeaveTypeDto) {
    return this.prisma.leaveType.create({ data: { ...dto, clientId } });
  }

  async updateType(clientId: string, id: string, dto: UpdateLeaveTypeDto) {
    await this.ensureTypeInClient(clientId, id);
    return this.prisma.leaveType.update({ where: { id }, data: dto });
  }

  async deleteType(clientId: string, id: string) {
    await this.ensureTypeInClient(clientId, id);
    // Soft delete via isActive=false to preserve historical request linkage.
    return this.prisma.leaveType.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Balances ─────────────────────────────────────────────────────────

  listBalances(clientId: string, query: ListBalancesQuery) {
    return this.prisma.leaveBalance.findMany({
      where: {
        clientId,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
        ...(query.year ? { year: query.year } : {}),
      },
      include: { leaveType: true },
      orderBy: [{ year: 'desc' }, { leaveType: { name: 'asc' } }],
    });
  }

  upsertBalance(clientId: string, dto: UpsertBalanceDto) {
    return this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
      update: {
        ...(dto.allocated !== undefined ? { allocated: dto.allocated } : {}),
        ...(dto.used !== undefined ? { used: dto.used } : {}),
        ...(dto.carriedForward !== undefined ? { carriedForward: dto.carriedForward } : {}),
      },
      create: {
        clientId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        allocated: dto.allocated ?? '0',
        used: dto.used ?? '0',
        carriedForward: dto.carriedForward ?? '0',
      },
    });
  }

  // ─── Requests ─────────────────────────────────────────────────────────

  async listRequests(
    clientId: string,
    callerEmployeeId: string | null,
    query: ListRequestsQuery,
    canSeeAll: boolean,
  ) {
    const scope = query.scope ?? (canSeeAll ? 'all' : 'mine');
    if (scope === 'mine' && !callerEmployeeId) {
      return {
        data: [],
        meta: {
          pagination: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 },
        },
      };
    }
    const where: Prisma.LeaveRequestWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as LeaveRequestStatus } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
      ...(query.employeeId
        ? { employeeId: query.employeeId }
        : scope === 'mine'
          ? { employeeId: callerEmployeeId! }
          : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { leaveType: true, employee: { select: { firstName: true, lastName: true, empId: true } } },
        skip,
        take,
      }),
      this.prisma.leaveRequest.count({ where }),
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

  async createRequest(
    clientId: string,
    callerEmployeeId: string | null,
    dto: CreateLeaveRequestDto,
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
        message: 'Only admin / HR may submit leave on behalf of another employee',
      });
    }
    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'startDate must be on or before endDate',
      });
    }

    return this.prisma.leaveRequest.create({
      data: {
        clientId,
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days: dto.days,
        reason: dto.reason,
        status: LeaveRequestStatus.pending,
      },
    });
  }

  /**
   * Manual approval path for Phase 4. Full multi-level approval lands in
   * Phase 5 — at that point this controller delegates to the approval engine
   * instead of flipping status directly.
   */
  async decide(
    clientId: string,
    id: string,
    decidingEmployeeId: string | null,
    dto: DecideLeaveRequestDto,
  ) {
    const req = await this.prisma.leaveRequest.findFirst({ where: { id, clientId } });
    if (!req) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Leave request not found' });
    if (req.status !== LeaveRequestStatus.pending) {
      throw new BadRequestException({
        code: 'REQUEST_NOT_PENDING',
        message: 'This leave request is no longer pending',
      });
    }
    if (dto.decision === 'reject' && !dto.rejectionReason) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'rejectionReason is required when rejecting',
      });
    }

    if (dto.decision === 'approve') {
      // Bump the balance.used for the current year. Idempotent via the unique key.
      const year = new Date(req.startDate).getFullYear();
      await this.prisma.$transaction([
        this.prisma.leaveRequest.update({
          where: { id },
          data: {
            status: LeaveRequestStatus.approved,
            approvedById: decidingEmployeeId,
            approvedAt: new Date(),
          },
        }),
        this.prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: req.employeeId,
              leaveTypeId: req.leaveTypeId,
              year,
            },
          },
          update: { used: { increment: req.days } },
          create: {
            clientId,
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year,
            allocated: '0',
            used: req.days,
          },
        }),
      ]);
    } else {
      await this.prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.rejected,
          approvedById: decidingEmployeeId,
          approvedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
      });
    }

    return this.prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
  }

  async cancel(clientId: string, id: string, callerEmployeeId: string | null) {
    const req = await this.prisma.leaveRequest.findFirst({ where: { id, clientId } });
    if (!req) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Leave request not found' });
    if (callerEmployeeId !== req.employeeId) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: 'Only the requester may cancel their own leave request',
      });
    }
    if (req.status !== LeaveRequestStatus.pending) {
      throw new BadRequestException({
        code: 'REQUEST_NOT_PENDING',
        message: 'Only pending requests can be cancelled',
      });
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.cancelled },
    });
  }

  // ─── Holidays ─────────────────────────────────────────────────────────

  listHolidays(clientId: string, query: ListHolidaysQuery) {
    const where: Prisma.HolidayWhereInput = { clientId };
    if (query.year) {
      where.date = {
        gte: new Date(`${query.year}-01-01`),
        lt: new Date(`${query.year + 1}-01-01`),
      };
    }
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return this.prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
  }

  createHoliday(clientId: string, dto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: { ...dto, clientId, date: new Date(dto.date) },
    });
  }

  async updateHoliday(clientId: string, id: string, dto: UpdateHolidayDto) {
    await this.ensureHolidayInClient(clientId, id);
    return this.prisma.holiday.update({
      where: { id },
      data: { ...dto, ...(dto.date ? { date: new Date(dto.date) } : {}) },
    });
  }

  async deleteHoliday(clientId: string, id: string) {
    await this.ensureHolidayInClient(clientId, id);
    return this.prisma.holiday.delete({ where: { id } });
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async ensureTypeInClient(clientId: string, id: string) {
    const t = await this.prisma.leaveType.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!t) throw new NotFoundException({ code: 'LEAVE_TYPE_NOT_FOUND', message: 'Leave type not found' });
  }

  private async ensureHolidayInClient(clientId: string, id: string) {
    const h = await this.prisma.holiday.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!h) throw new NotFoundException({ code: 'HOLIDAY_NOT_FOUND', message: 'Holiday not found' });
  }
}
