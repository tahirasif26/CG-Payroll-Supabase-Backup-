import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SeparationsService } from './separations.service';
import {
  createSeparationSchema,
  eosbCalcSchema,
  listSeparationsQuerySchema,
  type CreateSeparationDto,
  type EosbCalcDto,
  type ListSeparationsQuery,
} from './dto/separation.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('separations')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('separations')
export class SeparationsController {
  constructor(private readonly separations: SeparationsService) {}

  @Get()
  @Roles('super_admin', 'admin', 'hr')
  list(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listSeparationsQuerySchema)) query: ListSeparationsQuery,
  ) {
    return this.separations.list(clientId, query);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr')
  findOne(@ActiveClientId() clientId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.separations.findById(clientId, id);
  }

  @Post('eosb-preview')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Pure EOSB calculator preview (does not persist)' })
  preview(@Body(new ZodValidationPipe(eosbCalcSchema)) dto: EosbCalcDto) {
    return this.separations.previewEosb(dto);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  create(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createSeparationSchema)) dto: CreateSeparationDto,
  ) {
    return this.separations.create(clientId, dto);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin', 'hr')
  approve(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.separations.approve(clientId, id, user.id);
  }

  @Post(':id/process')
  @Roles('super_admin', 'admin', 'hr')
  process(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { payrollRunId?: string } = {},
  ) {
    return this.separations.process(clientId, id, body.payrollRunId);
  }
}
