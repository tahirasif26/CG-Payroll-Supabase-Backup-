import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as accessible without authentication. Read by the JwtAuthGuard
 * (added in Phase 1) to short-circuit auth.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
