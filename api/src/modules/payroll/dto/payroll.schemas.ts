import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));

// ─── Setups ──────────────────────────────────────────────────────────────────

export const componentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(['earning', 'deduction']),
  calculationType: z.enum(['fixed', 'percentage', 'formula']),
  value: bigintLike.default('0'),
  formula: z.string().trim().max(500).optional().nullable(),
  orderIndex: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type ComponentInput = z.infer<typeof componentInputSchema>;

export const taxRuleInputSchema = z.object({
  id: z.string().uuid().optional(),
  slabName: z.string().trim().min(1).max(120),
  incomeFromMinor: bigintLike,
  incomeToMinor: bigintLike.optional().nullable(),
  rateBps: z.coerce.number().int().min(0).max(10000),
  orderIndex: z.coerce.number().int().default(0),
});
export type TaxRuleInput = z.infer<typeof taxRuleInputSchema>;

export const createPayrollSetupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  country: z.string().trim().min(2).max(2).toUpperCase(),
  currency: z.string().trim().min(3).max(3).toUpperCase(),
  payFrequency: z.enum(['monthly', 'biweekly', 'weekly']).default('monthly'),
  yearEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable(),
  options: z.record(z.unknown()).default({}),
  components: z.array(componentInputSchema).default([]),
  taxRules: z.array(taxRuleInputSchema).default([]),
});
export type CreatePayrollSetupDto = z.infer<typeof createPayrollSetupSchema>;

export const updatePayrollSetupSchema = createPayrollSetupSchema.partial();
export type UpdatePayrollSetupDto = z.infer<typeof updatePayrollSetupSchema>;

// ─── Runs ────────────────────────────────────────────────────────────────────

export const listPayrollRunsQuerySchema = paginationQuerySchema.extend({
  setupId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  status: z.enum(['draft', 'calculated', 'pending_approval', 'approved', 'completed', 'cancelled']).optional(),
});
export type ListPayrollRunsQuery = z.infer<typeof listPayrollRunsQuerySchema>;

export const createPayrollRunSchema = z.object({
  payrollSetupId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});
export type CreatePayrollRunDto = z.infer<typeof createPayrollRunSchema>;

export const oneOffAdjustmentSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  amountMinor: bigintLike,
  type: z.enum(['earning', 'deduction']),
});
export type OneOffAdjustmentDto = z.infer<typeof oneOffAdjustmentSchema>;
