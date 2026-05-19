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
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery, buildSkipTake } from '@common/dto/pagination.dto';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { TenantsService } from './tenants.service';
import {
  createTenantSchema,
  updateTenantSchema,
  type CreateTenantDto,
  type UpdateTenantDto,
} from './dto/tenant.schemas';

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
  @UsePipes(new ZodValidationPipe(createTenantSchema))
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
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

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by id' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant (super_admin or tenant admin)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.tenants.update(id, dto);
  }
}
