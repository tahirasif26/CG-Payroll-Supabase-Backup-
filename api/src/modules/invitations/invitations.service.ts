import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppRole, InvitationStatus, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { TypedConfigService } from '@config/typed-config.service';
import { PasswordService } from '@modules/auth/password.service';
import { AuthService, type CallerContext } from '@modules/auth/auth.service';
import type { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.schemas';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly password: PasswordService,
    private readonly auth: AuthService,
    private readonly config: TypedConfigService,
  ) {}

  // ──────────────────────── Create / Resend ────────────────────────

  async create(input: {
    dto: CreateInvitationDto;
    clientId: string;
    invitedByUserId: string;
  }) {
    // Already a member?
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.dto.email },
      include: { userRoles: { where: { clientId: input.clientId } } },
    });
    if (existingUser && existingUser.userRoles.length > 0) {
      throw new ConflictException({
        code: 'ALREADY_MEMBER',
        message: 'This user is already a member of the client',
      });
    }

    // Outstanding pending invitation? Resend instead of duplicating.
    const pending = await this.prisma.invitation.findFirst({
      where: {
        clientId: input.clientId,
        email: input.dto.email,
        status: InvitationStatus.pending,
      },
    });
    if (pending) {
      return this.resend(pending.id, input.clientId);
    }

    if (input.dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: input.dto.roleId } });
      if (!role || (role.clientId !== null && role.clientId !== input.clientId)) {
        throw new BadRequestException({
          code: 'INVALID_ROLE',
          message: 'roleId does not belong to this client',
        });
      }
    }

    const { tokenPlain, tokenHash, expiresAt } = this.mintToken();

    const invitation = await this.prisma.invitation.create({
      data: {
        clientId: input.clientId,
        email: input.dto.email,
        appRole: input.dto.appRole as AppRole,
        roleId: input.dto.roleId,
        firstName: input.dto.firstName,
        lastName: input.dto.lastName,
        empId: input.dto.empId,
        department: input.dto.department,
        designation: input.dto.designation,
        tokenHash,
        expiresAt,
        createdByUserId: input.invitedByUserId,
      },
      include: { client: { select: { companyName: true } } },
    });

    await this.mail.sendInvitation({
      to: invitation.email,
      token: tokenPlain,
      companyName: invitation.client.companyName,
    });

    return invitation;
  }

  async resend(invitationId: string, clientId: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { client: { select: { companyName: true } } },
    });
    if (!inv || inv.clientId !== clientId) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }
    if (inv.status === InvitationStatus.accepted) {
      throw new BadRequestException({
        code: 'INVITATION_ALREADY_ACCEPTED',
        message: 'Invitation has already been accepted',
      });
    }

    const { tokenPlain, tokenHash, expiresAt } = this.mintToken();
    const updated = await this.prisma.invitation.update({
      where: { id: inv.id },
      data: { tokenHash, expiresAt, status: InvitationStatus.pending, revokedAt: null },
    });

    await this.mail.sendInvitation({
      to: updated.email,
      token: tokenPlain,
      companyName: inv.client.companyName,
    });

    return updated;
  }

  async revoke(invitationId: string, clientId: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!inv || inv.clientId !== clientId) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }
    return this.prisma.invitation.update({
      where: { id: inv.id },
      data: { status: InvitationStatus.revoked, revokedAt: new Date() },
    });
  }

  async listForClient(clientId: string) {
    return this.prisma.invitation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ────────────────────────────── Accept ─────────────────────────────

  /**
   * Public endpoint: creates User + UserRole + Employee atomically and returns
   * an authenticated session so the invitee is logged in immediately.
   */
  async accept(dto: AcceptInvitationDto, ctx: CallerContext) {
    const tokenHash = sha256(dto.token);
    const inv = await this.prisma.invitation.findUnique({ where: { tokenHash } });

    if (!inv) {
      throw new BadRequestException({
        code: 'INVALID_INVITATION_TOKEN',
        message: 'This invitation link is invalid',
      });
    }
    if (inv.status !== InvitationStatus.pending) {
      throw new BadRequestException({
        code: 'INVITATION_NOT_PENDING',
        message: 'This invitation is no longer valid',
      });
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { status: InvitationStatus.expired },
      });
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired — please request a new one',
      });
    }

    const passwordHash = await this.password.hash(dto.password);

    // Resolve target role: prefer the explicit roleId on the invitation; fall
    // back to the system role for this appRole in this client.
    const role =
      (inv.roleId && (await this.prisma.role.findUnique({ where: { id: inv.roleId } }))) ||
      (await this.prisma.role.findFirst({
        where: { clientId: inv.clientId, appRole: inv.appRole, isSystem: true },
      }));

    if (!role) {
      throw new BadRequestException({
        code: 'NO_TARGET_ROLE',
        message: 'No matching role found in client — contact the administrator',
      });
    }

    const userId = await this.prisma.$transaction(async (tx) => {
      // Existing User can accept invitations to additional clients.
      let user = await tx.user.findUnique({ where: { email: inv.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: inv.email,
            passwordHash,
            status: UserStatus.active,
            emailVerifiedAt: new Date(), // invitee proved control of the email
            primaryClientId: inv.clientId,
            profile: dto.fullName ? { create: { fullName: dto.fullName } } : undefined,
          },
        });
      }

      await tx.userRole.upsert({
        where: {
          userId_roleId_clientId: {
            userId: user.id,
            roleId: role.id,
            clientId: inv.clientId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
          clientId: inv.clientId,
        },
      });

      // Create or link the Employee record.
      const existingEmployee = await tx.employee.findFirst({
        where: { clientId: inv.clientId, email: inv.email },
      });
      if (existingEmployee) {
        if (!existingEmployee.userId) {
          await tx.employee.update({
            where: { id: existingEmployee.id },
            data: { userId: user.id },
          });
        }
      } else {
        await tx.employee.create({
          data: {
            clientId: inv.clientId,
            userId: user.id,
            empId: inv.empId ?? autoEmpId(),
            firstName: inv.firstName ?? (dto.fullName?.split(' ')[0] ?? ''),
            lastName: inv.lastName ?? (dto.fullName?.split(' ').slice(1).join(' ') ?? ''),
            email: inv.email,
            department: inv.department,
            designation: inv.designation,
            joiningDate: new Date(),
          },
        });
      }

      await tx.invitation.update({
        where: { id: inv.id },
        data: {
          status: InvitationStatus.accepted,
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return user.id;
    });

    return this.auth.completeSession(userId, ctx);
  }

  // ─────────────────────────────────────────────────────────────────────

  private mintToken() {
    const tokenPlain = randomBytes(32).toString('hex');
    const tokenHash = sha256(tokenPlain);
    const ttlDays = this.config.get('INVITATION_TTL_DAYS');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    return { tokenPlain, tokenHash, expiresAt };
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Placeholder emp id; real flow should derive from a tenant-configurable sequence. */
function autoEmpId(): string {
  return `EMP-${Date.now().toString(36).toUpperCase()}`;
}
