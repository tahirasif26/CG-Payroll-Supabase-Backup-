import { z } from 'zod';
import { passwordSchema, emailSchema } from '@modules/auth/dto/auth.schemas';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

const tabKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, 'Tab key must be module.key (lowercase)');

export const createTenantSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  companySlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(64)
    .regex(slugRegex, 'Slug must be lowercase letters, digits, hyphens'),
  companyEmail: emailSchema,
  companyPhone: z.string().trim().max(40).optional(),
  companyLogoUrl: z.string().trim().url().max(2048).optional(),
  country: z.string().trim().min(2).max(2).toUpperCase(),
  timezone: z.string().trim().min(1).max(64),
  baseCurrency: z.string().trim().min(3).max(3).toUpperCase(),
  subscriptionPlan: z.enum(['starter', 'pro', 'enterprise']).default('starter'),

  /**
   * Tab keys this tenant's users can access. Empty array = locked workspace.
   * Validated for shape only; the FE's TAB_DEFINITIONS is the canonical list.
   */
  enabledTabKeys: z.array(tabKeySchema).max(200).optional(),

  /** Optional: create the first admin user atomically with the tenant. */
  initialAdmin: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      fullName: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),

  /**
   * Optional: email the admin a sign-up invitation link instead of bootstrapping
   * with a password. Used by the super-admin AddClient wizard. Mutually
   * exclusive with `initialAdmin`.
   */
  adminInvite: z
    .object({
      email: emailSchema,
      fullName: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
});
export type CreateTenantDto = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema
  .omit({ companySlug: true, initialAdmin: true })
  .partial()
  .extend({
    /** Suspend / reactivate / mark trial. Suspended clients can't log in. */
    status: z.enum(['active', 'suspended', 'trial']).optional(),
  });
export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;
