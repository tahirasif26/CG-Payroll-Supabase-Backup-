import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery, buildSkipTake } from '@common/dto/pagination.dto';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import type { RequestUser } from '@common/types/jwt-payload';
import { TenantsService } from './tenants.service';
import {
  createTenantSchema,
  updateTenantSchema,
  type CreateTenantDto,
  type UpdateTenantDto,
} from './dto/tenant.schemas';

const tabKeyArraySchema = z.object({
  enabledTabKeys: z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, 'Tab key must be module.key'),
    )
    .max(200),
});
type TabKeyArrayDto = z.infer<typeof tabKeyArraySchema>;

@ApiTags('tenants')
@ApiBearerAuth('access-token')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /**
   * Tenant creation is currently @Public because there is no super_admin yet
   * on a clean install. Once a super_admin exists, switch this to
   * `@Roles(super_admin)` and rely on the bootstrap script for the very first
   * tenant. TODO(Phase 1.1): add bootstrap-token gate for self-serve sign-up.
   */
  @Public()
  @Post()
  @ApiOperation({ summary: 'Provision a new tenant (client) with optional bootstrap admin' })
  create(
    @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.tenants.create(dto, user?.id ?? null);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Get()
  @ApiOperation({ summary: 'List tenants (super_admin only)' })
  async list(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.tenants.list({ search: query.search, skip, take });
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

  /**
   * Returns the caller's accessible tab keys. Super-admins get `null`
   * (unrestricted — sidebar/route guards bypass tab filtering). Everyone else
   * gets their primary client's `enabledTabKeys` (empty array = locked out).
   *
   * Declared before `:id` so the literal `me` segment doesn't get parsed as a
   * UUID.
   */
  @Get('me/tabs')
  @ApiOperation({ summary: "Current user's accessible tab keys" })
  async myTabs(@CurrentUser() user: RequestUser) {
    const isSuperAdmin = user.roles.some((r) => r.role === 'super_admin');
    return this.tenants.getTabsForUser({
      isSuperAdmin,
      primaryClientId: user.primaryClientId,
      appRoles: user.roles.map((r) => r.role),
    });
  }

  /**
   * First-login setup wizard progress. Step completion is auto-derived from
   * real tenant data; admin/HR can resume at any time from the banner.
   */
  @Get('me/setup-progress')
  @ApiOperation({ summary: 'Current tenant setup-wizard progress' })
  async mySetupProgress(@CurrentUser() user: RequestUser) {
    if (!user.primaryClientId) {
      return {
        clientId: null,
        steps: [],
        completedCount: 0,
        totalCount: 0,
        isComplete: true,
        dismissedAt: null,
        shouldShowBanner: false,
      };
    }
    return this.tenants.getSetupProgress({
      clientId: user.primaryClientId,
      userId: user.id,
    });
  }

  /** Mark the setup-wizard banner as dismissed for the caller's tenant. */
  @Post('me/setup-wizard/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss the setup-wizard banner' })
  async dismissSetupWizard(@CurrentUser() user: RequestUser) {
    if (!user.primaryClientId) {
      return { dismissedAt: null };
    }
    return this.tenants.dismissSetupWizard(user.primaryClientId);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Get(':id/tab-access')
  @ApiOperation({ summary: "Tenant's enabled tab keys (super_admin only)" })
  getTabAccess(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.getTabAccess(id);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Put(':id/tab-access')
  @ApiOperation({ summary: 'Replace tenant tab access (super_admin only)' })
  setTabAccess(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(tabKeyArraySchema)) dto: TabKeyArrayDto,
  ) {
    return this.tenants.setTabAccess(id, dto.enabledTabKeys);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by id' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update tenant (super_admin or tenant admin)',
    description:
      'Also handles suspend / activate by passing `{ status: "suspended" | "active" | "trial" }`.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.tenants.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete tenant and all its data (super_admin only, hard cascade)',
    description:
      'Cascade-deletes users, employees, payroll, leave, expenses, advances, ' +
      'loans, assets, etc. — every row scoped to this client. Irreversible.',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.delete(id);
  }
}
