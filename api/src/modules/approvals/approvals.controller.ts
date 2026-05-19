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
import { ApprovalModule } from '@prisma/client';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ApprovalsService } from './approvals.service';
import {
  createDelegationSchema,
  createGroupSchema,
  createPolicySchema,
  decideRequestSchema,
  listRequestApprovalsQuerySchema,
  updateGroupSchema,
  updatePolicySchema,
  type CreateDelegationDto,
  type CreateGroupDto,
  type CreatePolicyDto,
  type DecideRequestDto,
  type ListRequestApprovalsQuery,
  type UpdateGroupDto,
  type UpdatePolicyDto,
} from './dto/approval.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('approvals')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller()
export class ApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Groups ───────────────────────────────────────────────────────────

  @Get('approval-groups')
  @Roles('super_admin', 'admin', 'hr')
  listGroups(@ActiveClientId() clientId: string) {
    return this.approvals.list(clientId);
  }

  @Post('approval-groups')
  @Roles('super_admin', 'admin')
  createGroup(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createGroupSchema)) dto: CreateGroupDto,
  ) {
    return this.approvals.createGroup(clientId, dto);
  }

  @Patch('approval-groups/:id')
  @Roles('super_admin', 'admin')
  updateGroup(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateGroupSchema)) dto: UpdateGroupDto,
  ) {
    return this.approvals.updateGroup(clientId, id, dto);
  }

  @Delete('approval-groups/:id')
  @Roles('super_admin', 'admin')
  deleteGroup(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.approvals.deleteGroup(clientId, id);
  }

  // ─── Policies ─────────────────────────────────────────────────────────

  @Get('approval-policies')
  @Roles('super_admin', 'admin', 'hr')
  listPolicies(
    @ActiveClientId() clientId: string,
    @Query('module') module?: string,
  ) {
    return this.approvals.listPolicies(clientId, module as ApprovalModule | undefined);
  }

  @Post('approval-policies')
  @Roles('super_admin', 'admin')
  createPolicy(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createPolicySchema)) dto: CreatePolicyDto,
  ) {
    return this.approvals.createPolicy(clientId, dto);
  }

  @Patch('approval-policies/:id')
  @Roles('super_admin', 'admin')
  updatePolicy(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePolicySchema)) dto: UpdatePolicyDto,
  ) {
    return this.approvals.updatePolicy(clientId, id, dto);
  }

  // ─── Delegations ──────────────────────────────────────────────────────

  @Get('approval-delegations')
  @Roles('super_admin', 'admin', 'hr')
  listDelegations(@ActiveClientId() clientId: string) {
    return this.approvals.listDelegations(clientId);
  }

  @Post('approval-delegations')
  @Roles('super_admin', 'admin', 'hr')
  createDelegation(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createDelegationSchema)) dto: CreateDelegationDto,
  ) {
    return this.approvals.createDelegation(clientId, user.id, dto);
  }

  @Delete('approval-delegations/:id')
  @Roles('super_admin', 'admin', 'hr')
  revokeDelegation(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.approvals.revokeDelegation(clientId, id);
  }

  // ─── Request approvals (workflow) ─────────────────────────────────────

  @Get('approval-requests')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({
    summary: 'List approval requests',
    description:
      'Default scope is `pending` — requests where the caller has a pending assignment at the current level. ' +
      'Other scopes: `mine` (caller submitted) or `all` (admin/HR can audit everything).',
  })
  async listRequests(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listRequestApprovalsQuerySchema)) query: ListRequestApprovalsQuery,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.approvals.listRequests(clientId, empId, query);
  }

  @Get('approval-requests/:id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  findRequest(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.approvals.findRequest(clientId, id);
  }

  @Post('approval-requests/:id/decision')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'Approve or reject a request at the caller’s assigned level' })
  async decide(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(decideRequestSchema)) dto: DecideRequestDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.approvals.decide(clientId, id, { userId: user.id, employeeId: empId }, dto);
  }

  private async callerEmpId(userId: string, clientId: string): Promise<string | null> {
    const e = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return e?.id ?? null;
  }
}
