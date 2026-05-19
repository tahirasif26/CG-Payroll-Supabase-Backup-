import { Injectable, NotFoundException } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type { UpdateProfileDto } from './dto/user.schemas';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the user's effective feature key set in the given client scope.
   * Mirrors the Supabase RLS helper `has_feature` for every known feature:
   *   1. Per-user toggle (client_id + user_id) wins.
   *   2. Otherwise client-wide toggle.
   *   3. Otherwise default-enabled-for-roles on the feature definition.
   *
   * Super-admins get every key.
   */
  async effectiveFeatures(userId: string, clientId: string | null): Promise<string[]> {
    const allFeatures = await this.prisma.featureDefinition.findMany({
      select: { featureKey: true, defaultEnabledForRoles: true, module: true },
    });

    // Super-admin always gets everything.
    const isSuperAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId,
        clientId: null,
        role: { appRole: AppRole.super_admin },
      },
    });
    if (isSuperAdmin) {
      return allFeatures.map((f) => f.featureKey);
    }

    if (!clientId) return [];

    const userClientRoles = await this.prisma.userRole.findMany({
      where: { userId, clientId },
      select: { role: { select: { appRole: true } } },
    });
    const appRoles = userClientRoles.map((r) => r.role.appRole);

    const toggles = await this.prisma.featureToggle.findMany({
      where: {
        clientId,
        OR: [{ userId }, { userId: null }],
      },
      select: { userId: true, featureKey: true, isEnabled: true },
    });
    // Index toggles: user-specific wins over client-wide.
    const userToggleMap = new Map<string, boolean>();
    const clientToggleMap = new Map<string, boolean>();
    for (const t of toggles) {
      if (t.userId === userId) userToggleMap.set(t.featureKey, t.isEnabled);
      else clientToggleMap.set(t.featureKey, t.isEnabled);
    }

    return allFeatures
      .filter((f) => {
        const userToggle = userToggleMap.get(f.featureKey);
        if (userToggle !== undefined) return userToggle;
        const clientToggle = clientToggleMap.get(f.featureKey);
        if (clientToggle !== undefined) return clientToggle;
        return appRoles.some((r) => f.defaultEnabledForRoles.includes(r));
      })
      .map((f) => f.featureKey);
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: { select: { id: true, name: true, appRole: true } },
            client: { select: { id: true, companyName: true, companySlug: true } },
          },
        },
        employee: {
          select: {
            id: true,
            clientId: true,
            empId: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            status: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    // Strip sensitive fields before returning.
    const { passwordHash: _ph, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: dto.fullName ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        phone: dto.phone ?? null,
      },
      update: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
    });
  }
}
