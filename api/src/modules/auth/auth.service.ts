import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { TypedConfigService } from '@config/typed-config.service';
import { RbacService } from '@modules/rbac/rbac.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type {
  RegisterDto,
  LoginDto,
  RefreshDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
} from './dto/auth.schemas';
import type { JwtRoleBinding } from '@common/types/jwt-payload';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    primaryClientId: string | null;
    roles: JwtRoleBinding[];
  };
}

export interface CallerContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly rbac: RbacService,
    private readonly mail: MailService,
    private readonly config: TypedConfigService,
  ) {}

  // ─────────────────────────── Registration ───────────────────────────

  /**
   * Self-service registration. Creates an unverified, unaffiliated user.
   * Tenant membership is established separately via invitation acceptance or
   * an explicit admin action. Email verification is sent but not required to
   * issue a session (Phase 1 trade-off — tighten later if needed).
   */
  async register(dto: RegisterDto, ctx: CallerContext): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await this.password.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        status: UserStatus.active,
        profile: dto.fullName ? { create: { fullName: dto.fullName } } : undefined,
      },
    });

    // Fire-and-forget email verification.
    await this.issueEmailVerification(user.id, user.email);

    return this.completeSession(user.id, ctx);
  }

  // ───────────────────────────── Login ────────────────────────────────

  async login(dto: LoginDto, ctx: CallerContext): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    const ok = await this.password.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'Account is not active',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.completeSession(user.id, ctx);
  }

  // ──────────────────────────── Refresh ───────────────────────────────

  async refresh(dto: RefreshDto, ctx: CallerContext): Promise<AuthResult> {
    const rotated = await this.tokens.rotate({
      refreshToken: dto.refreshToken,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User is not active',
      });
    }

    const roles = await this.rbac.loadRoles(user.id);
    const accessToken = this.tokens.signAccessToken({
      userId: user.id,
      email: user.email,
      primaryClientId: user.primaryClientId,
      roles,
    });

    return {
      accessToken,
      refreshToken: rotated.refresh.token,
      expiresIn: this.tokens.accessExpiresIn(),
      user: {
        id: user.id,
        email: user.email,
        primaryClientId: user.primaryClientId,
        roles,
      },
    };
  }

  // ───────────────────────────── Logout ───────────────────────────────

  async logout(userId: string, dto: LogoutDto): Promise<void> {
    if (dto.allDevices) {
      await this.tokens.revokeAllForUser(userId);
      return;
    }
    if (dto.refreshToken) {
      await this.tokens.revoke(dto.refreshToken);
    }
  }

  // ─────────────────────── Forgot / Reset password ────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Do NOT leak whether the email exists. Always pretend to succeed.
    if (!user) return;

    const tokenPlain = randomBytes(32).toString('hex');
    const tokenHash = sha256(tokenPlain);
    const expiresAt = new Date(
      Date.now() + this.config.get('PASSWORD_RESET_TOKEN_TTL_MIN') * 60 * 1000,
    );

    // Invalidate any outstanding tokens before issuing a new one.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mail.sendPasswordReset(user.email, tokenPlain);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = sha256(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'This reset link is invalid or has expired',
      });
    }

    const passwordHash = await this.password.hash(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, status: UserStatus.active },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Force re-login on all devices for safety.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ──────────────────────── Change password (self) ────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const ok = await this.password.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }
    const passwordHash = await this.password.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  }

  // ───────────────────────── Email verification ───────────────────────

  async issueEmailVerification(userId: string, email: string): Promise<void> {
    const tokenPlain = randomBytes(32).toString('hex');
    const tokenHash = sha256(tokenPlain);
    const expiresAt = new Date(
      Date.now() +
        this.config.get('EMAIL_VERIFICATION_TOKEN_TTL_HOURS') * 60 * 60 * 1000,
    );
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    await this.mail.sendEmailVerification(email, tokenPlain);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = sha256(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'This verification link is invalid or has expired',
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  // ─────────────────────────────── Internal ───────────────────────────

  /** Compose access + refresh tokens for a known-good user id. */
  async completeSession(userId: string, ctx: CallerContext): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, primaryClientId: true },
    });
    const roles = await this.rbac.loadRoles(user.id);
    const accessToken = this.tokens.signAccessToken({
      userId: user.id,
      email: user.email,
      primaryClientId: user.primaryClientId,
      roles,
    });
    const refresh = await this.tokens.issueRefreshToken({
      userId: user.id,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });
    return {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: this.tokens.accessExpiresIn(),
      user: { id: user.id, email: user.email, primaryClientId: user.primaryClientId, roles },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
