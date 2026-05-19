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
import { ExpensesService } from './expenses.service';
import {
  createExpenseSchema,
  decideExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
  type CreateExpenseDto,
  type DecideExpenseDto,
  type ListExpensesQuery,
  type UpdateExpenseDto,
} from './dto/expense.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('expenses')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async list(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listExpensesQuerySchema)) query: ListExpensesQuery,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    const canSeeAll =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.expenses.list(clientId, empId, query, canSeeAll);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  findOne(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.findById(clientId, id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async create(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    const canForOthers =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.expenses.create(clientId, empId, dto, canForOthers);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  update(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(clientId, id, dto);
  }

  @Post(':id/submit')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'Move expense from draft/rejected to submitted' })
  submit(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.submit(clientId, id);
  }

  @Post(':id/decision')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Approve or reject a submitted expense' })
  async decide(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(decideExpenseSchema)) dto: DecideExpenseDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.expenses.decide(clientId, id, empId, dto);
  }

  @Post(':id/mark-paid')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Manually mark an approved expense as paid (pre-payroll-integration)' })
  markPaid(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.markPaid(clientId, id);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  delete(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.delete(clientId, id);
  }

  private async callerEmpId(userId: string, clientId: string): Promise<string | null> {
    const e = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return e?.id ?? null;
  }
}
