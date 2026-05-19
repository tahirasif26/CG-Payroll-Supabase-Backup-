import type { ApiError } from "./types";

/**
 * Thrown by the API client whenever the backend returns a non-success response
 * (or the network fails). Components and React Query hooks catch this to show
 * field-level validation errors and friendly messages.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;
  readonly traceId?: string;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = error.code;
    this.fields = error.fields;
    this.traceId = error.traceId;
  }

  isValidation(): boolean {
    return this.code === "VALIDATION_ERROR" || this.status === 400;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  /** Concise summary suitable for toast notifications. */
  toToastMessage(): string {
    if (this.fields) {
      const first = Object.entries(this.fields)[0];
      if (first) return `${first[0]}: ${first[1][0]}`;
    }
    return this.message;
  }
}

/**
 * Type guard so callers can narrow `unknown` from catch blocks without
 * importing the class everywhere.
 */
export function isApiClientError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}
