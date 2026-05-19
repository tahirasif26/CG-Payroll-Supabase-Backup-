import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const isoDateOpt = isoDate.optional().nullable();

export const listLoansQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  employeeId: z.string().uuid().optional(),
  scope: z.enum(['mine', 'all']).optional(),
});
export type ListLoansQuery = z.infer<typeof listLoansQuerySchema>;

export const createLoanSchema = z.object({
  employeeId: z.string().uuid(),
  principal: bigintLike,
  monthlyDeduction: bigintLike,
  /** Basis points (10000 = 100%). 0 for interest-free. */
  interestRateBps: z.coerce.number().int().min(0).max(10000).default(0),
  startDate: isoDate,
  endDate: isoDateOpt,
  reason: z.string().trim().max(500).optional().nullable(),
});
export type CreateLoanDto = z.infer<typeof createLoanSchema>;

export const updateLoanSchema = createLoanSchema.partial().omit({ employeeId: true });
export type UpdateLoanDto = z.infer<typeof updateLoanSchema>;

export const approveLoanSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().trim().max(500).optional(),
});
export type ApproveLoanDto = z.infer<typeof approveLoanSchema>;

export const pauseLoanSchema = z.object({
  until: isoDate,
  reason: z.string().trim().max(500).optional(),
});
export type PauseLoanDto = z.infer<typeof pauseLoanSchema>;

export const adjustLoanSchema = z.object({
  type: z.enum(['prepayment', 'writeoff', 'adjustment', 'emi']),
  amount: bigintLike,
  date: isoDate,
  note: z.string().trim().max(500).optional(),
});
export type AdjustLoanDto = z.infer<typeof adjustLoanSchema>;
