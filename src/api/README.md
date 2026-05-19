# `src/api/` — Frontend service layer

Typed, React Query–ready client for the cg-payroll NestJS backend. This is the **seam** that lets us migrate modules off Supabase one at a time without touching call sites again.

## What's here today (Phase 2)

| Module | Status | Backend coverage |
|---|---|---|
| `auth/` | Live (NestJS) | login, register, refresh, logout, forgot/reset, verify-email |
| `users/` | Live (NestJS) | /me, profile, password change, effective-features |
| `tenants/` | Live (NestJS) | CRUD |
| `invitations/` | Live (NestJS) | list, create, resend, revoke, accept |
| `employees/` | Live (NestJS) | list, findById, me, create, update, archive **+ profile + updateProfile** — addresses / bank / emergency / education / documents / compensation all available |
| `notifications/` | Live (NestJS) | list, unreadCount (polled), markRead, markAllRead, delete |
| `audit/` | Live (NestJS) | list (admin only) |
| `leave/` | Live (NestJS) | types CRUD, balances upsert, requests submit/decide/cancel, holidays CRUD |
| `expenses/` | Live (NestJS) | CRUD + submit + decide + markPaid lifecycle |
| `advances/` | Live (NestJS) | CRUD + submit + decide + settle + cancel lifecycle |
| `loans/` | Live (NestJS) | create + decide (auto-disburse) + pause/resume + adjust (EMI / prepayment / writeoff) |
| `assets/` | Live (NestJS) | CRUD + assign/unassign with history audit |
| Payroll / Performance / Approval workflow engine / Reminders | **Not yet here** — Phase 5+ |

## Migrating a Supabase caller to the new layer

When you cut over a page or hook from `supabase.from(...)` to the new API:

```diff
- import { supabase } from "@/integrations/supabase/client";
+ import { useEmployees, isApiClientError } from "@/api";

- const { data, error } = await supabase
-   .from("employees")
-   .select("*")
-   .eq("client_id", clientId)
-   .order("first_name");
+ const { data, isLoading, error } = useEmployees({ pageSize: 50 });
+ const items = data?.data ?? [];                 // unwrap envelope
+ const total = data?.meta?.pagination?.total;    // when needed
```

Key differences:
- The new API is **client-scoped automatically** via the `X-Client-Id` header the axios interceptor sets — no need to pass `client_id` filter manually.
- Errors are `ApiClientError` instances (use `isApiClientError(e)` + `e.fields` for field-level validation feedback).
- Field names are `camelCase` (matching the backend DTO), not snake_case.
- The list endpoint returns paginated data — use the envelope's `meta.pagination` for page controls.

The existing `useAuth.ts`, contexts (`RoleContext`, etc.) and `supabase.from(...)` calls are **untouched** by Phase 2. You can layer the new API in incrementally.

## Folder convention

Each module follows the same three-file shape:

```
<module>/
├── <module>.types.ts    # request + response shapes (manually mirrored from backend)
├── <module>.api.ts      # raw HTTP functions — no React, easy to unit-test
└── <module>.hooks.ts    # React Query wrappers: queryKeys, useFoo / useCreateFoo / ...
```

This separation means:
- **Server-side or test code** can import `<module>.api` without pulling React.
- **Components** import the hooks for cache management, loading state, optimistic updates.

## Usage

```ts
import { useLogin, useMe } from "@/api";
import { isApiClientError } from "@/api";

function LoginForm() {
  const login = useLogin();
  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login.mutateAsync(data);
    } catch (e) {
      if (isApiClientError(e) && e.isValidation()) {
        // show field-level errors via e.fields
      }
    }
  };
  // ...
}

function Header() {
  const { data: me } = useMe();
  return <span>{me?.profile?.fullName ?? me?.email}</span>;
}
```

## How auth works

1. `useLogin`/`useRegister` → backend issues `{ accessToken, refreshToken }`.
2. Tokens are stored in `localStorage` (XSS exposure intentional — matches existing Supabase pattern. Hardening Phase 10 moves refresh tokens to httpOnly cookies).
3. Axios request interceptor attaches `Authorization: Bearer <access>` and `X-Client-Id: <active>` automatically.
4. On 401, the response interceptor calls `/auth/refresh` **once** (parallel requests queue and resume with the new token). On refresh failure the cache is cleared and an `unauthenticated` event fires for the host app to react to.
5. `useLogout` clears the cache and revokes the refresh token server-side.

Subscribe to forced-logout events with `onAuthEvent`:

```ts
import { onAuthEvent } from "@/api";

useEffect(() => onAuthEvent((e) => {
  if (e === "unauthenticated") navigate("/auth");
}), []);
```

## Configuration

`.env`:
```
VITE_API_URL=http://localhost:3001/api/v1
```

Without `VITE_API_URL` the layer logs a warning but doesn't crash — modules that haven't migrated still work because they use `@/integrations/supabase/client` directly.

## Adding a new module (template)

When you start porting (e.g.) employees in Phase 3:

```sh
src/api/employees/
├── employees.types.ts
├── employees.api.ts
└── employees.hooks.ts
```

Then add the exports to `src/api/index.ts`. Reuse `apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `client.ts` so every module benefits from the same auth + refresh + error normalization.

Type-safety contract: every `T` you specify on `apiGet<T>(...)` is what comes back inside the envelope's `data` field — the helpers unwrap it for you.

## Error handling

`ApiClientError` is thrown on every non-success response and network failure. Useful predicates:

```ts
err.isValidation()    // status 400 / VALIDATION_ERROR — has err.fields
err.isUnauthorized()  // 401
err.isForbidden()     // 403
err.isNotFound()      // 404
err.isConflict()      // 409
err.toToastMessage()  // friendly one-liner for sonner/toast
```

## What this layer deliberately does NOT do

- Subscribe to realtime channels (deferred to Phase 8 — WebSocket gateway).
- Wrap Supabase calls that haven't been ported. There's no point standardizing a wrapper around a system we're removing — each module gets ported directly to NestJS in its phase.
- Manage auth UI state (login form, current-user context). Phase 2 ships just the data layer; the new AuthProvider lands when we cut over `useAuth.ts` / `RoleContext` in a focused subsequent step.
