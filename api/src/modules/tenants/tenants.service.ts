import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppRole, ClientStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.client.findUnique({
      where: { companySlug: dto.companySlug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: 'Company slug is already in use',
      });
    }

    return this.prisma.$transaction(async (tx) => {
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
        return { client, adminUserId: adminUser.id };
      }

      return { client, adminUserId: null };
    });
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
}
