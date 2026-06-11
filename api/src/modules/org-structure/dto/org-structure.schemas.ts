import { z } from 'zod';

/** Generic name-only lookup row used by Divisions + Departments. */
export const createNamedLookupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean().optional(),
});
export type CreateNamedLookupDto = z.infer<typeof createNamedLookupSchema>;

export const updateNamedLookupSchema = createNamedLookupSchema.partial();
export type UpdateNamedLookupDto = z.infer<typeof updateNamedLookupSchema>;

/** Designations carry a numeric seniority level alongside the name. */
export const createDesignationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  level: z.coerce.number().int().min(1).max(10).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreateDesignationDto = z.infer<typeof createDesignationSchema>;

export const updateDesignationSchema = createDesignationSchema.partial();
export type UpdateDesignationDto = z.infer<typeof updateDesignationSchema>;
