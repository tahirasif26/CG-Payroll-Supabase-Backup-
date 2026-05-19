import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURES_KEY = 'requiredFeatures';

/**
 * Restrict a route to users with all of the listed feature keys enabled
 * (per-user toggle, falling back to role defaults). Equivalent to the
 * Supabase `public.has_feature(_user_id, _feature_key)` check.
 *
 *   @RequireFeature('payroll.run')
 *   @Post('payroll/runs')
 */
export const RequireFeature = (...featureKeys: string[]) =>
  SetMetadata(REQUIRED_FEATURES_KEY, featureKeys);
