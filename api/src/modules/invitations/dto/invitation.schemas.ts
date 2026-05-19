import { z } from 'zod';
import { emailSchema, passwordSchema } from '@modules/auth/dto/auth.schemas';

export const createInvitationSchema = z.object({
  email: emailSchema,
  appRole: z.enum(['admin', 'hr', 'employee']),
  /** Optional pre-fill for the Employee record created on acceptance. */
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  empId: z.string().trim().min(1).max(40).optional(),
  department: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
  /** Optional custom Role row inside the client (must belong to the active client). */
  roleId: z.string().uuid().optional(),
});
export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120).optional(),
});
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
