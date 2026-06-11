import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Directory-style pages (Employees / Assets) request `pageSize: 500` for a
  // single-shot load; the 1000 ceiling is a soft guardrail — anything above
  // that probably wants cursor pagination instead.
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function buildSkipTake(q: PaginationQuery) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}
