/**
 * Canonical enterprise API envelope. Every successful and failed response shares
 * the same shape so the frontend has a single response contract.
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
  /** Field-level validation errors keyed by dotted field path. */
  fields?: Record<string, string[]>;
  /** Correlation id for tracing in logs. */
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
