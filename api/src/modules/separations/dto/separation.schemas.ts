import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));

export const listSeparationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'approved', 'processed', 'cancelled']).optional(),
});
export type ListSeparationsQuery = z.infer<typeof listSeparationsQuerySchema>;

export const createSeparationSchema = z.object({
  employeeId: z.string().uuid(),
  lastWorkingDate: isoDate,
  reason: z.string().trim().max(500).optional().nullable(),
  type: z.enum(['resignation', 'termination', 'end_of_contract', 'retirement']),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).default(0),
  noticePeriodServed: z.boolean().default(true),
  unpaidSalaryMinor: bigintLike.optional(),
  leaveEncashmentMinor: bigintLike.optional(),
  noticePeriodPayMinor: bigintLike.optional(),
  loanDeductionMinor: bigintLike.optional(),
});
export type CreateSeparationDto = z.infer<typeof createSeparationSchema>;

export const eosbCalcSchema = z.object({
  lastBasic: bigintLike,
  joiningDate: isoDate,
  lastWorkingDate: isoDate,
  reason: z.enum(['resignation', 'termination', 'end_of_contract', 'retirement']),
  country: z.enum(['SA', 'AE']),
});
export type EosbCalcDto = z.infer<typeof eosbCalcSchema>;
