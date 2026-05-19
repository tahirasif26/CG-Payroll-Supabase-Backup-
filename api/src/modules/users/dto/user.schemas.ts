import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
