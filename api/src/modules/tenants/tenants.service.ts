import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AppRole,
  ClientStatus,
  InvitationStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { TypedConfigService } from '@config/typed-config.service';
import { PasswordService } from '@modules/auth/password.service';
import type { CreateTenantDto, UpdateTenantDto } from './dto/tenant.schemas';

/**
 * Replaces the Supabase `create-client` edge function plus the
 * `seed_default_roles` trigger. Tenant provisioning is wrapped in a single
 * transaction so we never end up with a half-created client.
 *
 * Not yet ported (intentionally, deferred to relevant phase):
 *   - seed_default_reminder_rules        → Phase 8 (Reminders)
 *   - seed_default_approval_roles        → Phase 5 (Approval engine)
 *   - seed_client_tab_access             → with module rollout (Phase 3+)
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly mail: MailService,
    private readonly config: TypedConfigService,
  ) {}

  async create(dto: CreateTenantDto, invitedByUserId?: string | null) {
    if (dto.initialAdmin && dto.adminInvite) {
      throw new BadRequestException({
        code: 'CONFLICTING_ADMIN_FIELDS',
        message: 'Provide either initialAdmin or adminInvite, not both',
      });
    }

    const existing = await this.prisma.client.findUnique({
      where: { companySlug: dto.companySlug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: 'Company slug is already in use',
      });
    }

    // If we're inviting an admin, make sure their email isn't already on the
    // platform — invite acceptance would otherwise collide on the user row.
    if (dto.adminInvite) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.adminInvite.email },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'Admin email is already in use',
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyName: dto.companyName,
          companySlug: dto.companySlug,
          companyEmail: dto.companyEmail,
          companyPhone: dto.companyPhone,
          country: dto.country,
          timezone: dto.timezone,
          baseCurrency: dto.baseCurrency,
          subscriptionPlan: dto.subscriptionPlan,
          status: ClientStatus.active,
          enabledTabKeys: dto.enabledTabKeys ?? [],
        },
      });

      // seed_default_roles equivalent — Admin (with admin app role) + Employee.
      const adminRole = await tx.role.create({
        data: {
          clientId: client.id,
          name: 'Admin',
          appRole: AppRole.admin,
          isSystem: true,
          description: 'Default system administrator role',
        },
      });
      await tx.role.create({
        data: {
          clientId: client.id,
          name: 'Employee',
          appRole: AppRole.employee,
          isSystem: true,
          description: 'Default employee role',
        },
      });

      // Optionally bootstrap the first admin user.
      if (dto.initialAdmin) {
        const conflict = await tx.user.findUnique({
          where: { email: dto.initialAdmin.email },
        });
        if (conflict) {
          throw new ConflictException({
            code: 'EMAIL_TAKEN',
            message: 'Initial admin email is already in use',
          });
        }
        const passwordHash = await this.password.hash(dto.initialAdmin.password);
        const adminUser = await tx.user.create({
          data: {
            email: dto.initialAdmin.email,
            passwordHash,
            status: UserStatus.active,
            emailVerifiedAt: new Date(), // first admin is implicitly verified
            primaryClientId: client.id,
            profile: dto.initialAdmin.fullName
              ? { create: { fullName: dto.initialAdmin.fullName } }
              : undefined,
          },
        });
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
            clientId: client.id,
          },
        });
        return { client, adminUserId: adminUser.id, invitation: null as
          | { id: string; email: string; tokenPlain: string } | null };
      }

      // Alternative bootstrap: email an invitation link instead of setting a
      // password up front. Token is generated here so we can mail it after the
      // transaction commits (avoids sending mail for a tx that ends up rolled
      // back).
      if (dto.adminInvite) {
        const tokenPlain = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
        const ttlDays = this.config.get('INVITATION_TTL_DAYS');
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

        const invitation = await tx.invitation.create({
          data: {
            clientId: client.id,
            email: dto.adminInvite.email,
            appRole: AppRole.admin,
            roleId: adminRole.id,
            firstName: dto.adminInvite.fullName?.split(' ')[0],
            lastName: dto.adminInvite.fullName?.split(' ').slice(1).join(' ') || undefined,
            tokenHash,
            expiresAt,
            status: InvitationStatus.pending,
            createdByUserId: invitedByUserId ?? undefined,
          },
        });

        return {
          client,
          adminUserId: null,
          invitation: { id: invitation.id, email: invitation.email, tokenPlain },
        };
      }

      return { client, adminUserId: null, invitation: null };
    });

    // Side-effects after the transaction has committed.
    if (result.invitation) {
      try {
        await this.mail.sendInvitation({
          to: result.invitation.email,
          token: result.invitation.tokenPlain,
          companyName: result.client.companyName,
        });
      } catch (err) {
        // Don't roll back the tenant if mail delivery fails — the super-admin
        // can resend the invitation. Surface the failure in the response so
        // the wizard can show a warning toast.
        this.logger.error(
          `Tenant created but invitation email failed for ${result.invitation.email}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return {
          client: result.client,
          adminUserId: null,
          invitation: {
            id: result.invitation.id,
            email: result.invitation.email,
            emailSent: false,
          },
        };
      }
      return {
        client: result.client,
        adminUserId: null,
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          emailSent: true,
        },
      };
    }

    return { client: result.client, adminUserId: result.adminUserId, invitation: null };
  }

  async findById(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
    }
    return client;
  }

  list(opts: { search?: string; skip: number; take: number }) {
    const where: Prisma.ClientWhereInput = opts.search
      ? {
          OR: [
            { companyName: { contains: opts.search, mode: 'insensitive' } },
            { companySlug: { contains: opts.search, mode: 'insensitive' } },
            { companyEmail: { contains: opts.search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { companyName: 'asc' },
        skip: opts.skip,
        take: opts.take,
      }),
      this.prisma.client.count({ where }),
    ]);
  }

  update(id: string, dto: UpdateTenantDto) {
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  /** Replace this tenant's tab access list. Empty array = locked workspace. */
  async setTabAccess(id: string, enabledTabKeys: string[]) {
    await this.findById(id);
    return this.prisma.client.update({
      where: { id },
      data: { enabledTabKeys },
      select: { id: true, enabledTabKeys: true },
    });
  }

  async getTabAccess(id: string) {
    const c = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true, enabledTabKeys: true },
    });
    if (!c) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
    }
    return c;
  }

  /**
   * Returns the tab access list for the caller. Resolution rules:
   *   - super_admin (no client binding): returns null = unrestricted access
   *   - user with primaryClientId: returns that client's enabledTabKeys
   *   - user with no client at all: returns []  (effectively locked out)
   */
  async getTabsForUser(opts: { isSuperAdmin: boolean; primaryClientId: string | null }) {
    if (opts.isSuperAdmin) return { enabledTabKeys: null as string[] | null };
    if (!opts.primaryClientId) return { enabledTabKeys: [] };
    const c = await this.prisma.client.findUnique({
      where: { id: opts.primaryClientId },
      select: { enabledTabKeys: true },
    });
    return { enabledTabKeys: c?.enabledTabKeys ?? [] };
  }

  /**
   * Hard delete. Prisma's `onDelete: Cascade` on every domain table FK'd to
   * Client (users, employees, leave, expenses, advances, loans, assets,
   * payroll, etc.) means a single `delete` removes the tenant and every row
   * scoped to it.
   *
   * If you'd rather keep history, switch this to a soft-delete by setting
   * `status: 'suspended'` instead.
   */
  async delete(id: string) {
    await this.findById(id); // 404 if not found
    return this.prisma.client.delete({ where: { id } });
  }
}
