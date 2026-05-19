import { Injectable } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type { JwtRoleBinding, RequestUser } from '@common/types/jwt-payload';

/**
 * Ports of Supabase RLS helper functions:
 *   - has_role(_user_id, _role)            → hasAppRole()
 *   - is_super_admin(_user_id)             → isSuperAdmin()
 *   - is_admin_or_hr_in_client(...)        → isAdminOrHrIn()
 *   - get_user_client_id(_user_id)         → primaryClientId on RequestUser
 *   - has_feature(_user_id, _feature_key)  → hasFeature()
 *
 * Role checks are answered from the JWT (fast path). Feature checks read the
 * DB because feature flags change more frequently and per-user toggles must
 * win over role defaults.
 */
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────── Role checks ────────────────────────────

  isSuperAdmin(user: RequestUser): boolean {
    return user.roles.some((r) => r.role === AppRole.super_admin);
  }

  /** True if user holds the given app role in the supplied client (or globally). */
  hasAppRole(user: RequestUser, role: AppRole, clientId?: string | null): boolean {
    if (this.isSuperAdmin(user)) return true;
    return user.roles.some(
      (r) => r.role === role && (clientId == null || r.clientId === clientId),
    );
  }

  isAdminOrHrIn(user: RequestUser, clientId: string): boolean {
    if (this.isSuperAdmin(user)) return true;
    return user.roles.some(
      (r) =>
        r.clientId === clientId &&
        (r.role === AppRole.admin || r.role === AppRole.hr),
    );
  }

  /** True if user is a member of the given client (any role). */
  isMemberOf(user: RequestUser, clientId: string): boolean {
    if (this.isSuperAdmin(user)) return true;
    return user.roles.some((r) => r.clientId === clientId);
  }

  // ─────────────────────────── Feature checks ─────────────────────────

  /**
   * Mirror of Supabase `has_feature`:
   *   1. Per-user explicit toggle (client_id + user_id) wins if present.
   *   2. Otherwise check client-wide toggle.
   *   3. Otherwise fall back to defaultEnabledForRoles on the feature definition.
   */
  async hasFeature(
    user: RequestUser,
    featureKey: string,
    clientId: string,
  ): Promise<boolean> {
    if (this.isSuperAdmin(user)) return true;

    // 1. per-user override
    const userToggle = await this.prisma.featureToggle.findUnique({
      where: {
        clientId_userId_featureKey: {
          clientId,
          userId: user.id,
          featureKey,
        },
      },
      select: { isEnabled: true },
    });
    if (userToggle) return userToggle.isEnabled;

    // 2. client-wide toggle (userId null)
    const clientToggle = await this.prisma.featureToggle.findFirst({
      where: { clientId, userId: null, featureKey },
      select: { isEnabled: true },
    });
    if (clientToggle) return clientToggle.isEnabled;

    // 3. role default
    const def = await this.prisma.featureDefinition.findUnique({
      where: { featureKey },
      select: { defaultEnabledForRoles: true },
    });
    if (!def) return false;

    const userClientRoles = user.roles
      .filter((r) => r.clientId === clientId)
      .map((r) => r.role);
    return userClientRoles.some((r) => def.defaultEnabledForRoles.includes(r));
  }

  /** Reloads the role bindings stored on the user from the DB. Used after role mutations. */
  async loadRoles(userId: string): Promise<JwtRoleBinding[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        clientId: true,
        roleId: true,
        role: { select: { appRole: true } },
      },
    });
    return rows.map((r) => ({
      role: r.role.appRole,
      clientId: r.clientId,
      roleId: r.roleId,
    }));
  }
}
