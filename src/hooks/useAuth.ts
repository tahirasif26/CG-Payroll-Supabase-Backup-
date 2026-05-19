/**
 * Phase 2.1 cutover: this hook is now backed by the NestJS API via
 * `src/providers/AuthProvider`. The Supabase-based implementation has been
 * removed; all 20+ consumers continue to work because the exported types and
 * shape are preserved.
 *
 * The AuthProvider must wrap the app (see `src/App.tsx`). Calling `useAuth`
 * outside the provider throws an explicit error.
 */
export { useAuthContext as useAuth } from "@/providers/AuthProvider";
export type {
  AppRole,
  Profile,
  AuthState,
  SessionLike,
  UserLike,
  AuthContextValue,
} from "@/providers/AuthProvider";
