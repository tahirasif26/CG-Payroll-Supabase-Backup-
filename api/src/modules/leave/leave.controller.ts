import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { RbacService } from '@modules/rbac/rbac.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { LeaveService } from './leave.service';
import {
  createHolidaySchema,
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  decideLeaveRequestSchema,
  listBalancesQuerySchema,
  listHolidaysQuerySchema,
  listRequestsQuerySchema,
  updateHolidaySchema,
  updateLeaveTypeSchema,
  upsertBalanceSchema,
  type CreateHolidayDto,
  type CreateLeaveRequestDto,
  type CreateLeaveTypeDto,
  type DecideLeaveRequestDto,
  type ListBalancesQuery,
  type ListHolidaysQuery,
  type ListRequestsQuery,
  type UpdateHolidayDto,
  type UpdateLeaveTypeDto,
  type UpsertBalanceDto,
} from './dto/leave.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('leave')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller()
export class LeaveController {
  constructor(
    private readonly leave: LeaveService,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Leave types ──────────────────────────────────────────────────────

  @Get('leave-types')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'List leave types for the active client' })
  listTypes(@ActiveClientId() clientId: string) {
    return this.leave.listTypes(clientId);
  }

  @Post('leave-types')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Create a leave type' })
  createType(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createLeaveTypeSchema)) dto: CreateLeaveTypeDto,
  ) {
    return this.leave.createType(clientId, dto);
  }

  @Patch('leave-types/:id')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Update a leave type' })
  updateType(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateLeaveTypeSchema)) dto: UpdateLeaveTypeDto,
  ) {
    return this.leave.updateType(clientId, id, dto);
  }

  @Delete('leave-types/:id')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Soft-delete a leave type (isActive=false)' })
  deleteType(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.leave.deleteType(clientId, id);
  }

  // ─── Balances ─────────────────────────────────────────────────────────

  @Get('leave-balances')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'List leave balances (filter by employee/type/year)' })
  listBalances(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listBalancesQuerySchema)) query: ListBalancesQuery,
  ) {
    return this.leave.listBalances(clientId, query);
  }

  @Post('leave-balances')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Upsert a leave balance row' })
  upsertBalance(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(upsertBalanceSchema)) dto: UpsertBalanceDto,
  ) {
    return this.leave.upsertBalance(clientId, dto);
  }

  // ─── Requests ─────────────────────────────────────────────────────────

  @Get('leave-requests')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'List leave requests (default scope: caller, admin/hr can see all)' })
  async listRequests(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listRequestsQuerySchema)) query: ListRequestsQuery,
  ) {
    const callerEmployeeId = await this.resolveCallerEmployeeId(user.id, clientId);
    const canSeeAll =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.leave.listRequests(clientId, callerEmployeeId, query, canSeeAll);
  }

  @Post('leave-requests')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'Submit a leave request (employee; admin/hr may submit for others)' })
  async createRequest(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createLeaveRequestSchema)) dto: CreateLeaveRequestDto,
  ) {
    const callerEmployeeId = await this.resolveCallerEmployeeId(user.id, clientId);
    const canSubmitForOthers =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.leave.createRequest(clientId, callerEmployeeId, dto, canSubmitForOthers);
  }

  @Post('leave-requests/:id/decision')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Approve or reject a pending leave request' })
  async decide(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(decideLeaveRequestSchema)) dto: DecideLeaveRequestDto,
  ) {
    const decidingEmployeeId = await this.resolveCallerEmployeeId(user.id, clientId);
    return this.leave.decide(clientId, id, decidingEmployeeId, dto);
  }

  @Post('leave-requests/:id/cancel')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'Cancel your own pending leave request' })
  async cancel(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const callerEmployeeId = await this.resolveCallerEmployeeId(user.id, clientId);
    return this.leave.cancel(clientId, id, callerEmployeeId);
  }

  // ─── Holidays ─────────────────────────────────────────────────────────

  @Get('holidays')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'List holidays' })
  listHolidays(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listHolidaysQuerySchema)) query: ListHolidaysQuery,
  ) {
    return this.leave.listHolidays(clientId, query);
  }

  @Post('holidays')
  @Roles('super_admin', 'admin', 'hr')
  createHoliday(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createHolidaySchema)) dto: CreateHolidayDto,
  ) {
    return this.leave.createHoliday(clientId, dto);
  }

  @Patch('holidays/:id')
  @Roles('super_admin', 'admin', 'hr')
  updateHoliday(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateHolidaySchema)) dto: UpdateHolidayDto,
  ) {
    return this.leave.updateHoliday(clientId, id, dto);
  }

  @Delete('holidays/:id')
  @Roles('super_admin', 'admin', 'hr')
  deleteHoliday(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.leave.deleteHoliday(clientId, id);
  }

  // ─── Internal helper ──────────────────────────────────────────────────

  /** Looks up the caller's Employee.id in the active client (null for super_admin / orphan). */
  private async resolveCallerEmployeeId(userId: string, clientId: string): Promise<string | null> {
    const emp = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
}
