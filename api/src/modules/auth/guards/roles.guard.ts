import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole } from '@prisma/client';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { RbacService } from '@modules/rbac/rbac.service';
import type { AuthenticatedRequest } from '@common/types/authenticated-request';

/**
 * Enforces @Roles(). Super-admins always pass. Otherwise the user must hold at
 * least one of the listed roles in the active client scope (set by
 * ClientScopeGuard) — falling back to any client if no scope is bound.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException({
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required',
      });
    }

    if (this.rbac.isSuperAdmin(req.user)) return true;

    const clientScope = req.user.activeClientId;
    const ok = required.some((role) => this.rbac.hasAppRole(req.user, role, clientScope));
    if (!ok) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: `One of [${required.join(', ')}] is required`,
      });
    }
    return true;
  }
}
