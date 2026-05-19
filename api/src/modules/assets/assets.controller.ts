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
import { AssetsService } from './assets.service';
import {
  assignAssetSchema,
  createAssetSchema,
  listAssetsQuerySchema,
  unassignAssetSchema,
  updateAssetSchema,
  type AssignAssetDto,
  type CreateAssetDto,
  type ListAssetsQuery,
  type UnassignAssetDto,
  type UpdateAssetDto,
} from './dto/asset.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('assets')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  list(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listAssetsQuerySchema)) query: ListAssetsQuery,
  ) {
    return this.assets.list(clientId, query);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  findOne(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.assets.findById(clientId, id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  create(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createAssetSchema)) dto: CreateAssetDto,
  ) {
    return this.assets.create(clientId, dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr')
  update(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAssetSchema)) dto: UpdateAssetDto,
  ) {
    return this.assets.update(clientId, id, dto);
  }

  @Post(':id/assign')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Assign an asset to an employee (records asset_history)' })
  async assign(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(assignAssetSchema)) dto: AssignAssetDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.assets.assign(clientId, id, empId, dto);
  }

  @Post(':id/unassign')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Unassign and optionally retire / mark in_repair / lost' })
  async unassign(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(unassignAssetSchema)) dto: UnassignAssetDto,
  ) {
    const empId = await this.callerEmpId(user.id, clientId);
    return this.assets.unassign(clientId, id, empId, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  delete(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.assets.delete(clientId, id);
  }

  private async callerEmpId(userId: string, clientId: string): Promise<string | null> {
    const e = await this.prisma.employee.findFirst({
      where: { userId, clientId },
      select: { id: true },
    });
    return e?.id ?? null;
  }
}
