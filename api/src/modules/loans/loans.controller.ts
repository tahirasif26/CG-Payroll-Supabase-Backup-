import {
  Body,
  Controller,
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
import { LoansService } from './loans.service';
import {
  adjustLoanSchema,
  approveLoanSchema,
  createLoanSchema,
  listLoansQuerySchema,
  pauseLoanSchema,
  updateLoanSchema,
  type AdjustLoanDto,
  type ApproveLoanDto,
  type CreateLoanDto,
  type ListLoansQuery,
  type PauseLoanDto,
  type UpdateLoanDto,
} from './dto/loan.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('loans')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async list(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listLoansQuerySchema)) query: ListLoansQuery,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    const canSeeAll =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.loans.list(clientId, empId, query, canSeeAll);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  findOne(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.loans.findById(clientId, id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  create(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createLoanSchema)) dto: CreateLoanDto,
  ) {
    return this.loans.create(clientId, dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr')
  update(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateLoanSchema)) dto: UpdateLoanDto,
  ) {
    return this.loans.update(clientId, id, dto);
  }

  @Post(':id/decision')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Approve (disburses + activates) or reject a draft loan' })
  async decide(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(approveLoanSchema)) dto: ApproveLoanDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.loans.approve(clientId, id, empId, dto);
  }

  @Post(':id/pause')
  @Roles('super_admin', 'admin', 'hr')
  pause(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(pauseLoanSchema)) dto: PauseLoanDto,
  ) {
    return this.loans.pause(clientId, id, dto);
  }

  @Post(':id/resume')
  @Roles('super_admin', 'admin', 'hr')
  resume(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.loans.resume(clientId, id);
  }

  @Post(':id/adjust')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({
    summary: 'Record an EMI / prepayment / writeoff / adjustment',
    description:
      'EMI and prepayment reduce balance. Writeoff zeroes balance. Adjustment is a signed delta. ' +
      'When balance hits zero, status flips to completed.',
  })
  adjust(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(adjustLoanSchema)) dto: AdjustLoanDto,
  ) {
    return this.loans.adjust(clientId, id, dto);
  }

  private async callerEmpId(userId: string, clientId: string): Promise<string | null> {
    const e = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return e?.id ?? null;
  }
}
