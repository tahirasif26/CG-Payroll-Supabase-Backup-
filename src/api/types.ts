/**
 * Mirrors the NestJS API response envelope.
 * Backend definition: api/src/common/dto/api-response.dto.ts
 *
 * Keeping these in sync manually for Phase 2. In a later hardening phase we'll
 * generate this from the backend's OpenAPI spec so it can never drift.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  traceId?: string;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}
