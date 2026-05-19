import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiClientError } from "./errors";
import { tokenStorage } from "./token-storage";
import type { ApiResponse } from "./types";

const API_URL = (import.meta as ImportMeta & { env: Record<string, string> }).env
  .VITE_API_URL as string | undefined;

if (!API_URL) {
  // Keep the message actionable — surface in console once at module load.
  // eslint-disable-next-line no-console
  console.warn(
    "[api] VITE_API_URL is not set. The src/api/ service layer will not function until it is configured."
  );
}

// ─── Cross-tab signaling for forced logout ───────────────────────────────────

type AuthEvent = "unauthenticated";
const authListeners = new Set<(event: AuthEvent) => void>();
export function onAuthEvent(listener: (event: AuthEvent) => void): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}
function emitAuthEvent(event: AuthEvent) {
  for (const fn of authListeners) fn(event);
}

// ─── Refresh-in-flight queue ─────────────────────────────────────────────────
// Multiple parallel requests can all 401 simultaneously after a token expires.
// We refresh once and resume the rest with the new token.

type Pending = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let refreshInFlight: Promise<string> | null = null;
const refreshQueue: Pending[] = [];

function flushQueue(token: string | null, err?: unknown) {
  while (refreshQueue.length) {
    const p = refreshQueue.shift()!;
    if (token) p.resolve(token);
    else p.reject(err);
  }
}

// ─── Axios instance ──────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL ?? "/api/v1",
  withCredentials: false, // Phase 2 uses Bearer tokens; cookies in a later phase
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Request interceptor: attach Authorization + X-Client-Id if available.
apiClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);
  const token = tokenStorage.getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const clientId = tokenStorage.getActiveClientId();
  if (clientId && !headers.has("X-Client-Id")) {
    headers.set("X-Client-Id", clientId);
  }
  config.headers = headers;
  return config;
});

// Response interceptor: unwrap envelope on success; refresh on 401; normalize errors.
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    // Network / CORS / timeout — no envelope to parse.
    if (!error.response) {
      throw new ApiClientError(0, {
        code: "NETWORK_ERROR",
        message: error.message || "Network error",
      });
    }

    const { status, data, config } = error.response;
    const original = config as InternalAxiosRequestConfig & { _retried?: boolean };
    const requestUrl = original?.url ?? "";

    // Try refresh on 401 — except when the failing call IS the refresh endpoint
    // (or login) itself; otherwise we'd infinite-loop.
    const isAuthCall =
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register");

    if (status === 401 && !isAuthCall && !original._retried) {
      original._retried = true;
      try {
        const newToken = await ensureRefreshed();
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        original.headers = headers;
        return apiClient.request(original);
      } catch (refreshErr) {
        tokenStorage.clear();
        emitAuthEvent("unauthenticated");
        throw toApiClientError(refreshErr) ?? new ApiClientError(401, {
          code: "REFRESH_FAILED",
          message: "Session expired",
        });
      }
    }

    throw new ApiClientError(status, data?.error ?? {
      code: `HTTP_${status}`,
      message: error.message || `Request failed with status ${status}`,
    });
  }
);

async function ensureRefreshed(): Promise<string> {
  if (refreshInFlight) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  refreshInFlight = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new ApiClientError(401, {
        code: "NO_REFRESH_TOKEN",
        message: "No refresh token available",
      });
    }
    // Use a raw axios call (bypass our interceptors to avoid recursion).
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_URL ?? "/api/v1"}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const payload = res.data?.data;
    if (!payload?.accessToken || !payload?.refreshToken) {
      throw new ApiClientError(500, {
        code: "INVALID_REFRESH_RESPONSE",
        message: "Refresh response missing tokens",
      });
    }
    tokenStorage.setTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });
    return payload.accessToken;
  })();

  try {
    const token = await refreshInFlight;
    flushQueue(token);
    return token;
  } catch (err) {
    flushQueue(null, err);
    throw err;
  } finally {
    refreshInFlight = null;
  }
}

function toApiClientError(err: unknown): ApiClientError | null {
  return err instanceof ApiClientError ? err : null;
}

// ─── Typed helpers that unwrap the envelope ──────────────────────────────────
// Every successful response is `{ success: true, data: T, meta?: ... }`. These
// helpers extract `data` so callers don't repeat the unwrap pattern.

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(url, { params });
  return assertData(res);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(url, body);
  return assertData(res);
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<ApiResponse<T>>(url, body);
  return assertData(res);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<ApiResponse<T>>(url, body);
  return assertData(res);
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await apiClient.delete<ApiResponse<T>>(url);
  return assertData(res);
}

/** Variant that returns the full envelope when callers need pagination meta. */
export async function apiGetWithMeta<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const res = await apiClient.get<ApiResponse<T>>(url, { params });
  return res.data;
}

function assertData<T>(res: AxiosResponse<ApiResponse<T>>): T {
  if (!res.data?.success) {
    throw new ApiClientError(res.status, res.data?.error ?? {
      code: "UNEXPECTED_RESPONSE",
      message: "Response did not contain success envelope",
    });
  }
  return res.data.data as T;
}
