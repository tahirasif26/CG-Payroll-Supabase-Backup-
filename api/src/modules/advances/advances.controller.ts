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
import { AdvancesService } from './advances.service';
import {
  createAdvanceSchema,
  decideAdvanceSchema,
  listAdvancesQuerySchema,
  settleAdvanceSchema,
  updateAdvanceSchema,
  type CreateAdvanceDto,
  type DecideAdvanceDto,
  type ListAdvancesQuery,
  type SettleAdvanceDto,
  type UpdateAdvanceDto,
} from './dto/advance.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('advances')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('advances')
export class AdvancesController {
  constructor(
    private readonly advances: AdvancesService,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async list(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listAdvancesQuerySchema)) query: ListAdvancesQuery,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    const canSeeAll =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.advances.list(clientId, empId, query, canSeeAll);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  findOne(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.advances.findById(clientId, id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  async create(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createAdvanceSchema)) dto: CreateAdvanceDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    const canForOthers =
      this.rbac.isSuperAdmin(user) || this.rbac.isAdminOrHrIn(user, clientId);
    return this.advances.create(clientId, empId, dto, canForOthers);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  update(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAdvanceSchema)) dto: UpdateAdvanceDto,
  ) {
    return this.advances.update(clientId, id, dto);
  }

  @Post(':id/submit')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  submit(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.advances.submit(clientId, id);
  }

  @Post(':id/decision')
  @Roles('super_admin', 'admin', 'hr')
  async decide(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(decideAdvanceSchema)) dto: DecideAdvanceDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.advances.decide(clientId, id, empId, dto);
  }

  @Post(':id/settle')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Mark an approved advance as settled, optionally setting amountUsed' })
  settle(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(settleAdvanceSchema)) dto: SettleAdvanceDto,
  ) {
    return this.advances.settle(clientId, id, dto);
  }

  @Post(':id/cancel')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  cancel(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.advances.cancel(clientId, id);
  }

  private async callerEmpId(userId: string, clientId: string): Promise<string | null> {
    const e = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return e?.id ?? null;
  }
}
