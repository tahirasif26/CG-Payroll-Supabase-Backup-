import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const isoDateOpt = isoDate.optional().nullable();

export const listAssetsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['in_stock', 'assigned', 'in_repair', 'retired', 'lost']).optional(),
  category: z.string().trim().optional(),
  assignedToId: z.string().uuid().optional(),
});
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;

export const createAssetSchema = z.object({
  assetTag: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
  condition: z.string().trim().max(40).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  purchaseDate: isoDateOpt,
  purchaseCost: bigintLike.optional(),
  warrantyExpiry: isoDateOpt,
  serviceDueDate: isoDateOpt,
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type CreateAssetDto = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial().omit({ assetTag: true });
export type UpdateAssetDto = z.infer<typeof updateAssetSchema>;

export const assignAssetSchema = z.object({
  assignedToId: z.string().uuid(),
  assignedDate: isoDateOpt,
  note: z.string().trim().max(500).optional(),
});
export type AssignAssetDto = z.infer<typeof assignAssetSchema>;

export const unassignAssetSchema = z.object({
  note: z.string().trim().max(500).optional(),
  status: z.enum(['in_stock', 'in_repair', 'retired', 'lost']).default('in_stock'),
});
export type UnassignAssetDto = z.infer<typeof unassignAssetSchema>;
