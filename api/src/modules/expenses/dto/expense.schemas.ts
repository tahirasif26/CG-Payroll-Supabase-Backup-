import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

export const listExpensesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid']).optional(),
  employeeId: z.string().uuid().optional(),
  category: z.string().trim().optional(),
  scope: z.enum(['mine', 'all']).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

export const createExpenseSchema = z.object({
  employeeId: z.string().uuid().optional(),
  category: z.string().trim().max(80).optional().nullable(),
  amount: bigintLike,
  currency: z.string().trim().min(3).max(3).toUpperCase().default('AED'),
  expenseDate: isoDate,
  description: z.string().trim().max(500).optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
  projectCode: z.string().trim().max(40).optional().nullable(),
  /** Default `draft`; pass `submitted` to skip the explicit /submit step. */
  status: z.enum(['draft', 'submitted']).default('draft'),
});
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial().omit({ employeeId: true });
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;

export const decideExpenseSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().trim().max(500).optional(),
});
export type DecideExpenseDto = z.infer<typeof decideExpenseSchema>;
