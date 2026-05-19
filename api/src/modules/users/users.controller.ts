import { Body, Controller, Get, Headers, Patch, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';
import { AuthService } from '@modules/auth/auth.service';
import { updateProfileSchema, type UpdateProfileDto } from './dto/user.schemas';
import { changePasswordSchema, type ChangePasswordDto } from '@modules/auth/dto/auth.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user with profile and memberships' })
  me(@CurrentUser('id') userId: string) {
    return this.users.findMe(userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(userId, dto);
    return { changed: true };
  }

  @Get('me/effective-features')
  @ApiOperation({
    summary: 'Effective feature keys for the current user in the active client scope',
  })
  @ApiHeader({
    name: 'X-Client-Id',
    required: false,
    description: 'Overrides the user.primaryClientId fallback.',
  })
  async effectiveFeatures(
    @CurrentUser() user: RequestUser,
    @Headers('x-client-id') clientIdHeader?: string,
  ) {
    const clientId = clientIdHeader || user.primaryClientId || null;
    const keys = await this.users.effectiveFeatures(user.id, clientId);
    return { keys, clientId };
  }
}
