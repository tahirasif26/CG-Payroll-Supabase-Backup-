import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TypedConfigService } from '@config/typed-config.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type { JwtAccessPayload, RequestUser } from '@common/types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: TypedConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Passport calls this with the verified payload. We re-verify the user is
   * still active in the DB (a disabled user with a valid JWT must lose access
   * immediately).
   */
  async validate(payload: JwtAccessPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN_TYPE', message: 'Wrong token type' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        status: true,
        primaryClientId: true,
        primaryClient: { select: { status: true } },
        userRoles: {
          select: {
            clientId: true,
            client: { select: { status: true } },
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User is not active',
      });
    }

    // Super-admins (no client binding) are always allowed through.
    const isSuperAdmin = payload.roles.some((r) => r.role === 'super_admin');

    if (!isSuperAdmin) {
      // Block every member of a suspended client. If the user has more than
      // one membership, they're locked out only when *all* their clients are
      // suspended (otherwise the user picks a different client scope).
      const memberClientStatuses = user.userRoles
        .filter((r) => r.client)
        .map((r) => r.client!.status);
      const everyClientSuspended =
        memberClientStatuses.length > 0 &&
        memberClientStatuses.every((s) => s === 'suspended');
      if (everyClientSuspended) {
        throw new UnauthorizedException({
          code: 'CLIENT_SUSPENDED',
          message: 'Your organisation has been suspended. Contact support.',
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      primaryClientId: user.primaryClientId,
      roles: payload.roles,
      activeClientId: null, // set by ClientScopeGuard
    };
  }
}
