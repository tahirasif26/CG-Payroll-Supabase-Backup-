import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest } from '@common/types/authenticated-request';

export const CLIENT_SCOPE_KEY = 'clientScope';

/**
 * Marks a route as scoped to a tenant. The ClientScopeGuard reads the active
 * client id from `X-Client-Id` header → param `:clientId` → user.primaryClientId
 * and stores it on `request.user.activeClientId`. Super-admins may pick any
 * client; everyone else is restricted to clients they are members of.
 */
export const ClientScope = () => SetMetadata(CLIENT_SCOPE_KEY, true);

/** Injects the active client id resolved by ClientScopeGuard. */
export const ActiveClientId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const id = req.user?.activeClientId;
    if (!id) {
      throw new Error(
        'ActiveClientId is null — did you forget @ClientScope() or apply ClientScopeGuard?',
      );
    }
    return id;
  },
);
