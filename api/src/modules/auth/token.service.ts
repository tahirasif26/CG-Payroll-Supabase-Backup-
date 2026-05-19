import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { TypedConfigService } from '@config/typed-config.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  JwtRoleBinding,
} from '@common/types/jwt-payload';

export interface IssuedRefresh {
  token: string;
  tokenId: string;
  family: string;
  expiresIn: string;
}

export interface RotatedRefresh {
  userId: string;
  refresh: IssuedRefresh;
}

/**
 * Issues and validates JWT access + refresh tokens, with refresh-token rotation
 * and replay detection via the `family` column. Refresh tokens are stored in
 * the DB as sha256(jti); the plaintext token is only ever returned to the
 * caller once, on issuance.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: TypedConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ───────────────────────── Access tokens ─────────────────────────

  signAccessToken(input: {
    userId: string;
    email: string;
    primaryClientId: string | null;
    roles: JwtRoleBinding[];
  }): string {
    const payload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
      sub: input.userId,
      email: input.email,
      type: 'access',
      primaryClientId: input.primaryClientId,
      roles: input.roles,
    };
    // `expiresIn` widened to ms `StringValue` in Nest 11; our env-supplied
    // value (e.g. "15m") is valid at runtime but TS can't prove the literal
    // shape, so we cast the options object via JwtSignOptions.
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
    } as JwtSignOptions);
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    try {
      const payload = this.jwt.verify<JwtAccessPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid or expired access token',
      });
    }
  }

  // ───────────────────────── Refresh tokens ────────────────────────

  /**
   * Issues a new refresh token. Pass `existingFamily` to rotate within an
   * existing family during refresh; otherwise a new family is created.
   */
  async issueRefreshToken(input: {
    userId: string;
    existingFamily?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedRefresh> {
    const family = input.existingFamily ?? randomUUID();
    const jti = randomBytes(32).toString('hex');
    const tokenHash = sha256(jti);
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN');
    const expiresAt = addExpiry(expiresIn);

    const payload: Omit<JwtRefreshPayload, 'iat' | 'exp'> = {
      sub: input.userId,
      type: 'refresh',
      family,
      jti,
    };
    const token = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn,
    } as JwtSignOptions);

    const created = await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        family,
        expiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });

    return { token, tokenId: created.id, family, expiresIn };
  }

  /**
   * Verifies a presented refresh token, revokes it, and issues a replacement.
   * Caller is expected to refetch user data and compose a fresh access token.
   *
   * Replay detection: if the presented token has already been revoked, the
   * entire family is burned and the request is rejected.
   */
  async rotate(input: {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RotatedRefresh> {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwt.verify<JwtRefreshPayload>(input.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Wrong token type',
      });
    }

    const tokenHash = sha256(payload.jti);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token not recognized',
      });
    }

    // Replay detection: previously revoked → burn the whole family.
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Refresh token reuse detected — session terminated',
      });
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token expired',
      });
    }

    const next = await this.issueRefreshToken({
      userId: stored.userId,
      existingFamily: stored.family,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: next.tokenId },
    });

    return { userId: stored.userId, refresh: next };
  }

  /** Revoke a single refresh token (logout). Best-effort — invalid tokens no-op. */
  async revoke(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh') return;
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(payload.jti), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // ignore
    }
  }

  /** Revoke every refresh token for a user (force logout everywhere). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  accessExpiresIn(): string {
    return this.config.get('JWT_ACCESS_EXPIRES_IN');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Convert a duration string ("7d", "15m", "24h") to a future Date. */
function addExpiry(input: string, base = new Date()): Date {
  const match = /^(\d+)\s*([smhdw])$/i.exec(input.trim());
  if (!match) {
    const n = Number(input);
    if (Number.isFinite(n)) return new Date(base.getTime() + n * 1000);
    throw new Error(`Unrecognized duration: ${input}`);
  }
  const value = Number(match[1]);
  const factor =
    { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[match[2].toLowerCase()] ?? 1;
  return new Date(base.getTime() + value * factor * 1000);
}
