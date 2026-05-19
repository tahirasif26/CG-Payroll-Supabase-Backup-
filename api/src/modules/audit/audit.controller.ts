import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { listAuditQuerySchema, type ListAuditQuery } from './dto/audit.schemas';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Roles('super_admin', 'admin')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit log entries (admin only)',
    description:
      'Filter by user, entity_type, entity_id, action, or date range (?from / ?to in ISO format).',
  })
  list(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listAuditQuerySchema)) query: ListAuditQuery,
  ) {
    return this.audit.list(clientId, query);
  }
}
