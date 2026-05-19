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
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ClientScope, ActiveClientId } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { InvitationsService } from './invitations.service';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  type AcceptInvitationDto,
  type CreateInvitationDto,
} from './dto/invitation.schemas';

@ApiTags('invitations')
@ApiBearerAuth('access-token')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @UseGuards(ClientScopeGuard, RolesGuard)
  @ClientScope()
  @Roles('super_admin', 'admin', 'hr')
  @Get()
  @ApiOperation({ summary: 'List invitations for the active client' })
  list(@ActiveClientId() clientId: string) {
    return this.invitations.listForClient(clientId);
  }

  @UseGuards(ClientScopeGuard, RolesGuard)
  @ClientScope()
  @Roles('super_admin', 'admin', 'hr')
  @Post()
  @ApiOperation({ summary: 'Invite a user to the active client' })
  @UsePipes(new ZodValidationPipe(createInvitationSchema))
  create(
    @Body() dto: CreateInvitationDto,
    @ActiveClientId() clientId: string,
    @CurrentUser('id') invitedByUserId: string,
  ) {
    return this.invitations.create({ dto, clientId, invitedByUserId });
  }

  @UseGuards(ClientScopeGuard, RolesGuard)
  @ClientScope()
  @Roles('super_admin', 'admin', 'hr')
  @Post(':id/resend')
  @ApiOperation({ summary: 'Resend an invitation with a fresh token' })
  resend(
    @Param('id', new ParseUUIDPipe()) id: string,
    @ActiveClientId() clientId: string,
  ) {
    return this.invitations.resend(id, clientId);
  }

  @UseGuards(ClientScopeGuard, RolesGuard)
  @ClientScope()
  @Roles('super_admin', 'admin', 'hr')
  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @ActiveClientId() clientId: string,
  ) {
    return this.invitations.revoke(id, clientId);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation — creates the user and signs them in' })
  @UsePipes(new ZodValidationPipe(acceptInvitationSchema))
  accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.invitations.accept(dto, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip ?? undefined,
    });
  }
}
