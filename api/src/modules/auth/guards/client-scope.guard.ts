import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLIENT_SCOPE_KEY } from '@common/decorators/client-scope.decorator';
import { RbacService } from '@modules/rbac/rbac.service';
import type { AuthenticatedRequest } from '@common/types/authenticated-request';

/**
 * Resolves the active client id and verifies the user is a member of it.
 *
 * Resolution order:
 *   1. `X-Client-Id` request header (preferred — explicit)
 *   2. Route param `:clientId` (when the URL identifies the tenant)
 *   3. `user.primaryClientId` (fallback for single-tenant users)
 *
 * Super-admins may pick any client.
 */
@Injectable()
export class ClientScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(CLIENT_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException({
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required to resolve client scope',
      });
    }

    const headerValue = req.header('x-client-id') ?? req.header('X-Client-Id');
    const paramValue = (req.params as Record<string, string | undefined>).clientId;
    const candidate = headerValue ?? paramValue ?? req.user.primaryClientId;

    if (!candidate) {
      throw new ForbiddenException({
        code: 'CLIENT_SCOPE_REQUIRED',
        message: 'No client scope provided',
      });
    }

    if (!this.rbac.isMemberOf(req.user, candidate)) {
      throw new ForbiddenException({
        code: 'CLIENT_SCOPE_FORBIDDEN',
        message: 'You are not a member of this client',
      });
    }

    req.user.activeClientId = candidate;
    return true;
  }
}
