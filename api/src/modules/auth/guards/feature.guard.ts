import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_FEATURES_KEY } from '@common/decorators/require-feature.decorator';
import { RbacService } from '@modules/rbac/rbac.service';
import type { AuthenticatedRequest } from '@common/types/authenticated-request';

/**
 * Enforces @RequireFeature(). Requires an active client scope — use together
 * with @ClientScope() / ClientScopeGuard so we know which client to check.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRED_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException({
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required',
      });
    }

    if (this.rbac.isSuperAdmin(req.user)) return true;

    const clientId = req.user.activeClientId;
    if (!clientId) {
      throw new ForbiddenException({
        code: 'CLIENT_SCOPE_REQUIRED',
        message: 'Feature checks require an active client scope',
      });
    }

    for (const key of required) {
      const ok = await this.rbac.hasFeature(req.user, key, clientId);
      if (!ok) {
        throw new ForbiddenException({
          code: 'FEATURE_DISABLED',
          message: `Feature "${key}" is not enabled for you`,
        });
      }
    }
    return true;
  }
}
