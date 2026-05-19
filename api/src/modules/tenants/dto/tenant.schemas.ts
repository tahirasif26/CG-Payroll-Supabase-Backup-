import { z } from 'zod';
import { passwordSchema, emailSchema } from '@modules/auth/dto/auth.schemas';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

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
  country: z.string().trim().min(2).max(2).toUpperCase(),
  timezone: z.string().trim().min(1).max(64),
  baseCurrency: z.string().trim().min(3).max(3).toUpperCase(),
  subscriptionPlan: z.enum(['starter', 'pro', 'enterprise']).default('starter'),

  /** Optional: create the first admin user atomically with the tenant. */
  initialAdmin: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      fullName: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
});
export type CreateTenantDto = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema
  .omit({ companySlug: true, initialAdmin: true })
  .partial();
export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;
