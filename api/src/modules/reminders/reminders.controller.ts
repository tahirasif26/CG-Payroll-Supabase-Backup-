import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get('rules')
  @Roles('super_admin', 'admin', 'hr')
  listRules(@ActiveClientId() clientId: string) {
    return this.reminders.list(clientId);
  }

  @Post('rules')
  @Roles('super_admin', 'admin')
  upsertRule(
    @ActiveClientId() clientId: string,
    @Body() dto: Prisma.ReminderRuleUncheckedCreateInput,
  ) {
    return this.reminders.upsert(clientId, dto);
  }

  @Post('run')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Manually trigger the reminder dispatcher for this client (debug)' })
  async run(@ActiveClientId() clientId: string) {
    const n = await this.reminders.processClient(clientId);
    return { dispatched: n };
  }
}
