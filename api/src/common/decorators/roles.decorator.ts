import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '@prisma/client';

export const ROLES_KEY = 'requiredRoles';

/**
 * Restrict a route to users holding one or more of the given app roles in
 * the active client scope. Combine with @ClientScope() on the route or
 * controller to bind the request to a tenant.
 *
 *   @Roles('admin', 'hr')
 *   @Get('payroll/runs')
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
