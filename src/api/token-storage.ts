/**
 * Persistent storage for the access + refresh JWT pair.
 *
 * Phase 2: localStorage to mirror Supabase's current pattern. This is XSS-
 * exposed by design choice — the existing app stores Supabase sessions the
 * same way, so we're not adding new attack surface.
 *
 * Hardening (Phase 10) will move refresh tokens to httpOnly cookies and add
 * CSRF protection.
 */

const ACCESS_KEY = "cg.api.accessToken";
const REFRESH_KEY = "cg.api.refreshToken";
const ACTIVE_CLIENT_KEY = "cg.api.activeClientId";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn();
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return safeGet(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    return safeGet(REFRESH_KEY);
  },
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    safeSet(ACCESS_KEY, tokens.accessToken);
    safeSet(REFRESH_KEY, tokens.refreshToken);
    notify();
  },
  clear() {
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
    safeSet(ACTIVE_CLIENT_KEY, null);
    notify();
  },

  /** Active client id sent as `X-Client-Id` on scoped endpoints. */
  getActiveClientId(): string | null {
    return safeGet(ACTIVE_CLIENT_KEY);
  },
  setActiveClientId(id: string | null) {
    safeSet(ACTIVE_CLIENT_KEY, id);
    notify();
  },

  /** Subscribe to token/client-scope changes (used by AuthProvider, etc.). */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export type TokenStorage = typeof tokenStorage;
