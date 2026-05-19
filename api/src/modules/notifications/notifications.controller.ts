import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { NotificationsService } from './notifications.service';
import {
  listNotificationsQuerySchema,
  markReadSchema,
  type ListNotificationsQuery,
  type MarkReadDto,
} from './dto/notification.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard)
@ClientScope()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's notifications" })
  list(
    @CurrentUser() user: RequestUser,
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery,
  ) {
    return this.notifications.listForUser(user.id, clientId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread-count badge value' })
  async unreadCount(
    @CurrentUser() user: RequestUser,
    @ActiveClientId() clientId: string,
  ) {
    const count = await this.notifications.unreadCount(user.id, clientId);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(markReadSchema))
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  markRead(
    @CurrentUser() user: RequestUser,
    @ActiveClientId() clientId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.notifications.markRead(user.id, clientId, dto);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  markAllRead(@CurrentUser() user: RequestUser, @ActiveClientId() clientId: string) {
    return this.notifications.markAllRead(user.id, clientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss (delete) a single notification belonging to the caller' })
  delete(
    @CurrentUser() user: RequestUser,
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.delete(user.id, clientId, id);
  }
}
