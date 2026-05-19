import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest } from '@common/types/authenticated-request';
import type { RequestUser } from '@common/types/jwt-payload';

/**
 * Injects the authenticated user from the request. Pair with JwtAuthGuard;
 * the resulting value is non-nullable.
 *
 * Usage:
 *   `@CurrentUser() user: RequestUser`
 *   `@CurrentUser('id') userId: string`
 */
export const CurrentUser = createParamDecorator(
  <K extends keyof RequestUser>(key: K | undefined, ctx: ExecutionContext): RequestUser | RequestUser[K] => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return key ? req.user[key] : req.user;
  },
);
