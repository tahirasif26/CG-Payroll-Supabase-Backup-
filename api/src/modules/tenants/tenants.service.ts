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

        // Create the admin's Employee record inside the same transaction so the
        // user is never an "orphan" (logged-in user with no linked employee).
        // Joining date is intentionally left null — the setup wizard's Your
        // Profile step is "done" when the admin fills it in.
        const { firstName, lastName } = splitFullName(dto.initialAdmin.fullName, dto.initialAdmin.email);
        await tx.employee.create({
          data: {
            clientId: client.id,
            userId: adminUser.id,
            empId: autoEmpId(),
            firstName,
            lastName,
            email: dto.initialAdmin.email,
          },
        });

        return { client, adminUserId: adminUser.id, invitation: null as
          | { id: string; email: string; tokenPlain: string } | null };
      }

      // Alternative bootstrap: provision the admin user + employee record
      // atomically and email an invitation link that lets them set their
      // password. Doing User+Role+Employee creation here (rather than at
      // invitation acceptance time) means the admin's profile, sidebar tabs
      // and `Me` page are all wired up the moment the tenant exists — there's
      // no "Account Not Linked" half-state if the user later abandons or
      // mistypes the password during acceptance.
      if (dto.adminInvite) {
        const tokenPlain = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
        const ttlDays = this.config.get('INVITATION_TTL_DAYS');
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

        const adminUser = await tx.user.create({
          data: {
            email: dto.adminInvite.email,
            // No password yet — the invitation acceptance flow sets it and
            // flips status to `active`. Login is blocked until then because
            // auth.login() rejects users with a null passwordHash.
            passwordHash: null,
            status: UserStatus.pending,
            primaryClientId: client.id,
            profile: dto.adminInvite.fullName
              ? { create: { fullName: dto.adminInvite.fullName } }
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

        const { firstName, lastName } = splitFullName(
          dto.adminInvite.fullName,
          dto.adminInvite.email,
        );
        await tx.employee.create({
          data: {
            clientId: client.id,
            userId: adminUser.id,
            empId: autoEmpId(),
            firstName,
            lastName,
            email: dto.adminInvite.email,
          },
        });

        const invitation = await tx.invitation.create({
          data: {
            clientId: client.id,
            email: dto.adminInvite.email,
            appRole: AppRole.admin,
            roleId: adminRole.id,
            firstName,
            lastName: lastName || undefined,
            tokenHash,
            expiresAt,
            status: InvitationStatus.pending,
            createdByUserId: invitedByUserId ?? undefined,
          },
        });

        return {
          client,
          adminUserId: adminUser.id,
          invitation: { id: invitation.id, email: invitation.email, tokenPlain },
        };
      }

      return { client, adminUserId: null, invitation: null };
    });

    // Side-effects after the transaction has committed. MailService never
    // throws; it returns a result describing whether Resend actually accepted
    // the message. We propagate that into the response so the wizard can show
    // an accurate toast (a "sent" confirmation only when Resend really took it).
    if (result.invitation) {
      const sendResult = await this.mail.sendInvitation({
        to: result.invitation.email,
        token: result.invitation.tokenPlain,
        companyName: result.client.companyName,
      });
      if (!sendResult.ok) {
        this.logger.error(
          `Tenant created but invitation email failed for ${result.invitation.email}: ${sendResult.error ?? 'unknown'}`,
        );
      }
      return {
        client: result.client,
        adminUserId: result.adminUserId,
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          emailSent: sendResult.ok,
          ...(sendResult.error ? { emailError: sendResult.error } : {}),
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
   *   - admin role: ALWAYS returns the client's full enabledTabKeys — admin
   *     access is defined as "every tab the tenant has been granted" and
   *     cannot be narrowed by role-level config.
   *   - other roles: returns the client's enabledTabKeys (per-role narrowing
   *     can be layered on top here when roles/features land)
   *   - user with no client at all: returns []  (effectively locked out)
   */
  async getTabsForUser(opts: {
    isSuperAdmin: boolean;
    primaryClientId: string | null;
    // appRoles is accepted for future role-narrowing logic; admin always gets
    // the full tenant set so it's currently unused but kept in the signature.
    appRoles?: string[];
  }) {
    if (opts.isSuperAdmin) return { enabledTabKeys: null as string[] | null };
    if (!opts.primaryClientId) return { enabledTabKeys: [] };
    const c = await this.prisma.client.findUnique({
      where: { id: opts.primaryClientId },
      select: { enabledTabKeys: true },
    });
    return { enabledTabKeys: c?.enabledTabKeys ?? [] };
  }

  // ──────────────────────────── Setup Wizard ────────────────────────────

  /**
   * Returns first-login setup wizard progress for the caller's tenant.
   * Step completion is auto-detected from real data so the wizard stays in
   * sync with the system state — no separate per-step flags to drift.
   */
  async getSetupProgress(opts: { clientId: string; userId: string }) {
    const { clientId, userId } = opts;
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        companyLogoUrl: true,
        country: true,
        timezone: true,
        setupWizardDismissedAt: true,
      },
    });
    if (!client) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
    }

    const [
      myEmployee,
      employeeCount,
      departmentEmployeeCount,
      activePayrollSetupCount,
      leaveTypeCount,
    ] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { clientId, userId },
        select: { joiningDate: true },
      }),
      this.prisma.employee.count({ where: { clientId } }),
      this.prisma.employee.count({
        where: { clientId, department: { not: null } },
      }),
      this.prisma.payrollSetup.count({ where: { clientId, status: 'active' } }),
      this.prisma.leaveType.count({ where: { clientId } }),
    ]);

    const companyDone = Boolean(
      client.companyName &&
        client.companyLogoUrl &&
        client.country &&
        client.timezone,
    );
    const yourProfileDone = Boolean(myEmployee?.joiningDate);
    const orgStructureDone = departmentEmployeeCount > 0;
    const payrollDone = activePayrollSetupCount > 0;
    const leaveDone = leaveTypeCount > 0;
    const inviteDone = employeeCount > 1; // admin counts as 1

    const steps = [
      {
        key: 'company_profile',
        title: 'Company Profile',
        description:
          'Set the company name, logo, country, and timezone.',
        appRoute: '/settings/company',
        done: companyDone,
      },
      {
        key: 'your_profile',
        title: 'Your Profile',
        description:
          "Fill in your own department, job title, and joining date so your Me tab works.",
        appRoute: '/account',
        done: yourProfileDone,
      },
      {
        key: 'org_structure',
        title: 'Organisation Structure',
        description:
          'Add at least one department and job title so employees can be categorised.',
        appRoute: '/settings/company-structure',
        done: orgStructureDone,
      },
      {
        key: 'payroll_setup',
        title: 'Payroll Setup',
        description: 'Create a payroll setup with a pay schedule and salary components.',
        appRoute: '/payroll/setup',
        done: payrollDone,
      },
      {
        key: 'leave_holidays',
        title: 'Leave and Holidays',
        description:
          'Define leave types for the company such as annual leave, sick leave, etc.',
        appRoute: '/employees/settings',
        done: leaveDone,
      },
      {
        key: 'invite_team',
        title: 'Invite Your Team',
        description: 'Add your first employee to the system.',
        appRoute: '/employees',
        done: inviteDone,
      },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    const totalCount = steps.length;
    const isComplete = completedCount === totalCount;

    return {
      clientId,
      steps,
      completedCount,
      totalCount,
      isComplete,
      dismissedAt: client.setupWizardDismissedAt
        ? client.setupWizardDismissedAt.toISOString()
        : null,
      // Show banner whenever there's still work to do AND admin hasn't dismissed.
      shouldShowBanner: !isComplete && !client.setupWizardDismissedAt,
    };
  }

  /** Mark the setup banner dismissed; the wizard itself stays accessible. */
  async dismissSetupWizard(clientId: string) {
    await this.findById(clientId);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { setupWizardDismissedAt: new Date() },
    });
    return { dismissedAt: new Date().toISOString() };
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

function splitFullName(
  fullName: string | undefined,
  emailFallback: string,
): { firstName: string; lastName: string } {
  const name = (fullName ?? '').trim();
  if (name) {
    const parts = name.split(/\s+/);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }
  // Fallback so Employee.firstName (non-nullable) always has a sensible value.
  const local = emailFallback.split('@')[0] ?? '';
  return { firstName: local || 'Admin', lastName: '' };
}

/** Placeholder emp id; real flow should derive from a tenant-configurable sequence. */
function autoEmpId(): string {
  return `EMP-${Date.now().toString(36).toUpperCase()}`;
}
