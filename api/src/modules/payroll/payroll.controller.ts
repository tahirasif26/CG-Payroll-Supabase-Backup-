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
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { PayrollService } from './payroll.service';
import {
  createPayrollRunSchema,
  createPayrollSetupSchema,
  listPayrollRunsQuerySchema,
  oneOffAdjustmentSchema,
  updatePayrollSetupSchema,
  type CreatePayrollRunDto,
  type CreatePayrollSetupDto,
  type ListPayrollRunsQuery,
  type OneOffAdjustmentDto,
  type UpdatePayrollSetupDto,
} from './dto/payroll.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('payroll')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller()
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Setups ───────────────────────────────────────────────────────────

  @Get('payroll-setups')
  @Roles('super_admin', 'admin', 'hr')
  listSetups(@ActiveClientId() clientId: string) {
    return this.payroll.listSetups(clientId);
  }

  @Get('payroll-setups/:id')
  @Roles('super_admin', 'admin', 'hr')
  findSetup(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.payroll.findSetup(clientId, id);
  }

  @Post('payroll-setups')
  @Roles('super_admin', 'admin')
  createSetup(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPayrollSetupSchema)) dto: CreatePayrollSetupDto,
  ) {
    return this.payroll.createSetup(clientId, user.id, dto);
  }

  @Patch('payroll-setups/:id')
  @Roles('super_admin', 'admin')
  updateSetup(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePayrollSetupSchema)) dto: UpdatePayrollSetupDto,
  ) {
    return this.payroll.updateSetup(clientId, id, dto);
  }

  @Delete('payroll-setups/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({
    summary: 'Hard delete (refused if payroll runs exist for this setup)',
  })
  deleteSetup(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.payroll.deleteSetup(clientId, id);
  }

  // ─── Runs ─────────────────────────────────────────────────────────────

  @Get('payroll-runs')
  @Roles('super_admin', 'admin', 'hr')
  listRuns(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listPayrollRunsQuerySchema)) query: ListPayrollRunsQuery,
  ) {
    return this.payroll.listRuns(clientId, query);
  }

  @Get('payroll-runs/:id')
  @Roles('super_admin', 'admin', 'hr')
  findRun(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.payroll.findRun(clientId, id);
  }

  @Post('payroll-runs')
  @Roles('super_admin', 'admin')
  createRun(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPayrollRunSchema)) dto: CreatePayrollRunDto,
  ) {
    return this.payroll.createRun(clientId, user.id, dto);
  }

  @Post('payroll-runs/:id/calculate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Compute all payroll lines (idempotent on draft/calculated)' })
  calculate(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.payroll.calculateRun(clientId, id);
  }

  @Post('payroll-runs/:id/submit')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Submit calculated run for approval via the approvals engine' })
  async submit(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const emp = await this.prisma.employee.findFirst({
      where: { userId: user.id, clientId },
      select: { id: true },
    });
    return this.payroll.submitForApproval(clientId, id, emp?.id ?? null);
  }

  @Post('payroll-runs/:id/finalize-approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Mark approved and lock (called after approval engine finalises)' })
  finalizeApprove(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.payroll.finalizeApprove(clientId, id, user.id);
  }

  @Post('payroll-runs/:id/complete')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Mark approved run as paid / completed' })
  complete(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.payroll.completeRun(clientId, id);
  }

  // ─── One-off adjustments ──────────────────────────────────────────────

  @Post('payroll-runs/:id/one-offs')
  @Roles('super_admin', 'admin', 'hr')
  addOneOff(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(oneOffAdjustmentSchema)) dto: OneOffAdjustmentDto,
  ) {
    return this.payroll.addOneOff(clientId, id, user.id, dto);
  }

  @Delete('payroll-runs/:id/one-offs/:oneOffId')
  @Roles('super_admin', 'admin', 'hr')
  removeOneOff(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('oneOffId', new ParseUUIDPipe()) oneOffId: string,
  ) {
    return this.payroll.removeOneOff(clientId, id, oneOffId);
  }

  // ─── Payslips ─────────────────────────────────────────────────────────

  @Get('payslips/mine')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async listMyPayslips(@ActiveClientId() clientId: string, @CurrentUser() user: RequestUser) {
    const emp = await this.prisma.employee.findFirst({
      where: { userId: user.id, clientId },
      select: { id: true },
    });
    if (!emp) return [];
    return this.payroll.listMyPayslips(clientId, emp.id);
  }
}
