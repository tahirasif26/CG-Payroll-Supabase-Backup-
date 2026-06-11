# CG Payroll — End-to-End Flow Documentation

> Audience: engineers new to the codebase. This document explains every major user-facing business flow end-to-end so you can follow the path from the click in the UI to the row in PostgreSQL without spelunking the repo.

**Tech stack at a glance**

- **Backend:** NestJS 11 + Prisma 6 + PostgreSQL 16. Modular monolith under `api/src/modules/*` with a shared `PrismaService`, `MailService` (Resend), `StorageService` (local FS / S3), and a global request-envelope interceptor (`{ success, data, meta? }`).
- **Auth:** JWT access (`15m`) + rotating refresh (`7d`) with family-replay detection. Four cross-cutting guards layer on every protected route: `JwtAuthGuard` → `ClientScopeGuard` → `RolesGuard` → `FeatureGuard` (see §5).
- **Multi-tenancy:** `Client` row per tenant. Almost every domain table has a `clientId` FK; the active client scope is resolved from `X-Client-Id` header → route param → `user.primaryClientId`.
- **Frontend:** Vite + React + Tailwind + React Query. Service layer at `src/api/<domain>/{api,hooks,types}.ts`; context providers under `src/contexts` wrap the long-lived domain queries (employees, payroll setups, assets, leave types).

**How to read this document**

Each section is self-contained and follows the same shape: Overview → Entry Point → Step-by-Step Walkthrough → Validation & Business Rules → Outcomes → Related Endpoints. Code references use `file:line` so you can jump straight to the source.


## Table of Contents

1. [Tenant / Client Onboarding](#1-tenant-onboarding)
2. [Authentication (Register / Login / Refresh / Logout)](#2-authentication)
3. [Password Recovery & Email Verification](#3-password-recovery-email-verification)
4. [Invitations (Create / Resend / Revoke / Accept)](#4-invitations)
5. [Authorization (JwtAuthGuard / RolesGuard / FeatureGuard / ClientScopeGuard)](#5-rbac-authorization)
6. [Per-Tenant Tab / Module Access](#6-tab-module-access)
7. [Tenant Setup-Wizard Progress](#7-tenant-setup-wizard)
8. [Employee Onboarding (Create + Optional Invite)](#8-employee-onboarding)
9. [Employee Profile Update (Sub-records)](#9-employee-profile-update)
10. [Org Structure (Divisions / Departments / Designations)](#10-org-structure)
11. [Leave Management (Types / Balances / Requests / Holidays)](#11-leave-management)
12. [Expense Claim Lifecycle](#12-expenses)
13. [Salary Advance Lifecycle](#13-advances)
14. [Loan Lifecycle](#14-loans)
15. [Asset Management](#15-assets)
16. [Payroll Setup Configuration](#16-payroll-setup)
17. [Payroll Run Lifecycle](#17-payroll-run)
18. [Approval Workflow Engine](#18-approvals-engine)
19. [Performance Reviews](#19-performance)
20. [Separations & End-of-Service Benefits](#20-separations-eosb)
21. [In-App Notifications](#21-notifications)
22. [Reminders (Document Expiry, Birthdays, etc.)](#22-reminders)
23. [Mail Delivery (Resend)](#23-mail-delivery)
24. [Audit Logging](#24-audit-log)

---

<a id="1-tenant-onboarding"></a>

## 1. Tenant / Client Onboarding

### Overview
The Tenant/Client Onboarding flow provisions a new tenant (company) in the system with an optional initial admin user or admin invitation. A super-admin (or bootstrap user on a clean install) submits a multi-step wizard via the public `POST /tenants` endpoint, triggering an atomic transaction that creates the client, seeds default roles, optionally creates/invites an admin user with an Employee record, and dispatches an invitation email if needed. This flow bridges the gap between tenant provisioning and first-login setup, ensuring no half-state orphaned users or role assignments.

### Entry Point
**`POST /api/v1/tenants`** — initiated by the `AddClientWizard` component in the super-admin dashboard. The endpoint is marked `@Public()` during the bootstrap phase (before a super_admin user exists); at production scale it should be gated with `@Roles('super_admin')`. The wizard is a 4-step dialog (3 steps for edit mode):
- Step 1: Company Information (name, email, phone, country, timezone, currency)
- Step 2: Admin Account & Plan (admin name/email, subscription plan, status)
- Step 3: Tab Access (module/feature enablement via checkboxes)
- Step 4: Review & Confirm (summary before submission)

### Step-by-Step Walkthrough
1. **User opens the Add Client Wizard** → `src/components/clients/AddClientWizard.tsx:139–703` initializes a 4-step form dialog with blank state or populated from an existing client in edit mode.

2. **User fills Step 1 (company info)** → form state updates locally; validation runs via `step1Schema` (Zod) on Next. Country name is converted to ISO-2 code, timezone/currency auto-populated from `COUNTRIES` list.

3. **User fills Step 2 (admin account)** → in create mode, captures `admin_full_name` and `admin_email`; both are optional (if empty, no admin invite is sent). Subscription plan and status are selected from radio buttons.

4. **User selects Step 3 (tab access)** → checkboxes toggle `enabled_tab_keys` (array of module.key strings like "employees.list"). Modules are grouped and expandable; individual tabs can be toggled or entire modules can be checked at once.

5. **User reviews Step 4 and submits** → `handleSubmit()` calls `useCreateClient().mutateAsync(payload)` at `src/components/clients/AddClientWizard.tsx:281`.

6. **Frontend adapter transforms the payload** → `src/hooks/queries/useClients.ts:104–122` converts camelCase form fields to snake_case, derives `companySlug` from `company_name` using `makeSlug()`, and converts the country display name to ISO-2 code via `toIsoCountry()`. If `admin_email` is present, it wraps it in `adminInvite { email, fullName }`.

7. **Backend controller receives the request** → `api/src/modules/tenants/tenants.controller.ts:62–67` validates the payload against `createTenantSchema` via `ZodValidationPipe`, then calls `this.tenants.create(dto, user?.id ?? null)` (passing the calling user's ID for audit, or null if public).

8. **Service begins atomic transaction** → `api/src/modules/tenants/tenants.service.ts:43–268`:
   - Validates that neither `initialAdmin` nor `adminInvite` are both provided (throws `CONFLICTING_ADMIN_FIELDS` if both set)
   - Checks `companySlug` uniqueness; throws `SLUG_TAKEN` (HTTP 409) if exists
   - If `adminInvite.email` is provided, validates that email is not already in use; throws `EMAIL_TAKEN` (HTTP 409) if conflict

9. **Transaction creates the Client row** → `tx.client.create()` inserts into the `clients` table with `status: ClientStatus.active`, `subscriptionPlan`, `enabledTabKeys`, etc.

10. **Transaction seeds default roles** → creates two system roles scoped to the new client:
    - `Admin` with `appRole: AppRole.admin`, `isSystem: true`
    - `Employee` with `appRole: AppRole.employee`, `isSystem: true`

11. **Transaction handles admin bootstrap (Path A: initialAdmin)** → if `dto.initialAdmin` is provided:
    - Creates a User with `emailVerifiedAt: now()` (implicitly verified), `status: active`, password hashed via `PasswordService.hash()`
    - Creates a UserRole binding the user to the Admin role
    - Creates an Employee record with auto-generated `empId` (placeholder format `EMP-{timestamp.base36}`)
    - Returns `{ client, adminUserId, invitation: null }`

12. **Transaction handles admin bootstrap (Path B: adminInvite)** → if `dto.adminInvite.email` is provided:
    - Generates 32-byte random token (hex), hashes it with SHA256 for storage
    - Creates a User with `passwordHash: null`, `status: pending`, `emailVerifiedAt: null` (waiting for invitation acceptance)
    - Creates a UserRole binding the user to the Admin role
    - Creates an Employee record for the admin
    - Creates an Invitation row with `status: pending`, `tokenHash`, `expiresAt: now() + INVITATION_TTL_DAYS`, `appRole: admin`
    - Returns `{ client, adminUserId, invitation: { id, email, tokenPlain } }`

13. **Transaction commits** → all rows are persisted atomically; if any step fails, the entire provisioning rolls back.

14. **Post-commit mail dispatch** → if an invitation was created, `MailService.sendInvitation()` at `api/src/infrastructure/mail/mail.service.ts:95–111` is called with the plaintext token. The mail service:
    - Constructs an invitation URL: `{FRONTEND_URL}/accept-invite?token={tokenPlain}`
    - Renders an HTML email via `renderInvitationEmail()` with company name and recipient name
    - Sends via Resend (or logs to console if `RESEND_API_KEY` is empty)
    - Returns `{ ok: boolean, id?, error? }` (never throws)

15. **Controller returns response** → `tenants.create()` returns the client, optionally includes the invitation with `emailSent: boolean` and `emailError` if delivery failed.

16. **Frontend receives and toasts** → `AddClientWizard` at line 283–296 checks `invitation?.emailSent`. If true, shows success toast with recipient email. If false, shows a destructive toast warning the admin to resend from the detail view. If no invitation, shows a simple "Client created" toast.

### Validation & Business Rules
- **Zod schemas** (api/src/modules/tenants/dto/tenant.schemas.ts:13–66):
  - `createTenantSchema`: companyName (2–120 chars), companySlug (lowercase, hyphen-delimited, 2–64 chars), companyEmail (valid email), country (2-char ISO), timezone (max 64 chars), baseCurrency (3-char ISO), subscriptionPlan enum (starter|pro|enterprise), enabledTabKeys (array of `module.key` format), initialAdmin or adminInvite (mutually exclusive).
  - `updateTenantSchema`: omits companySlug and initialAdmin; adds optional status enum (active|suspended|trial).

- **Uniqueness constraints**: companySlug is unique on the `clients` table (database level). Admin email must not exist in `users` table before provisioning.

- **Role gates**: `@Public()` on create (bootstrap phase), `@Roles('super_admin')` on list/update/delete. Tab access is `@Roles('super_admin')` only.

- **Status transitions**: Client starts in `active` status (default). Can be updated to `suspended` or `trial` via PATCH. Suspended clients cannot log in.

- **Side effects**:
  - If `adminInvite` provided, invitation email is dispatched post-commit via Resend
  - Admin User record is created with `pendingStatus` and no password until invitation is accepted
  - Employee record is created for the admin even before password is set (ensuring no orphan state)
  - Setup wizard banner is shown to admin on first login; wizard auto-detects completion from data (myEmployee.joiningDate, departmentEmployeeCount > 0, etc.)

- **Invitation expiry**: invitation token expires after `INVITATION_TTL_DAYS` (config). Acceptance flow is deferred to invitations module; this flow only creates the token row and sends the email.

### Outcomes
**Success (HTTP 201):**
- Client row persists with assigned UUID, companySlug, subscription plan, status, enabledTabKeys
- Admin and Employee system roles created
- If `initialAdmin`: Admin User created with hashed password, active status, verified email. Can log in immediately.
- If `adminInvite`: Admin User created with pending status, no password. Invitation row created with token and expiry. Email sent (result reflected in response).
- Response shape: `{ client, adminUserId, invitation: { id, email, emailSent, emailError? } }` or `{ client, adminUserId, invitation: null }`
- User sees toast: "Client created" or "Client created — Invitation email sent to X@Y" or "Client created — email delivery failed (manual resend available)"

**Failure modes:**
- `400 CONFLICTING_ADMIN_FIELDS`: both `initialAdmin` and `adminInvite` provided
- `409 SLUG_TAKEN`: `companySlug` already exists (backend checks on input or auto-generated slug collides)
- `409 EMAIL_TAKEN`: admin email already in use
- `400` (Zod validation): invalid enum, missing required field, malformed email, slug regex mismatch
- Invitation email send failure: client is still created, but `emailSent: false` and `emailError` string is included in response; admin can retry from client detail view

### Related Endpoints
- `POST /tenants` — Create tenant with optional admin (this flow)
- `GET /tenants` — List all tenants (super_admin only)
- `GET /tenants/:id` — Fetch tenant by ID
- `PATCH /tenants/:id` — Update tenant (name, status, enabledTabKeys, subscription plan)
- `DELETE /tenants/:id` — Hard delete tenant and all scoped data (super_admin only)
- `GET /tenants/me/setup-progress` — Current user's setup wizard progress (auto-derived from real data)
- `POST /tenants/me/setup-wizard/dismiss` — Dismiss the setup banner for the current tenant
- `GET /tenants/me/tabs` — Fetch accessible tab keys for the logged-in user (null for super_admin = unrestricted)
- `GET /tenants/:id/tab-access` — View a specific tenant's enabledTabKeys (super_admin)
- `PUT /tenants/:id/tab-access` — Replace a tenant's tab access list (super_admin)
- `POST /invitations/{id}/accept` — Accept an invitation and set password (separate module; triggered by user clicking email link)

---

<a id="2-authentication"></a>

## 2. Authentication (Register / Login / Refresh / Logout)

### Overview
The cg-payroll authentication system implements a JWT-based session flow with refresh token rotation and family-based replay detection. It enables self-service registration, email+password login, automatic token refresh with security checks, and session management (single-device or all-devices logout). The system also enforces account status validation and suspended-client lockout at every request.

### Entry Point
Authentication flows start at these HTTP endpoints:
- `POST /auth/register` — Self-service user registration
- `POST /auth/login` — Email + password authentication
- `POST /auth/refresh` — Rotate refresh token and issue new access token
- `POST /auth/logout` — Revoke refresh token(s) for current or all devices

All endpoints are stateless; token validation occurs via JWT signature verification and real-time database lookups in the JwtStrategy.

### Step-by-Step Walkthrough

**Registration Flow**
1. User submits email, password, and optional fullName via frontend form (`src/api/auth/auth.hooks.ts:useRegister()`)
2. Frontend posts to `POST /auth/register` with RegisterDto validated by `registerSchema` (email unique, password ≥8 chars with uppercase/lowercase/digit; `api/src/modules/auth/dto/auth.schemas.ts:16-20`)
3. Backend controller receives request and calls `auth.service.ts:register()` (`api/src/modules/auth/auth.controller.ts:39-44`)
4. Service checks if email exists in `User` table; throws `ConflictException` with code `EMAIL_TAKEN` if duplicate (`api/src/modules/auth/auth.service.ts:65-70`)
5. Hashes password via bcrypt and creates `User` record with `status: active` and optional `UserProfile` (`api/src/modules/auth/auth.service.ts:73-81`)
6. Fires email verification token asynchronously (`api/src/modules/auth/auth.service.ts:84`)
7. Calls `completeSession()` to issue access + refresh tokens (`api/src/modules/auth/auth.service.ts:86`)
8. Frontend receives `AuthSession` (accessToken, refreshToken, expiresIn, user) and persists via `tokenStorage.setTokens()` (`src/api/auth/auth.api.ts:66-74`)

**Login Flow**
1. User enters email and password; frontend calls `authApi.login()` (`src/api/auth/auth.hooks.ts:useLogin()`)
2. Frontend posts to `POST /auth/login` with LoginDto validated by `loginSchema` (`api/src/modules/auth/dto/auth.schemas.ts:23-26`)
3. Controller calls `auth.service.ts:login()` (`api/src/modules/auth/auth.controller.ts:47-53`)
4. Service looks up user by email; throws `UnauthorizedException` with code `INVALID_CREDENTIALS` if not found or passwordHash missing (`api/src/modules/auth/auth.service.ts:92-98`)
5. Compares presented password against stored hash via `PasswordService.compare()`; throws `INVALID_CREDENTIALS` if mismatch (`api/src/modules/auth/auth.service.ts:99-105`)
6. Checks `user.status === active`; throws `USER_INACTIVE` (HTTP 401) if not (`api/src/modules/auth/auth.service.ts:106-111`)
7. Updates `lastLoginAt` timestamp on User record (`api/src/modules/auth/auth.service.ts:113-116`)
8. Calls `completeSession()` to issue tokens (`api/src/modules/auth/auth.service.ts:118`)
9. Frontend persists tokens and invalidates `users.me` query to refresh profile (`src/api/auth/auth.api.ts:26-29`)

**Token Refresh Flow**
1. Frontend axios interceptor detects 401 response or explicit `authApi.refresh()` call; includes `refreshToken` in body (`src/api/auth/auth.api.ts:36-42`)
2. Controller posts to `POST /auth/refresh` with RefreshDto validated by `refreshSchema` (token ≥10 chars; `api/src/modules/auth/dto/auth.schemas.ts:29-32`)
3. Controller calls `auth.service.ts:refresh()` (`api/src/modules/auth/auth.controller.ts:56-62`)
4. Service calls `tokens.rotate()` which verifies refresh token JWT signature against `JWT_REFRESH_SECRET` (`api/src/modules/auth/auth.service.ts:124-128` and `api/src/modules/auth/token.service.ts:127-148`)
5. Rotation logic looks up token hash in `RefreshToken` table; throws `INVALID_REFRESH_TOKEN` if not found (`api/src/modules/auth/token.service.ts:150-158`)
6. **Replay Detection:** If `revokedAt` is set (token was already used), revokes entire family and throws `REFRESH_TOKEN_REUSE_DETECTED` (HTTP 401; `api/src/modules/auth/token.service.ts:160-170`)
7. Checks token expiry against `expiresAt`; throws `REFRESH_TOKEN_EXPIRED` if expired (`api/src/modules/auth/token.service.ts:172-177`)
8. Issues new refresh token in same family via `issueRefreshToken()` with `existingFamily: stored.family` (`api/src/modules/auth/token.service.ts:179-184`); plaintext token returned only once
9. Marks old token revoked and sets `replacedBy: newTokenId` for audit trail (`api/src/modules/auth/token.service.ts:186-189`)
10. Service refetches user from DB; checks `status !== active` (throws `USER_INACTIVE`); loads roles via `rbac.loadRoles()` (`api/src/modules/auth/auth.service.ts:130-144`)
11. Signs new access token with current roles and primaryClientId (`api/src/modules/auth/auth.service.ts:139-144`)
12. Returns new session to frontend; frontend persists new tokens (`src/api/auth/auth.api.ts:39-41`)

**Logout Flow**
1. User clicks logout; frontend calls `authApi.logout()` with optional `refreshToken` and `allDevices: boolean` (`src/api/auth/auth.hooks.ts:useLogout()`)
2. If no refreshToken provided, frontend includes current token from storage; if logout fails (4xx/5xx), tokens are cleared anyway via `finally` block (`src/api/auth/auth.api.ts:44-51`)
3. Controller posts to `POST /auth/logout` (requires `@CurrentUser('id')` — authenticated route) (`api/src/modules/auth/auth.controller.ts:64-71`)
4. Service checks `dto.allDevices` flag:
   - If true, calls `tokens.revokeAllForUser(userId)` to revoke all unrevoked refresh tokens for user (`api/src/modules/auth/auth.service.ts:162-164`)
   - If false, calls `tokens.revoke(refreshToken)` to revoke single token only (`api/src/modules/auth/auth.service.ts:166-168`)
5. Endpoint returns HTTP 204 No Content; frontend clears all cached queries via `qc.clear()` and wipes tokenStorage (`src/api/auth/auth.api.ts:49`)

**JWT Strategy Revalidation**
1. Every protected endpoint requires valid access token in `Authorization: Bearer <token>` header
2. Passport extracts and verifies JWT signature via `JwtStrategy.validate()` (`api/src/modules/auth/strategies/jwt.strategy.ts:26-83`)
3. Strategy checks token type is `access`; throws `INVALID_TOKEN_TYPE` if not (`api/src/modules/auth/strategies/jwt.strategy.ts:27-29`)
4. Fetches user from DB by `payload.sub` (userId); throws `USER_INACTIVE` if user deleted or `status !== active` (`api/src/modules/auth/strategies/jwt.strategy.ts:31-52`)
5. **Suspended Client Lockout:** For non-super-admin roles, loads user's client memberships via `userRoles`; if every joined client has `status: suspended`, throws `CLIENT_SUSPENDED` (HTTP 401; `api/src/modules/auth/strategies/jwt.strategy.ts:55-74`)
6. Returns `RequestUser` object with id, email, primaryClientId, roles, and activeClientId (set to null; populated by ClientScopeGuard) (`api/src/modules/auth/strategies/jwt.strategy.ts:76-83`)

### Validation & Business Rules

- **Email Uniqueness:** Registration throws `ConflictException` (HTTP 409) with code `EMAIL_TAKEN` if email already registered (`api/src/modules/auth/auth.service.ts:65-70`)
- **Password Rules:** Enforced by `passwordSchema` — minimum 8 characters, requires uppercase, lowercase, and digit; applied at registration, password reset, and change-password endpoints (`api/src/modules/auth/dto/auth.schemas.ts:4-10`)
- **Email Normalization:** Zod schema trims and lowercases email to prevent case-sensitivity issues (`api/src/modules/auth/dto/auth.schemas.ts:12`)
- **User Status Transitions:** New users created with `status: active` (Phase 1 trade-off; email verification not blocking). Inactive users cannot login (`USER_INACTIVE`). Password reset sets status back to `active` and revokes all refresh tokens for safety (`api/src/modules/auth/auth.service.ts:216` and `223-226`)
- **Refresh Token Family Rotation:** Each refresh session maintains a `family` UUID; on successful rotation, old token marked revoked with `replacedBy` link, new token issued in same family (`api/src/modules/auth/token.service.ts:106-189`)
- **Family Replay Detection:** Attempting to use a revoked token triggers detection; entire family is burned (all unrevoked tokens in family set `revokedAt`), and request rejected with `REFRESH_TOKEN_REUSE_DETECTED` (HTTP 401; `api/src/modules/auth/token.service.ts:160-170`)
- **Token Hashing:** Refresh tokens stored as sha256(jti) in DB; plaintext returned only once on issuance (`api/src/modules/auth/token.service.ts:90-91` and `106-115`)
- **Suspended Client Lockout:** JwtStrategy checks every non-super-admin user's client memberships; if all clients `suspended`, access denied with `CLIENT_SUSPENDED` (HTTP 401; `api/src/modules/auth/strategies/jwt.strategy.ts:58-73`)
- **Email Verification:** Issued asynchronously during registration; not blocking for login (fire-and-forget). Token stored as sha256(tokenHash) with TTL configurable (`api/src/modules/auth/auth.service.ts:84` and `250-261`)
- **Password Reset Tokens:** Same SHA256 hashing scheme; invalid/expired/reused attempts throw `INVALID_RESET_TOKEN` (HTTP 400). Reset marks token `usedAt`, forces status to `active`, and revokes all refresh tokens (`api/src/modules/auth/auth.service.ts:197-228`)

### Outcomes

**Success (Registration & Login)**
- User record persisted in database with hashed password and optional profile
- `AuthResult` returned: `{ accessToken, refreshToken, expiresIn, user: { id, email, primaryClientId, roles } }`
- Frontend persists tokens via `tokenStorage.setTokens()` (typically localStorage or secure cookie)
- React Query cache invalidated; `users.me` query refetched to populate authenticated state
- Toast/UI updates reflect logged-in user; dashboard accessible

**Success (Refresh)**
- Old refresh token marked revoked; new token issued in same family
- New access token signed with current user roles
- Frontend updates stored tokens; protected requests resume without user interaction

**Success (Logout)**
- HTTP 204 No Content returned
- Refresh token(s) marked `revokedAt`; subsequent uses rejected
- React Query cache cleared; stale authenticated data wiped
- Frontend redirects to login page

**Failure Modes**
- `EMAIL_TAKEN` (HTTP 409) — Registration with existing email
- `INVALID_CREDENTIALS` (HTTP 401) — Login with wrong password or non-existent email
- `USER_INACTIVE` (HTTP 401) — Login or refresh by disabled user; any protected request by inactive user
- `CLIENT_SUSPENDED` (HTTP 401) — Access by member of suspended client (bypass if super_admin)
- `INVALID_REFRESH_TOKEN` (HTTP 401) — Malformed, expired, or non-existent refresh token
- `REFRESH_TOKEN_REUSE_DETECTED` (HTTP 401) — Replay attempt; entire family revoked
- `INVALID_RESET_TOKEN` (HTTP 400) — Expired or already-used password reset token
- `INVALID_VERIFICATION_TOKEN` (HTTP 400) — Expired or already-used email verification token
- Zod validation errors (HTTP 400) — Malformed request body (e.g., weak password, invalid email format)

### Related Endpoints
- `POST /auth/register` — Self-service registration
- `POST /auth/login` — Email + password login
- `POST /auth/refresh` — Refresh token rotation
- `POST /auth/logout` — Revoke refresh token(s)
- `POST /auth/forgot-password` — Request password reset email (returns HTTP 202 Accepted regardless)
- `POST /auth/reset-password` — Complete password reset using token
- `POST /auth/verify-email` — Confirm email address with verification token
- `POST /users/me/password` — Change password (authenticated; conceptually part of auth flow but lives in users module)

---

<a id="3-password-recovery-email-verification"></a>

## 3. Password Recovery & Email Verification

### Overview
The Password Recovery & Email Verification flow enables users to recover forgotten passwords and confirm email ownership. When a user requests a password reset (forgot-password), the system generates a single-use token, invalidates prior tokens, and dispatches a recovery email. When the user submits the token and new password (reset-password), the system validates TTL and usage, updates the password hash, and revokes all active sessions for security. Email verification follows a parallel pattern: tokens are minted during registration and can be verified independently via the verify-email endpoint.

### Entry Point
**Forgot-Password Request:** `POST /api/v1/auth/forgot-password`
- Request body: `{ email: string }` (Zod: `forgotPasswordSchema` at api/src/modules/auth/dto/auth.schemas.ts:40)
- Response: `{ acknowledged: true }` (HTTP 202 ACCEPTED)
- Public endpoint—does not require authentication.

**Reset-Password Submission:** `POST /api/v1/auth/reset-password`
- Request body: `{ token: string, password: string }` (Zod: `resetPasswordSchema` at auth.schemas.ts:45)
- Response: `{ reset: true }` (HTTP 200 OK)
- Public endpoint.

**Email Verification:** `POST /api/v1/auth/verify-email`
- Request body: `{ token: string }` (Zod: `verifyEmailSchema` at auth.schemas.ts:57)
- Response: `{ verified: true }` (HTTP 200 OK)
- Public endpoint.

### Step-by-Step Walkthrough

**Forgot-Password Flow:**

1. **User Initiates:** User lands on `/forgot-password` page (frontend), enters email address, clicks "Send Recovery Link."

2. **API Receives Request:** Payload `{ email }` hits `POST /auth/forgot-password` (auth.controller.ts:74–82).

3. **Service Handles Logic:** `AuthService.forgotPassword()` (auth.service.ts:173–195) executes:
   - Query user by email via `prisma.user.findUnique({ where: { email } })` (line 174)
   - If user not found, return silently (line 176)—intentional to prevent email enumeration
   - Generate 32-byte random token via `randomBytes(32).toString('hex')` (line 178)
   - Compute `tokenHash = sha256(token)` (line 179)
   - Calculate expiry: current time + `PASSWORD_RESET_TOKEN_TTL_MIN` minutes (line 180–182)
   - Invalidate outstanding tokens: mark any prior `usedAt` tokens with same userId as `usedAt = now()` (line 185–187)
   - Create new record in `password_reset_tokens` table (line 190–192) with `userId`, `tokenHash`, `expiresAt`
   - Call `MailService.sendPasswordReset(user.email, tokenPlain)` (line 194) to dispatch email containing the plain token and reset URL

4. **Email Dispatch:** `MailService.sendPasswordReset()` (mail.service.ts:113–120) builds reset link `${FRONTEND_URL}/reset-password?token=${token}` and sends HTML email via Resend.

5. **User Receives & Clicks:** User opens email, clicks reset link (or copy-pastes token into frontend form).

6. **Frontend Submits Reset:** Frontend submits `{ token, password }` to `POST /auth/reset-password` (auth.controller.ts:85–92).

7. **Service Validates & Updates:** `AuthService.resetPassword()` (auth.service.ts:197–228):
   - Hash the provided token: `tokenHash = sha256(dto.token)` (line 198)
   - Fetch record: `prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user } })` (line 199–202)
   - Validate: if not found, already used (`usedAt` is set), or expired (`expiresAt < now`), throw `BadRequestException` with code `INVALID_RESET_TOKEN` (line 204–209)
   - Hash new password via `PasswordService.hash(dto.password)` (line 211)
   - Execute transaction (line 213–227):
     * Update `users` table: set `passwordHash` and `status = UserStatus.active`
     * Mark token as used: set `usedAt = now()` on password_reset_tokens record
     * Revoke all refresh tokens for the user: set `revokedAt = now()` on all active refresh_tokens (line 223–226) to force re-login on all devices

8. **Response:** Return `{ reset: true }` to frontend.

**Email Verification Flow:**

1. **Registration Triggers:** When user registers via `POST /auth/register` (auth.controller.ts:38–44), `AuthService.register()` (auth.service.ts:64–87) calls `issueEmailVerification(user.id, user.email)` (line 84).

2. **Token Minting:** `issueEmailVerification()` (auth.service.ts:250–261):
   - Generate 32-byte token and hash: `tokenHash = sha256(randomBytes(32).toString('hex'))`
   - Calculate expiry: current time + `EMAIL_VERIFICATION_TOKEN_TTL_HOURS` hours
   - Create record in `email_verification_tokens` table with `userId`, `tokenHash`, `expiresAt`
   - Call `MailService.sendEmailVerification(email, tokenPlain)` to send confirmation email

3. **Email Dispatched:** `MailService.sendEmailVerification()` (mail.service.ts:122–129) builds URL `${FRONTEND_URL}/verify-email?token=${token}` and sends HTML email.

4. **User Verifies:** User clicks link in email (or enters token on `/verify-email` page).

5. **Service Confirms:** `AuthService.verifyEmail()` (auth.service.ts:263–282):
   - Hash token: `tokenHash = sha256(dto.token)`
   - Query: `prisma.emailVerificationToken.findUnique({ where: { tokenHash } })` (line 265)
   - Validate: if not found, used, or expired, throw `BadRequestException` with code `INVALID_VERIFICATION_TOKEN` (line 266–271)
   - Execute transaction (line 272–281):
     * Update user: set `emailVerifiedAt = now()` (line 273–276)
     * Mark token used: set `usedAt = now()` (line 277–280)

6. **Response:** Return `{ verified: true }` to frontend.

### Validation & Business Rules

**Forgot-Password:**
- Email uniqueness: checked via `User.email` unique constraint
- No email enumeration: endpoint always returns 202 regardless of whether email exists (line 80–81 in auth.controller.ts)
- TTL configuration: read from env `PASSWORD_RESET_TOKEN_TTL_MIN` at service runtime (line 181)
- Single-use enforcement: prior tokens invalidated before issuing new one (line 185–187 in auth.service.ts)
- Token storage: tokenHash stored in database, plain token sent only in email (security best practice)

**Reset-Password:**
- Zod schema validates: `token` min 10 chars, `password` must match password rules (8+ chars, uppercase, lowercase, digit—auth.schemas.ts:4–10)
- TTL check: token must not be expired at submission time (line 204)
- Already-used check: `usedAt` must be null (line 204)
- Token record lookup: hash-based lookup via unique `tokenHash` index (password_reset_tokens table)
- Password update: hashed via bcrypt-compatible algorithm (PasswordService)
- Session revocation: all refresh tokens revoked (line 223–226) to force re-login, preventing attacker takeover if token leaked

**Email Verification:**
- Zod schema: token must be min 10 chars (auth.schemas.ts:57–60)
- TTL configuration: read from env `EMAIL_VERIFICATION_TOKEN_TTL_HOURS` (line 255)
- Single-use: once consumed, subsequent submissions rejected
- Expiry validation: strict timestamp comparison (line 266)
- User status update: `emailVerifiedAt` set in atomic transaction with token mark-as-used

**Cross-Cutting Rules:**
- All tokens hashed on storage (sha256, see line 315–317)
- All sensitive operations logged to audit_logs table (if audit middleware active)
- Mail dispatch is fire-and-forget (no retry on Resend failure; logged but not thrown—mail.service.ts:58–91)
- No password verification required for reset flow (one-way token proves recovery email ownership)

### Outcomes

**Success (Reset-Password):**
- `users.passwordHash` updated to new bcrypt hash
- `users.status` set to `active` (or remains `active`)
- `password_reset_tokens.usedAt` marked with current timestamp
- All `refresh_tokens` with `revokedAt = null` are revoked (prevents stolen sessions)
- Frontend receives `{ reset: true }` and redirects user to login page
- On next login, user must re-authenticate with new password; all prior sessions invalidated

**Success (Verify-Email):**
- `users.emailVerifiedAt` set to current timestamp
- `email_verification_tokens.usedAt` marked
- Frontend receives `{ verified: true }` and may show success toast / redirect to dashboard
- No automatic session login (email verification does not issue tokens)

**Failure Modes:**

- **`INVALID_RESET_TOKEN` (HTTP 400):** Produced when:
  - Token not found in `password_reset_tokens` (line 204)
  - Token already used (`usedAt` is not null) (line 204)
  - Token expired (`expiresAt < now`) (line 204)
  - User message: "This reset link is invalid or has expired" (line 207)

- **`INVALID_VERIFICATION_TOKEN` (HTTP 400):** Produced when:
  - Token not found in `email_verification_tokens` (line 266)
  - Token already used (line 266)
  - Token expired (line 266)
  - User message: "This verification link is invalid or has expired" (line 269)

- **Email Delivery Failure:** MailService logs error but does not throw; caller continues (line 86–90 in mail.service.ts). Frontend may show warning if no delivery confirmation is expected.

### Related Endpoints

- `POST /auth/register` — Initiates email verification as side effect after user creation
- `POST /auth/login` — Normal credential-based login (separate from recovery flow)
- `POST /auth/refresh` — Rotates refresh token (affected by password-reset session revocation)
- `POST /auth/logout` — Manually revokes tokens (complements automatic revocation on reset)
- `POST /auth/change-password` — Self-service password change (requires current password, different from recovery)

---

<a id="4-invitations"></a>

## 4. Invitations (Create / Resend / Revoke / Accept)

### Overview
The Invitations flow manages the tenant-scoped lifecycle of user onboarding: HR/Admin staff mint cryptographically-signed invitation tokens (with TTL), dispatch them via email, and invitees accept with a password to atomically create a User account, bind to the tenant via UserRole, and provision or update an Employee record. The Employee.status transitions from `pending` (when pre-seeded by the AddEmployee wizard) to `active` upon acceptance.

### Entry Point
Four public and auth-protected REST endpoints drive this flow:

- `POST /invitations` (auth required, roles: super_admin / admin / hr) — Create a new invitation
- `POST /invitations/:id/resend` (auth required, roles: super_admin / admin / hr) — Regenerate token and re-mail
- `DELETE /invitations/:id` (auth required, roles: super_admin / admin / hr) — Revoke pending invitation
- `POST /invitations/accept` (public, no auth) — Accept invitation and create/activate user

### Step-by-Step Walkthrough

1. **Create Invitation (api/src/modules/invitations/invitations.controller.ts:50–59)**
   - Admin/HR clicks "Add Employee" or "Invite User" in the frontend
   - Frontend `POST /invitations` with CreateInvitationDto (email, appRole, optional firstName/lastName/empId/department/designation/roleId)
   - Controller validates Zod schema (createInvitationSchema) and checks role gate (@Roles decorator)
   - InvitationsService.create() (invitations.service.ts:28–99) checks if email already has an active UserRole in the tenant; throws ConflictException code `ALREADY_MEMBER` if so
   - If a pending invitation exists for the same email + client, delegates to resend() to avoid duplicates
   - Validates roleId (if provided) belongs to the client or is a global system role
   - Calls mintToken() (invitations.service.ts:317–323) to generate tokenPlain (32-byte hex), hash it with SHA-256, and set expiresAt based on INVITATION_TTL_DAYS config
   - Writes Invitation row: email, appRole, roleId, firstName, lastName, empId, department, designation, tokenHash, expiresAt, createdByUserId, status=pending
   - Dispatches email via MailService.sendInvitation() with tokenPlain, companyName from client
   - Returns invitation row

2. **Resend Invitation (invitations.service.ts:101–132)**
   - Admin/HR clicks "Resend" on a pending invitation row
   - Frontend `POST /invitations/{id}/resend`
   - Controller validates id is UUID and checks role gate
   - Service fetches Invitation by id and verifies clientId matches; throws NotFoundException code `INVITATION_NOT_FOUND` if missing
   - Throws BadRequestException code `INVITATION_ALREADY_ACCEPTED` if status ≠ pending (i.e., accepted or revoked)
   - Mints new token, updates Invitation row with fresh tokenHash, expiresAt, resets status to pending, clears revokedAt
   - Resends email with new token

3. **Revoke Invitation (invitations.service.ts:134–146)**
   - Admin/HR clicks "Revoke" on a pending invitation
   - Frontend `DELETE /invitations/{id}`
   - Service fetches Invitation, verifies clientId, updates status to revoked and sets revokedAt timestamp
   - No email sent; token is invalidated server-side

4. **Accept Invitation (invitations.controller.ts:86–95, invitations.service.ts:161–313)**
   - Invitee receives email with tokenPlain embedded in a public link (e.g., `/accept?token=...`)
   - Frontend form collects password and optional fullName, `POST /invitations/accept` with AcceptInvitationDto (token, password, fullName)
   - Controller validates schema and passes userAgent / ipAddress from request context
   - Service hashes token with SHA-256, looks up Invitation by tokenHash
   - Validates: token exists, status is pending, expiresAt > now (otherwise updates status to expired and throws BadRequestException code `INVITATION_EXPIRED`)
   - Hashes password with PasswordService
   - Resolves target Role: prefers explicit roleId from invitation, falls back to the system role matching appRole + clientId; throws BadRequestException code `NO_TARGET_ROLE` if neither exists
   - Executes atomic transaction (prisma.$transaction):
     - Checks if User exists by email; if not, creates User with status=active, emailVerifiedAt=now, passwordHash, primaryClientId, and optional profile.fullName
     - If User exists but lacks passwordHash (pre-provisioned), updates with new passwordHash, activates status, verifies email, and updates profile
     - If User exists with passwordHash, leaves password untouched (existing platform user joining additional client)
     - Upserts UserRole (userId, roleId, clientId) using unique key; idempotent if already bound
     - Checks for existing Employee by clientId + email; if found and either userId is null or status=pending, rebinds userId and flips status to active (from pending)
     - If no Employee exists, creates new Employee with auto-generated empId (EMP-{timestamp}), firstName/lastName from invitation or parsed fullName, email, department, designation; joiningDate left null for admin to set later
     - Updates Invitation: status=accepted, acceptedAt=now, acceptedByUserId=user.id
     - Returns user.id
   - Calls AuthService.completeSession() to return authenticated JWT tokens
   - User is logged in and redirected to onboarding or dashboard

### Validation & Business Rules

- **Schema validation** (createInvitationSchema, acceptInvitationSchema): email format, password strength (via passwordSchema), optional fields trimmed and length-bounded
- **Role gates**: @Roles('super_admin', 'admin', 'hr') on create/resend/revoke; invitations/accept is @Public()
- **Uniqueness & conflict checks**:
  - Email cannot already have an active UserRole in the tenant (code: `ALREADY_MEMBER`)
  - Duplicate pending invitations for same email + tenant are deduplicated (resend instead of create)
  - roleId must belong to the client or be global system role (code: `INVALID_ROLE`)
- **Status machine**:
  - Invitation: pending → accepted (on accept), pending → expired (on expired date), pending → revoked (on revoke)
  - Employee: pending (pre-seeded by AddEmployee wizard) → active (on accept); status flipped only if pending or userId was null
- **Token lifecycle**:
  - Token minted with SHA-256 hash, TTL = INVITATION_TTL_DAYS env var
  - Lookup by tokenHash (never stores plain token)
  - On expiry, status updated to expired and request rejected (code: `INVITATION_EXPIRED`)
- **User atomicity**:
  - Brand-new invitee: User + UserRole + Employee created in single transaction
  - Pre-provisioned user: password activated, existing Employee re-bound if needed
  - Existing platform user: only role + employee binding changes
- **Email side-effects**: MailService.sendInvitation() called after invitation creation and resend; no email on revoke or after acceptance

### Outcomes

**Success:**
- Invitation row persisted with pending status, token hashed and salted
- Email delivered with plain token embedded in public accept link
- On accept: User (status=active), UserRole, Employee (status=active if was pending, or auto-created with status=active) all persisted atomically
- Frontend receives JWT tokens and automatic session establishment; user redirected to dashboard or onboarding wizard
- InvitationStatus.accepted recorded with acceptedAt timestamp and acceptedByUserId

**Failure Modes:**
- `ALREADY_MEMBER` (409): Email already has active UserRole in tenant
- `INVALID_ROLE` (400): roleId does not belong to the client
- `INVITATION_NOT_FOUND` (404): Resend/revoke on non-existent or out-of-scope invitation
- `INVITATION_ALREADY_ACCEPTED` (400): Attempt to resend an accepted or revoked invitation
- `INVALID_INVITATION_TOKEN` (400): Token not found or tokenHash mismatch
- `INVITATION_NOT_PENDING` (400): Attempt to accept a revoked or already-accepted invitation
- `INVITATION_EXPIRED` (400): Expiration date exceeded; status flipped to expired
- `NO_TARGET_ROLE` (400): No matching system or custom role found in the client

### Related Endpoints

- `GET /invitations` — List all pending/accepted/revoked invitations for the client
- `POST /invitations` — Create new invitation
- `POST /invitations/:id/resend` — Regenerate token and re-mail
- `DELETE /invitations/:id` — Revoke invitation
- `POST /invitations/accept` — Accept invitation, create user, return session tokens

---

<a id="5-rbac-authorization"></a>

## 5. Authorization (JwtAuthGuard / RolesGuard / FeatureGuard / ClientScopeGuard)

### Overview
The authorization flow enforces multi-layered access control on every authenticated HTTP request in the NestJS backend. Four cross-cutting guards establish JWT authentication, client tenant scope, role-based access control (RBAC), and feature flags—executed in a specific order on each request to ensure users can only act within their authorized clients and with permitted roles.

### Entry Point
Every API endpoint in the codebase is protected by the global `JwtAuthGuard` (registered in `api/src/app.module.ts:129` via `APP_GUARD`). Public routes are marked with `@Public()` and bypass authentication entirely. Protected endpoints additionally use `@ClientScope()`, `@Roles(...)`, and `@RequireFeature(...)` decorators. A typical request arrives as:
```
Authorization: Bearer <JWT access token>
X-Client-Id: <optional tenant override>
```

### Step-by-Step Walkthrough

1. **Client sends HTTP request** with Bearer token in Authorization header and optional `X-Client-Id` header identifying the active tenant.

2. **JwtAuthGuard validates JWT** (api/src/modules/auth/guards/jwt-auth.guard.ts:10-22). If the route is marked `@Public()`, authentication is skipped and execution continues. Otherwise, Passport extracts and verifies the bearer token against `JWT_ACCESS_SECRET`.

3. **JwtStrategy validates and resolves user context** (api/src/modules/auth/strategies/jwt.strategy.ts:26-84). The strategy decodes the JWT payload (`JwtAccessPayload`), verifies token type is `'access'`, and re-verifies the user record exists in the database with status `'active'`. If the user is not a super-admin, the strategy checks that at least one of the user's client memberships is not suspended. It returns a `RequestUser` object with `id`, `email`, `primaryClientId`, and `roles` array. The `activeClientId` is initially `null` and set by `ClientScopeGuard`.

4. **ClientScopeGuard resolves active tenant** (api/src/modules/auth/guards/client-scope.guard.ts:23-65) if `@ClientScope()` is present on the route or controller. The guard selects the active client ID in this order:
   - `X-Client-Id` request header (explicit override, case-insensitive)
   - URL route parameter `:clientId`
   - User's `primaryClientId` (fallback)
   Super-admins can select any client. Regular users must be a member (hold any role) in the selected client, verified via `rbac.isMemberOf()` (api/src/modules/rbac/rbac.service.ts:45-49). The guard sets `req.user.activeClientId = candidate`.

5. **RolesGuard enforces role-based access** (api/src/modules/auth/guards/roles.guard.ts:19-52) if `@Roles(...)` is present. Super-admins always pass. Regular users must hold at least one of the required roles in the active client scope. Roles are checked via `rbac.hasAppRole(user, role, clientScope)` (api/src/modules/rbac/rbac.service.ts:28-34), reading from `user.roles` array (no DB call; roles are embedded in JWT).

6. **FeatureGuard enforces feature flags** (api/src/modules/auth/guards/feature.guard.ts:17-59) if `@RequireFeature(...)` is present. Requires an active client scope. For each feature key, calls `rbac.hasFeature(user, key, clientId)` (api/src/modules/rbac/rbac.service.ts:59-97), which checks in priority order: per-user override in `featureToggle` table (client_id + user_id + feature_key), then client-wide toggle (user_id null), then role defaults from `featureDefinition.defaultEnabledForRoles`. Super-admins always have all features enabled.

7. **Route handler executes** with `@ActiveClientId()` parameter decorator injecting the resolved client ID from `req.user.activeClientId`. The handler accesses `req.user` (set by Passport) containing the full `RequestUser` context.

### Validation & Business Rules

- **JWT payload structure**: Access tokens embed `sub` (user ID), `email`, `primaryClientId`, `roles` array (each with `role: AppRole`, `clientId`, `roleId`), and `type: 'access'`. Token type validation prevents token confusion attacks.
- **User status checks**: The JwtStrategy re-verifies `user.status === 'active'` on every request; disabled users are locked out immediately despite holding a valid JWT.
- **Client suspension**: Non-super-admin users are blocked if *all* their client memberships have status `'suspended'`. Users with multiple clients remain active if at least one client is not suspended.
- **Role resolution**: `RolesGuard` checks `@Roles('admin', 'hr')` against `user.roles` array. Super-admins (role `super_admin` with `clientId: null`) bypass all role checks. Regular roles are per-client; a user's admin role in client-A does not grant access on a request scoped to client-B.
- **Feature flag resolution**: `FeatureGuard` checks `@RequireFeature('payroll.run')` via three-level fallback: per-user override wins, client-wide toggle second, then role defaults. Enables per-user and per-client fine-grained access.
- **Client scope requirement**: `ClientScopeGuard` throws `CLIENT_SCOPE_REQUIRED` (403) if no candidate client is available (no header, no URL param, no `primaryClientId`). `FeatureGuard` also requires an active client scope.
- **Error codes**: `NOT_AUTHENTICATED` (JWT invalid/missing), `INVALID_TOKEN_TYPE` (wrong token type), `USER_INACTIVE` (user disabled), `CLIENT_SUSPENDED` (all clients suspended), `INSUFFICIENT_ROLE` (required role not held), `CLIENT_SCOPE_REQUIRED` (client scope unavailable), `CLIENT_SCOPE_FORBIDDEN` (user not a member of requested client), `FEATURE_DISABLED` (feature not enabled).

### Outcomes

**Success:**
- All four guards pass; `req.user` is populated with `RequestUser` including `activeClientId`.
- Route handler executes with tenant isolation: all data queries filtered to `activeClientId`.
- No downstream events are triggered by authorization itself; the handler initiates business logic (create, update, delete operations may trigger audit logs, notifications, approvals via the NotificationsModule / AuditModule / ApprovalsModule).

**Failure modes:**
- **401 Unauthorized**: JWT missing, invalid signature, expired, wrong type (`INVALID_TOKEN_TYPE`), or user inactive/suspended (`USER_INACTIVE`, `CLIENT_SUSPENDED`). JwtAuthGuard / JwtStrategy reject before downstream guards run.
- **403 Forbidden**: `NOT_AUTHENTICATED` (JwtAuthGuard detects unauthenticated request on protected route), `INSUFFICIENT_ROLE` (RolesGuard), `CLIENT_SCOPE_REQUIRED` (ClientScopeGuard or FeatureGuard), `CLIENT_SCOPE_FORBIDDEN` (ClientScopeGuard), `FEATURE_DISABLED` (FeatureGuard). Each guard throws `ForbiddenException` with structured error code.

### Related Endpoints

- `POST /api/v1/auth/login` — Issues access and refresh tokens; tokens encode roles and primaryClientId.
- `POST /api/v1/auth/refresh` — Exchanges refresh token for new access token.
- `GET /api/v1/payroll-runs` (example tenant-scoped endpoint) — Applies `@UseGuards(ClientScopeGuard, RolesGuard)`, `@ClientScope()`, `@Roles('super_admin', 'admin', 'hr')`. Request must include Bearer token and optionally X-Client-Id header.
- `GET /api/v1/health` (example public endpoint) — Marked `@Public()`, bypasses JwtAuthGuard entirely.
- Any `@Get`, `@Post`, `@Patch`, `@Delete` on storage, employees, payroll, expenses, advances, loans, assets, leave, org-structure, audit, notifications, approvals, separations, performance, reminders, invitations controllers — all apply ClientScopeGuard and RolesGuard at the controller level.

---

<a id="6-tab-module-access"></a>

## 6. Per-Tenant Tab / Module Access

### Overview

Super-admins configure which tabs (e.g., "employees.directory", "payroll.runs") each tenant can access via a centralized admin endpoint. The enabled tab keys are persisted on the Client row's `enabledTabKeys` array. When a regular user (admin/hr/employee) logs in, they fetch their accessible tabs via an API endpoint and the frontend filters the sidebar and route guards accordingly, showing only the modules and pages their tenant has been granted.

### Entry Point

**PUT /tenants/:id/tab-access** — Super-admin replaces a tenant's enabled tab keys. Sent body: `{ enabledTabKeys: ["employees.directory", "payroll.runs", ...] }`. Also readable via **GET /tenants/:id/tab-access** (super-admin only).

User-facing discovery happens via **GET /tenants/me/tabs**, which returns the current user's accessible tab keys (or `null` for super-admins to indicate unrestricted access).

### Step-by-Step Walkthrough

1. **Super-admin initiates tab access edit** — Navigate to `/manage/module-access` or similar admin UI. The interface calls `useClientTabAccess(clientId)` (useTabAccess.ts:117) which fetches the tenant's current `enabledTabKeys` via `useTenantTabAccess()`.

2. **Frontend receives current tab state** — The query returns `{ enabledTabKeys: [...] }` from tenants.service.ts:313–322 (`getTabAccess()` method). Frontend renders a checkbox/toggle UI against `TAB_DEFINITIONS` (useTabAccess.ts:37–84), a hard-coded master list of all available tabs (e.g., "employees.directory", "payroll.setup", "expenses.claims").

3. **Super-admin selects tabs and submits** — Frontend collects selected tab keys and calls `useSetClientTabAccess()` (useTabAccess.ts:131–147), which fires a mutation with `{ clientId, tabKeys: ["..."] }`.

4. **API validates and persists** — The mutation invokes `PUT /tenants/:id/tab-access` (tenants.controller.ts:155–162). The controller validates the payload against `tabKeyArraySchema` (tenants.controller.ts:33–44), which enforces: array of strings, each 2–80 chars, matching regex `^[a-z0-9_]+\.[a-z0-9_]+$` (module.key format). Controller calls `tenants.setTabAccess(id, enabledTabKeys)` (tenants.service.ts:304–311).

5. **Database write** — `setTabAccess()` verifies the client exists (calls `findById()`), then updates the Client row: `update({ where: { id }, data: { enabledTabKeys } })`. The update returns `{ id, enabledTabKeys }` to confirm success.

6. **Query invalidation on frontend** — After successful mutation, `useSetClientTabAccess()` (useTabAccess.ts:139, 143) calls `qc.invalidateQueries({ queryKey: tabAccessKeys.mine })` to refresh the user's own `/tenants/me/tabs` in case they were editing their own tenant.

7. **Regular user logs in** — User authenticates and JWT is decoded. Their `primaryClientId` and roles are extracted. Frontend immediately calls `useMyTabs()` (implicit from JWT context), which invokes `GET /tenants/me/tabs` (tenants.controller.ts:99–108).

8. **Backend determines user's accessible tabs** — `myTabs()` controller calls `tenants.getTabsForUser()` (tenants.service.ts:334–348). Resolution rules: super_admin → return `{ enabledTabKeys: null }` (unrestricted); regular user with primaryClientId → fetch Client.enabledTabKeys; user with no client → return `{ enabledTabKeys: [] }` (locked out).

9. **Frontend caches accessible tabs** — `useAccessibleTabs()` (useTabAccess.ts:96–114) consumes the response, builds a `Map<string, AccessibleTabInfo>` keyed by tab_key, and memoizes it. Super-admin gets `null` (bypass all checks). Others get a populated or empty Map.

10. **Sidebar filters by accessible tabs** — Components render navigation groups from `navigationGroups` (navigation.ts:53–276). The `Sidebar` component calls `filterNavigation()` (navigation.ts:316–379) and `filterMeNavigation()` (navigation.ts:485–513), passing `accessibleTabs`. These filter out any NavChild or NavGroup where `tabKey` is set and not found in the accessible tabs Map (navigation.ts:300–314, 355–359).

11. **Route guards enforce tab access** — `ProtectedRoute` wrapper (ProtectedRoute.tsx:18–106) checks `tabGrantsAccess` (lines 33–42): it matches the current pathname against `TAB_DEFINITIONS` paths and checks if that tab_key exists in `accessibleTabs`. If the tab is not accessible, it returns `<AccessDenied />` or redirects (line 87).

### Validation & Business Rules

- **Zod schema** (tenants.controller.ts:33–44): `tabKeyArraySchema` validates enabledTabKeys as an array of strings matching `^[a-z0-9_]+\.[a-z0-9_]+$`, max 200 items.
- **Role gate** (tenants.controller.ts:153–155): Only `@Roles('super_admin')` can call PUT/GET `/tenants/:id/tab-access`.
- **Client existence** (tenants.service.ts:305): `setTabAccess()` calls `findById()` first; returns HTTP 404 if tenant not found.
- **Empty array = locked workspace** (tenants.service.ts:303 comment): A tenant with `enabledTabKeys: []` has zero accessible tabs (all users locked out).
- **Super-admin unrestricted** (tenants.service.ts:341, 102): Super-admins always get `enabledTabKeys: null`, which bypasses all tab filters (navigation.ts:289–290, ProtectedRoute.tsx:33–42 never block).
- **Tab key format** (useTabAccess.ts:41): Enforced regex ensures two-part keys (e.g., "module.feature"), matching hard-coded `TAB_DEFINITIONS` (useTabAccess.ts:37–84).
- **Preload permissiveness** (useTabAccess.ts:99): While `useAccessibleTabs()` is loading, it returns `null`, and navigation filters default to permissive (allow everything) to avoid flashing access-denied screens.

### Outcomes

**Success:**
- Client.enabledTabKeys updated in PostgreSQL. Response includes `{ id, enabledTabKeys }`.
- On next user login or query refresh, `GET /tenants/me/tabs` returns the new set.
- Sidebar re-renders with only tabs in the enabled set visible (via `filterNavigation()` / `filterMeNavigation()`).
- Attempts to navigate to disabled routes trigger `ProtectedRoute` guards, showing `<AccessDenied />`.
- Query cache invalidation ensures frontend reflects changes immediately for users already logged in.

**Failure modes:**
- **HTTP 400**: Invalid tab key format (fails `tabKeyArraySchema` regex or string length). Response: `ZodValidationError` from the pipe.
- **HTTP 401**: Missing/invalid bearer token or no super_admin role. Response: `RolesGuard` rejects the request.
- **HTTP 404**: Tenant ID not found (during `setTabAccess()` call to `findById()`). Response: `{ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' }` (tenants.service.ts:319).
- **Frontend: AccessDenied component**: User navigates to a disabled route after tab access is revoked (ProtectedRoute.tsx line 60).

### Related Endpoints

- **PUT /tenants/:id/tab-access** — Replace a tenant's enabled tab keys (super_admin only).
- **GET /tenants/:id/tab-access** — Retrieve a tenant's current enabled tab keys (super_admin only).
- **GET /tenants/me/tabs** — Fetch the current user's accessible tab keys based on their primary client.
- **GET /tenants/me/setup-progress** — Returns setup wizard step status, including a link to the tab access configuration step (for onboarding flows).
- **POST /tenants** — Tenant creation optionally seeds initial `enabledTabKeys` via `dto.enabledTabKeys` (tenants.service.ts:88).
- **GET /tenants/:id** — Retrieve a single tenant (includes all columns, including enabledTabKeys).

---

<a id="7-tenant-setup-wizard"></a>

## 7. Tenant Setup-Wizard Progress

### Overview
The Tenant Setup-Wizard Progress endpoint provides a self-service onboarding checklist for newly created tenants. It auto-derives completion status for six mandatory setup steps from real data (employee records, payroll configurations, leave types) rather than maintaining separate step-completion flags. Admin/HR users access progress from a dismissible banner on first login; the endpoint ensures the wizard always reflects the current state of the tenant, preventing drift between UI state and actual data.

### Entry Point
- `GET /tenants/me/setup-progress` — Fetch the current tenant's setup wizard progress
- Authentication: Bearer token (caller's user context)
- No request body; uses `CurrentUser` JWT claim to resolve `primaryClientId` and `userId`

### Step-by-Step Walkthrough
1. **Frontend initiates request** — Admin or HR user lands on the dashboard after login; the banner component calls `GET /tenants/me/setup-progress` to populate the onboarding checklist.

2. **Controller route handler** (`api/src/modules/tenants/tenants.controller.ts:114-132`) — `mySetupProgress()` validates the user has a `primaryClientId` (tenant binding). If missing, returns early with an empty progress object (`steps: []`, `completedCount: 0`, `totalCount: 0`, `isComplete: true`, `shouldShowBanner: false`).

3. **Service resolves tenant & user data** (`api/src/modules/tenants/tenants.service.ts:357-370`) — `getSetupProgress()` fetches the client record (name, logo, country, timezone, `setupWizardDismissedAt` timestamp) and validates the tenant exists; 404 if not found.

4. **Parallel reads of step-completion signals** (`api/src/modules/tenants/tenants.service.ts:374-391`) — Five `Promise.all()` queries execute concurrently:
   - `employee.findFirst()` for the caller's profile (looks for `joiningDate`)
   - `employee.count()` for total employees in the tenant
   - `employee.count()` filtering by `department: { not: null }` to detect org structure
   - `payrollSetup.count()` where `status: 'active'` for active payroll config
   - `leaveType.count()` to detect at least one leave type

5. **Step completion logic** (`api/src/modules/tenants/tenants.service.ts:393-404`) — Each step's `done` flag is derived from these queries:
   - **Company Profile** (`companyDone`): `companyName && companyLogoUrl && country && timezone` all truthy
   - **Your Profile** (`yourProfileDone`): `myEmployee?.joiningDate` is non-null
   - **Organisation Structure** (`orgStructureDone`): `departmentEmployeeCount > 0`
   - **Payroll Setup** (`payrollDone`): `activePayrollSetupCount > 0`
   - **Leave and Holidays** (`leaveDone`): `leaveTypeCount > 0`
   - **Invite Your Team** (`inviteDone`): `employeeCount > 1` (admin + at least one other)

6. **Build response object** (`api/src/modules/tenants/tenants.service.ts:405-469`) — Constructs a steps array with metadata (key, title, description, appRoute) and completion status. Computes `completedCount`, `totalCount`, `isComplete` (true when all steps done), and `shouldShowBanner` (true when incomplete AND `setupWizardDismissedAt` is null).

7. **Return to frontend** — JSON response includes full step list, progress metrics, dismiss timestamp, and a boolean flag controlling banner visibility.

### Validation & Business Rules
- **No role gates** — Any authenticated user with a `primaryClientId` can read their tenant's progress; no explicit `@Roles` decorator.
- **Dismiss endpoint** (`POST /tenants/me/setup-wizard/dismiss`, `api/src/modules/tenants/tenants.controller.ts:135-143`) — Sets `setupWizardDismissedAt` on the `Client` record to current timestamp. Returns HTTP 200 with `dismissedAt` ISO string. If caller has no tenant binding, returns `dismissedAt: null`.
- **Dismissal persists** — Once dismissed, `shouldShowBanner` becomes false for that tenant (even if steps remain incomplete). The wizard itself remains accessible via the sidebar route; dismissal only hides the sticky banner.
- **Step-completion auto-sync** — No explicit state machine or flags. If an admin later creates an employee or configures payroll, the progress automatically updates on the next fetch without any banner refresh logic needed.
- **Tenant not found** — Controller returns HTTP 404 with `code: 'TENANT_NOT_FOUND'` if the tenant ID doesn't exist.
- **Multiple clients** — The endpoint only serves the user's `primaryClientId`; users multi-tenanted to other clients cannot view their progress via this route.

### Outcomes
**Success:**
- HTTP 200 JSON response with structure:
  ```
  {
    clientId: UUID,
    steps: [
      { key: string, title: string, description: string, appRoute: string, done: boolean },
      ...
    ],
    completedCount: number,
    totalCount: number (always 6),
    isComplete: boolean,
    dismissedAt: ISO string | null,
    shouldShowBanner: boolean
  }
  ```
- Frontend banner renders if `shouldShowBanner: true`, listing incomplete steps with links to their respective app routes (`/settings/company`, `/account`, `/settings/company-structure`, `/payroll/setup`, `/employees/settings`, `/employees`).
- Dismiss call (`POST /tenants/me/setup-wizard/dismiss`) returns HTTP 200 with `{ dismissedAt: ISO string }` and hides the banner for subsequent page loads.

**Failure modes:**
- **User has no tenant** (`primaryClientId: null`) — Returns `isComplete: true`, `steps: []`, `shouldShowBanner: false` (no-op; banner never shown).
- **Tenant not found** — HTTP 404 with `code: 'TENANT_NOT_FOUND'`.
- **Missing authentication** — HTTP 401 (no Bearer token).

### Related Endpoints
- `POST /tenants` — Creates a new tenant with optional initial admin or admin invitation; invokes the setup wizard on first login.
- `PATCH /tenants/:id` — Updates tenant metadata (company name, logo, country, timezone) which affects Company Profile step completion.
- `GET /tenants/me/tabs` — Returns user's accessible tab keys (unrelated but uses same `CurrentUser` context).
- `POST /tenants/me/setup-wizard/dismiss` — Dismisses the setup banner by setting `setupWizardDismissedAt`.
- Employee creation endpoints — Adding employees (either self-profile in `/account` or bulk invite in `/employees`) auto-updates progress on next `GET /tenants/me/setup-progress` call.
- Payroll setup endpoints — Creating an active payroll configuration auto-completes the Payroll Setup step.
- Leave type endpoints — Adding leave types auto-completes the Leave and Holidays step.

---

<a id="8-employee-onboarding"></a>

## 8. Employee Onboarding (Create + Optional Invite)

### Overview

The Employee Onboarding (Create + Optional Invite) flow enables HR and admin users to add new employees to the payroll system, automatically generate employee IDs, and optionally send invitation emails. When `sendInvite` is true, the employee record transitions to `pending` status and an atomic invitation is minted; on invitation acceptance, the employee's status flips to `active` and a user is linked. The wizard then supports bulk profile updates (address, bank details, emergency contacts, education, compensation) and asset assignment in a transactional profile PATCH.

### Entry Point

**POST /employees** (NestJS backend route, `employees.controller.ts:114`)
- Triggered from the frontend `AddEmployeeWizard` component (`src/components/employees/AddEmployeeWizard.tsx:534`)
- User clicks "Submit & Onboard" button after filling mandatory fields
- Request body: `CreateEmployeeDto` with optional `sendInvite` and `inviteRoleId` flags

### Step-by-Step Walkthrough

1. **Frontend validation** — AddEmployeeWizard (`src/components/employees/AddEmployeeWizard.tsx:388`) validates required fields (firstName, lastName, workEmail, department, designation, category, salary, payrollSetupId) and halts with a toast if any are missing.

2. **Mutation invocation** — `useCreateEmployee` hook (`src/hooks/queries/useEmployees.ts:151`) transforms snake_case frontend data into camelCase backend DTO, converting empty strings to `null` to prevent unique-constraint conflicts.

3. **Controller route guard** — `POST /employees` enforces `@Roles('super_admin', 'admin', 'hr')` (employees.controller.ts:112) and applies `ZodValidationPipe(createEmployeeSchema)` to validate the DTO shape.

4. **Auto-generate empId** — `EmployeesService.create()` (employees.service.ts:153) calls `nextEmpId(clientId)` if the wizard didn't supply one, computing `max(suffix) + 1` from all tenant employee codes and returning e.g. `EMP-001`, `EMP-002` (employees.service.ts:249).

5. **Uniqueness check** — Service queries the `employees` table for an existing `(clientId, empId)` pair (employees.service.ts:163); if found, throws `ConflictException` with code `EMP_ID_TAKEN`.

6. **Create employee row** — Prisma `employee.create()` persists the new row (employees.service.ts:178) with fields like firstName, lastName, email, joiningDate; if `sendInvite` is true, status is forced to `pending`, otherwise defaults to `active` (employees.service.ts:186).

7. **Resolve default role** — If `sendInvite` is true and no `inviteRoleId` was supplied, the service queries for the tenant's system `Employee` role (employees.service.ts:201-206) and uses its ID; otherwise uses the provided `inviteRoleId`.

8. **Mint invitation** — `InvitationsService.create()` is called with email, appRole, roleId, firstName, lastName, empId, department, designation (employees.service.ts:209-222), creating an `invitations` row and atomically queuing the acceptance email.

9. **Handle email delivery failure** — If the MailService rejects the send, the employee row is NOT rolled back; instead, `inviteEmailSent: false` is returned so the FE can show a warning toast (employees.service.ts:224-232).

10. **Controller response** — Returns `{ employee, invitation: { id, emailSent } | null }` to the frontend (employees.service.ts:235).

11. **Profile update mutation** — AddEmployeeWizard calls `employeesApi.updateProfile(newEmpId, {...})` with address, bankDetails, emergencyContact, education, compensation objects (AddEmployeeWizard.tsx:570).

12. **PATCH /employees/:id/profile** — NestJS route (employees.controller.ts:103) accepts `UpdateProfileDataDto` and invokes `EmployeesService.updateProfileData()` (employees.service.ts:311), which wraps all six sub-record updates in a Prisma transaction.

13. **Sub-record upsert logic** (employees.service.ts:314-419) — Singletons (address, bankDetails, emergencyContact) upsert the latest row; collections (education, documents, compensation) delete all active rows then insert fresh ones (historic compensation rows with `effectiveTo != null` are preserved).

14. **Asset assignment** — For each selected asset ID, `assignAsset.mutateAsync()` calls `PATCH /assets/:id` with `{ assignedToId: newEmpId, assignedDate }` (AddEmployeeWizard.tsx:622); errors are collected without rolling back the employee (AddEmployeeWizard.tsx:620-636).

15. **Role assignment** — If a roleId was selected, `useAssignEmployeeRole` syncs via `assignRole.mutateAsync()`, linking the employee to the role in the `user_roles` table (AddEmployeeWizard.tsx:643-650).

16. **Query invalidation** — React Query caches are cleared (`employeeKeys.all`, `invitations`) so the directory and detail pages refetch fresh data (AddEmployeeWizard.tsx:660-661).

17. **Toast feedback** — Success toast shows "Employee added — invitation sent" (if `emailSent: true`) or a warning if delivery failed (AddEmployeeWizard.tsx:668-685).

### Validation & Business Rules

- **Zod schemas** (employee.schemas.ts) — `createEmployeeSchema` enforces firstName, lastName as min-length 1 strings; email as valid email; empId as optional 1–40 char string; dates as ISO YYYY-MM-DD strings; `sendInvite` and `inviteRoleId` as optional flags.

- **Role gates** — Only `super_admin`, `admin`, `hr` can POST /employees; all authenticated roles can read.

- **Uniqueness constraints** — `(clientId, empId)` must be unique; if a race condition causes collision, the second request receives HTTP 409 with `EMP_ID_TAKEN` error code.

- **Status transitions** — New employee starts in `pending` if `sendInvite: true`, otherwise `active` (via Prisma column default). On invitation accept, `InvitationsService.accept()` flips status to `active`.

- **Atomic invitation mint** — Invitation row creation and email queueing happen in `InvitationsService.create()` (transactional at the service level); employee row persists regardless of email failure so admin can resend later.

- **Profile sub-records are optional** — The `UpdateProfileDataDto` schema makes all sections optional; only provided keys trigger DB writes (employees.service.ts:316, 334, 352, 370, 383, 402).

- **Historic compensation preservation** — When updating compensation via PATCH /employees/:id/profile, only rows with `effectiveTo: null` are deleted; rows with a past `effectiveTo` date remain as audit trail (employees.service.ts:405-406).

### Outcomes

**Success:**
- Employee row created with auto-generated or supplied empId, scoped to clientId, status `pending` (if inviting) or `active`.
- Invitation row (if `sendInvite: true`) minted with expiry window; acceptance email queued and sent.
- Profile sub-records (address, bank, emergency contact, education, compensation) created/upserted in a single transactional PATCH.
- Assets atomically assigned; role synced to `user_roles` table.
- Frontend receives employee record + invitation metadata; directory page refetches; success toast displays.

**Failure modes:**
- **400 Bad Request**: Zod validation fails (malformed DTO, invalid email format, missing required fields).
- **409 Conflict** (`EMP_ID_TAKEN`): empId already exists for this clientId.
- **404 Not Found** (`EMPLOYEE_NOT_FOUND`): used only on subsequent PATCHes; initial create will not trigger this.
- **Email delivery failure** (`emailSent: false` in response): employee row is saved; invitation row created; MailService rejection is logged and surfaced to FE as warning toast; admin can resend from employee detail view.
- **Asset assignment error**: collected without rolling back employee; warning toast shown for each failed asset; successful assets are still assigned.

### Related Endpoints

- **POST /employees** — Create employee (with optional atomic invitation mint).
- **PATCH /employees/:id** — Update employee core fields (firstName, lastName, department, designation, etc.).
- **PATCH /employees/:id/profile** — Bulk-upsert address, bank, emergency, education, documents, compensation sub-records (transactional).
- **GET /employees** — List employees (directory view).
- **GET /employees/me** — Fetch current user's linked employee record.
- **GET /employees/:id/profile** — Fetch employee with all sub-records (eagerly loads addresses, bankDetails, emergencyContacts, education, documents, compensation).
- **DELETE /employees/:id** — Archive via soft-delete (status → `separated`).
- **POST /invitations** — Minted atomically by `EmployeesService.create()` when `sendInvite: true`.
- **POST /invitations/:id/resend** — Resend acceptance email (accessible from employee detail view in edit mode).
- **PATCH /assets/:id** — Assign asset to employee (called for each selected asset during onboarding).
- **POST /user-roles** or similar — Assign role to employee (called via `useAssignEmployeeRole` after creation).

---

<a id="9-employee-profile-update"></a>

## 9. Employee Profile Update (Sub-records)

### Overview
The Employee Profile Update flow allows authenticated users to bulk-save employee sub-records (address, bank details, emergency contact, education, documents, and compensation) in a single transactional request. This flow serves both self-service profile pages (employees updating their own details) and admin/HR profile editors, providing a clean separation between employee header fields (`PATCH /employees/:id`) and sub-record mutations (`PATCH /employees/:id/profile`).

### Entry Point
The flow is triggered by two endpoints:
1. `PATCH /employees/:id` (employees.controller.ts:122–131) — Updates employee header fields (firstName, lastName, dateOfBirth, etc.), gated to `@Roles('super_admin', 'admin', 'hr')`
2. `PATCH /employees/:id/profile` (employees.controller.ts:94–109) — Bulk-saves all six sub-record types in one transaction, gated to `@Roles('super_admin', 'admin', 'hr', 'employee')` for self-service

### Step-by-Step Walkthrough
1. **User initiates profile edit** in the React frontend (MyProfilePage or admin profile editor), which loads the profile via `useEmployeeProfile(employeeId)` hook (src/hooks/queries/useEmployeeProfile.ts:154–234).

2. **Hook fetches profile** by calling `GET /employees/:id/profile` (employees.controller.ts:78–92), which invokes `findProfileById` (employees.service.ts:121–139). This returns the employee record plus latest address/bank/emergency (via `orderBy: { createdAt: 'desc' }, take: 1`) and full education/documents/compensation collections, re-hydrating the snake_case shapes the UI expects.

3. **User edits form fields** and submits via `useUpdateEmployeeProfile()` mutation (src/hooks/queries/useEmployeeProfile.ts:285–372), which splits updates into two phases:
   - **Phase 1:** Bio/contact fields (`first_name`, `last_name`, `personal_phone`, etc.) → `PATCH /employees/:id` calling `update` (employees.service.ts:265–278), which applies the UpdateEmployeeDto and parses ISO dates via `parseDate()` helper.
   - **Phase 2:** Sub-records → `PATCH /employees/:id/profile` with UpdateProfileDataDto, invoking `updateProfileData` (employees.service.ts:311–422).

4. **Backend validates request** via Zod schemas (employees.schemas.ts:146–154). Each sub-record type has its own schema (addressInputSchema, bankDetailsInputSchema, educationRowSchema, etc.). BigInt amounts are transformed at validation time.

5. **Service executes transactional upsert** in `updateProfileData` (employees.service.ts:311–422):
   - Calls `ensureExists(clientId, id)` to verify employee exists, throws `EMPLOYEE_NOT_FOUND` if not (employees.service.ts:295–301).
   - Opens a Prisma transaction (`prisma.$transaction`) encompassing all six operations atomically.
   - **Singletons (address/bank/emergency):** Queries the latest row via `findFirst(...orderBy: { createdAt: 'desc' })`. If found, updates in place; else creates new row. Lines 315–367.
   - **Collections (education/documents/compensation):** Deletes all current rows matching the employee, filters out empty entries, then inserts new set. Lines 369–418.
   - **Compensation special case:** Only deletes active rows (`effectiveTo: null`), preserving historic rows with `effectiveTo` dates as audit trail (line 405–406).
   - Dates are parsed via `parseDate()` to handle null / empty strings (line 451–454).

6. **Service re-hydrates and returns profile** by calling `findProfileById(clientId, id)` again (employees.service.ts:421), ensuring the response matches the same shape used by the GET endpoint for consistency.

7. **Frontend invalidates query cache** via React Query, firing `employeeKeys.profile()`, `employeeKeys.detail()`, and `employeeKeys.all` (src/hooks/queries/useEmployeeProfile.ts:360–362), then displays a success toast: "Profile updated successfully." (line 363).

### Validation & Business Rules
- **Role gates:** `PATCH /employees/:id/profile` allows `super_admin`, `admin`, `hr`, and `employee` (self-service). `PATCH /employees/:id` is restricted to `super_admin`, `admin`, `hr` only.
- **Zod schemas enforce field constraints:** emails lowercased, phone/postal code max lengths, dates in YYYY-MM-DD format (isoDate regex), compensation amounts coerced to BigInt.
- **Client scope enforcement:** All queries filtered by `clientId` via `ClientScopeGuard` and `@ClientScope()` decorator (employees.controller.ts:39–40).
- **Singleton upsert semantics:** Address, bank, and emergency contact rows are identified by "latest" (most recent `createdAt`). On update, the latest row is mutated in place; new rows are only created if none exist.
- **Collection replacement semantics:** Education, documents, and active compensation rows are deleted entirely then recreated. Empty rows (missing institution/degree/fieldOfStudy) are filtered out pre-insert (education line 375; documents line 388).
- **Compensation audit trail:** Only active compensation rows (`effectiveTo IS NULL`) are replaced. Rows with an `effectiveTo` date remain untouched, forming a historical record of salary changes.
- **Transactional atomicity:** All six operations share a single Prisma transaction; if any write fails, all are rolled back.
- **404 handling:** If employee does not exist in the target client, `ensureExists` throws `NotFoundException` with code `EMPLOYEE_NOT_FOUND` (employees.service.ts:457–459).

### Outcomes
**Success:**
- All six sub-record types are persisted to the database atomically.
- The service returns the complete refreshed profile (employee + latest sub-records + full collections) in camelCase (e.g., `employeeId`, `bankDetails`, `compensation`).
- Frontend caches are invalidated and React Query refetches the profile with the new data.
- A success toast appears: "Saved — Profile updated successfully."

**Failure modes:**
- **HTTP 400:** Zod validation fails (malformed dates, missing required fields). The response body includes the validation error details.
- **HTTP 404 (EMPLOYEE_NOT_FOUND):** Employee does not exist in the target client or has already been deleted.
- **HTTP 409 (EMP_ID_TAKEN):** Returned only by `POST /employees` if the auto-generated empId collides; does not apply to profile updates.
- **HTTP 500:** Transactional write fails (e.g., database constraint violation, out-of-disk).
- Frontend displays a destructive toast: "Save failed — [error message]" (src/hooks/queries/useEmployeeProfile.ts:365–370).

### Related Endpoints
- `GET /employees/:id` (employees.controller.ts:68–76) — Fetch a single employee with reportsTo and directReports relationships.
- `GET /employees/:id/profile` (employees.controller.ts:78–92) — Fetch employee plus latest address/bank/emergency + full education/documents/compensation collections. Drives the initial load and re-hydration after profile save.
- `POST /employees` (employees.controller.ts:111–120) — Create a new employee; optionally sends an invitation email.
- `PATCH /employees/:id` (employees.controller.ts:122–131) — Update employee header fields (firstName, lastName, dateOfBirth, personal contact, etc.).
- `DELETE /employees/:id` (employees.controller.ts:133–148) — Soft-archive an employee via status=separated.
- `GET /employees/me` (employees.controller.ts:61–66) — Convenience endpoint returning the current user's linked employee record.

---

<a id="10-org-structure"></a>

## 10. Org Structure (Divisions / Departments / Designations)

### Overview

The Org Structure flow manages three per-tenant lookup tables—Divisions, Departments, and Designations—that serve as dropdown options in employee wizards and the HR Settings Company Structure page. Each entity enforces a unique (clientId, name) constraint and supports CRUD operations scoped to the authenticated tenant.

### Entry Point

The flow is initiated by users clicking the "Add Division", "Add Department", or "Add Title" buttons on the Company Structure page. The entry points are:
- `POST /org-structure/divisions`
- `POST /org-structure/departments`
- `POST /org-structure/designations`

All other operations (list, update, delete) branch from the same page. Users must have `super_admin`, `admin`, or `hr` role to create or modify; `employee` role can list only.

### Step-by-Step Walkthrough

1. **User clicks "Add Division" button** on CompanyStructurePage.tsx:166–189. A modal dialog opens with a name input field.

2. **Frontend builds request** via `useCreateDivision()` hook (api/src/modules/org-structure/org-structure.controller.ts:40–53). Form submission calls `createDivMut.mutateAsync({ name: divName })`.

3. **Request reaches API**. POST body validates against `createNamedLookupSchema` (api/src/modules/org-structure/dto/org-structure.schemas.ts:4–7): name is trimmed, 1–120 chars, `isActive` is optional (defaults true).

4. **Controller route handler** `createDivision()` receives `@ActiveClientId()` and validated DTO, dispatches to `OrgStructureService.createDivision()` (org-structure.service.ts:42–50).

5. **Service executes Prisma create**. If the (clientId, name) pair already exists, Prisma raises P2002 unique violation. The service catches this in `translateUniqueViolation()` (org-structure.service.ts:201–215) and throws `ConflictException` with code `DIVISION_NAME_TAKEN` and HTTP 409.

6. **Success path** returns the created division row (id, clientId, name, isActive). Frontend receives response, closes modal, and displays toast: "Added: {divName} division added."

7. **Update flow** (e.g., Pencil icon click, org-structure.service.ts:52–65): loads current record into modal, user edits name/status. `updateDivision()` first calls `ensureDivisionInClient()` to verify ownership (org-structure.service.ts:162–173), then updates Prisma row. Same P2002 translation applies.

8. **Delete flow** (Trash icon): calls `deleteDivision()`, which verifies ownership, then hard-deletes the row. Employees keep free-text snapshots of department/designation strings, so FK integrity is preserved (org-structure.service.ts:15–28 comment).

9. **Designations differ only in schema**: `createDesignationSchema` accepts `level` (int, 1–10, optional, nullable). Frontend maps level 1→"Entry", 2→"Professional", 3→"Management", 4→"Leadership" (CompanyStructurePage.tsx:21–22).

10. **All read endpoints** list by (clientId, isActive desc, name asc) and are accessible to employee role. Write endpoints require admin/hr role guard enforced by `@Roles()` decorator and `RolesGuard` middleware.

### Validation & Business Rules

- **Schema validation**: Zod pipes validate request body before reaching the service. Division/Department names: 1–120 chars, trimmed. Designation level: int, 1–10, optional null.
- **Unique constraint**: (clientId, name) is enforced at database level. Duplicate inserts yield HTTP 409 `CONFLICT` with error code `{ENTITY}_NAME_TAKEN` (e.g., `DIVISION_NAME_TAKEN`, `DESIGNATION_NAME_TAKEN`) and human-readable message e.g. `Division "Engineering" already exists`.
- **Role-based access control**: List operations allow super_admin, admin, hr, employee. Create/Update/Delete require super_admin, admin, or hr. `@Roles()` decorator gates routes; `RolesGuard` validates token claims.
- **Tenant isolation**: All queries and mutations filter/check `clientId`. Update and delete operations verify the record exists in the tenant via `ensureDivisionInClient()`, `ensureDepartmentInClient()`, or `ensureDesignationInClient()` before modifying, returning HTTP 404 with code `{ENTITY}_NOT_FOUND` if not found.
- **Soft-state defaults**: `isActive` defaults to `true` on create; update operations only touch fields present in the DTO (partial schemas).

### Outcomes

**Success:**
- Record inserted or updated in PostgreSQL (division, department, or designation table).
- Response includes the full row (id, clientId, name, isActive, and level for designations).
- Frontend closes modal, displays success toast (e.g., "Added: Engineering division added."), and re-queries the list via React Query, updating the table immediately.

**Failure modes:**
- **HTTP 409 Conflict**: `{ENTITY}_NAME_TAKEN` — user attempts to create/update a division/department/designation with a name already used in their tenant. Toast displays the API error message.
- **HTTP 404 Not Found**: `{ENTITY}_NOT_FOUND` — user attempts to update/delete a record that does not exist or belongs to a different tenant.
- **HTTP 400 Bad Request**: Zod validation fails (e.g., name is empty or >120 chars, level is not 1–10). Frontend toast shows validation error.
- **HTTP 401 Unauthorized** / **403 Forbidden**: Missing/invalid bearer token or insufficient role (employee cannot write).

### Related Endpoints

- `GET /org-structure/divisions` — list divisions by clientId
- `POST /org-structure/divisions` — create division
- `PATCH /org-structure/divisions/:id` — update division (name and/or isActive)
- `DELETE /org-structure/divisions/:id` — hard-delete division
- `GET /org-structure/departments` — list departments by clientId
- `POST /org-structure/departments` — create department
- `PATCH /org-structure/departments/:id` — update department
- `DELETE /org-structure/departments/:id` — hard-delete department
- `GET /org-structure/designations` — list designations by clientId
- `POST /org-structure/designations` — create designation (with optional seniority level)
- `PATCH /org-structure/designations/:id` — update designation
- `DELETE /org-structure/designations/:id` — hard-delete designation

---

<a id="11-leave-management"></a>

## 11. Leave Management (Types / Balances / Requests / Holidays)

### Overview
The Leave Management flow enables employees to request time off while allowing HR/admin staff to maintain leave type configurations, employee balances, and holiday calendars. This system encompasses leave type setup, per-employee balance tracking (allocated/used/carried-forward), the full request lifecycle (submit → pending → approve/reject → deduction), and holiday management for the organization.

### Entry Point
Leave requests originate from **`POST /leave-requests`** (api/src/modules/leave/leave.controller.ts:137-149), which accepts a `CreateLeaveRequestDto` (startDate, endDate, days, reason, optional employeeId). Employees submit their own requests; admin/HR may submit on behalf of others. The endpoint resolves the caller's employee ID and enforces role-based restrictions before delegating to `LeaveService.createRequest()`.

### Step-by-Step Walkthrough

1. **Admin/HR Configure Leave Types** → `POST /leave-types` (controller:68-76) → `LeaveService.createType()` (service:45-46) → Inserts row into `leaveType` table with accrual rules (none/monthly/yearly), max carryforward, gender specifics, and approval flags.

2. **Setup Employee Balances** → `POST /leave-balances` (controller:111-119) → `LeaveService.upsertBalance()` (service:75-98) → Upserts composite key `(employeeId, leaveTypeId, year)` in `leaveBalance` table; stores allocated, used, and carriedForward as decimal strings.

3. **Employee Submits Leave Request** → `POST /leave-requests` (controller:137-149) → Controller validates date range (service:171-176) and enforces ownership/permission rules (service:158-170) → `LeaveService.createRequest()` (service:152-206) creates row with status=`pending` (Prisma enum `LeaveRequestStatus.pending`, service:187).

4. **Notification to Approvers** → Within `createRequest()`, `notifyApprovers()` (service:208-252) queries all active admin/HR users in the client, deduplicates by email, and invokes `MailService.sendApprovalNotification()` with a review link to `{FRONTEND_URL}/leave/requests/{requestId}`.

5. **Admin/HR Reviews & Decides** → `POST /leave-requests/:id/decision` (controller:151-162) → `LeaveService.decide()` (service:259-324) validates request is still `pending` (service:267-272), checks rejection requires reason (service:273-278), then:
   - **If approve**: Wraps in `$transaction()` to atomically update request status→`approved` (service:287) and increment `leaveBalance.used` by request.days for the year derived from startDate (service:292-310).
   - **If reject**: Updates status→`rejected` with reason stored in `rejectionReason` field (service:312-320).

6. **Employee Cancels Pending Request** → `POST /leave-requests/:id/cancel` (controller:164-174) → `LeaveService.cancel()` (service:326-345) ensures only request owner, only pending status → updates status→`cancelled`.

7. **Query Leave Requests** → `GET /leave-requests` (controller:123-135) → `LeaveService.listRequests()` (service:103-150) filters by clientId, status, leaveTypeId, employeeId; employees see only their own unless scope='all' and user is admin/HR; returns paginated results with employee & type details.

8. **Query & Manage Holidays** → `GET /holidays` (controller:178-186) → `LeaveService.listHolidays()` (service:349-364) filters by year or date range; `POST /holidays`, `PATCH /holidays/:id`, `DELETE /holidays/:id` manage holiday records with name, date, optional flag, and location applicability.

### Validation & Business Rules

- **Zod Schemas** (leave.schemas.ts):
  - `createLeaveRequestSchema`: requires `leaveTypeId`, `startDate`, `endDate`, `days` (all ISO dates or decimal); optional `employeeId` and `reason` (max 500 chars).
  - `decideLeaveRequestSchema`: requires `decision` ('approve' | 'reject'); `rejectionReason` mandatory only on reject.
  - `createLeaveTypeSchema`: requires `name` & `code` (uppercase); `accrualType` defaults to 'yearly'; `daysPerYear`, `maxCarryforward`, `requiresApproval`, `genderSpecific`, `isPaid` all configurable.
  - `upsertBalanceSchema`: composite unique key on `(employeeId, leaveTypeId, year)`.

- **Role Gates** (controller):
  - `@Roles('super_admin', 'admin', 'hr')` for create/update/delete leave types, approve/reject requests, manage holidays.
  - `@Roles('employee')` may submit requests for themselves; admin/HR use `canSubmitForOthers` flag.
  - All endpoints guarded by `ClientScopeGuard` and `RolesGuard` (controller:49).

- **Status Transitions** (Prisma enum `LeaveRequestStatus`):
  - `pending` → `approved` | `rejected` | `cancelled` (only).
  - Once approved/rejected, request cannot change status (service:267-272 guards against re-deciding).
  - Only request owner may cancel (service:329-333).

- **Balance Deduction on Approval** (service:281-310):
  - Transactional upsert into `leaveBalance` atomically increments `used` field by `request.days`.
  - If no balance record exists, creates one with `allocated='0'`, `used=request.days`.
  - Uses start-date year for deduction (service:282).

- **Date Validation** (service:171-176): `startDate` must be ≤ `endDate`; returns `INVALID_DATE_RANGE` error.

- **Error Codes** (service):
  - `NO_EMPLOYEE_CONTEXT`: caller is not an employee and did not provide `employeeId`.
  - `CANNOT_SUBMIT_FOR_OTHERS`: non-admin/HR trying to submit for another employee.
  - `REQUEST_NOT_FOUND`: leave request ID not found in client scope.
  - `REQUEST_NOT_PENDING`: attempting to decide/cancel non-pending request.
  - `REJECTION_REASON_REQUIRED`: rejecting without reason.
  - `NOT_OWNER`: employee trying to cancel someone else's request.
  - `LEAVE_TYPE_NOT_FOUND`, `HOLIDAY_NOT_FOUND`: resource not scoped to client.

### Outcomes

**Success (Approval/Rejection):**
- LeaveRequest record updated with status, approverEmployeeId, approvedAt timestamp, and (if rejected) rejectionReason.
- On approval, `leaveBalance.used` atomically incremented; employee sees reduced available balance.
- Request returned to caller with all updated fields (service:323).

**Success (Submission):**
- LeaveRequest created with status=`pending`; employee receives confirmation.
- Notification emails sent to all active admin/HR users in the client with review link.
- Request visible in `GET /leave-requests` with pagination.

**Failure Modes:**
- **HTTP 400** `INVALID_DATE_RANGE`: startDate > endDate.
- **HTTP 400** `NO_EMPLOYEE_CONTEXT`: orphan user, no employeeId provided.
- **HTTP 403** `CANNOT_SUBMIT_FOR_OTHERS`: employee submitting for peer.
- **HTTP 403** `NOT_OWNER`: employee canceling someone else's request.
- **HTTP 400** `REQUEST_NOT_PENDING`: attempt to decide/cancel already-resolved request.
- **HTTP 400** `REJECTION_REASON_REQUIRED`: rejecting without reason text.
- **HTTP 404** `REQUEST_NOT_FOUND`, `LEAVE_TYPE_NOT_FOUND`, `HOLIDAY_NOT_FOUND`: resource not in scope.

### Related Endpoints

- **Leave Types:** `GET /leave-types`, `POST /leave-types`, `PATCH /leave-types/:id`, `DELETE /leave-types/:id`
- **Leave Balances:** `GET /leave-balances`, `POST /leave-balances`
- **Leave Requests:** `GET /leave-requests`, `POST /leave-requests`, `POST /leave-requests/:id/decision`, `POST /leave-requests/:id/cancel`
- **Holidays:** `GET /holidays`, `POST /holidays`, `PATCH /holidays/:id`, `DELETE /holidays/:id`

---

<a id="12-expenses"></a>

## 12. Expense Claim Lifecycle

### Overview
The expense claim lifecycle enables employees to file, submit, and track reimbursement requests through a multi-stage approval process. Employees (or HR/admin on their behalf) create expenses in draft status, submit them for review, and approvers (admin/HR) approve or reject claims. Approved expenses are then marked paid manually (pre-payroll-integration) to prevent duplicate processing, with all status transitions and approvals audited in the database.

### Entry Point
Expense claims originate via `POST /expenses` (api/src/modules/expenses/expenses.controller.ts:69–80). The frontend initiates this by calling the create endpoint with a `CreateExpenseDto` containing amount, currency, expenseDate, optional category/description/receiptUrl/projectCode, and an optional employeeId. The initial status defaults to `draft` unless explicitly set to `submitted` in the request body (expense.schemas.ts:27).

### Step-by-Step Walkthrough

1. **Employee creates expense (draft).** Frontend calls `POST /expenses` with `CreateExpenseDto`. ExpensesController.create (line 71–79) validates the user has an employee record (callerEmpId via api/src/modules/expenses/expenses.service.ts:134–140) and checks if the caller can file for others (super_admin, admin, hr only). ExpensesService.create (expenses.service.ts:90–123) persists the expense to the `expenses` table with status `draft`, storing amount as BigInt minor units (cents), currency (default AED), expenseDate, category, description, receiptUrl, projectCode, and a FK to the employee.

2. **Employee edits expense (draft/rejected only).** Frontend calls `PATCH /expenses/:id` with `UpdateExpenseDto`. ExpensesService.update (expenses.service.ts:125–140) checks status is `draft` or `rejected`; throws `NOT_EDITABLE` (400) if status is `submitted`, `approved`, or `paid`. Updates the record in place and returns it.

3. **Employee submits expense.** Frontend calls `POST /expenses/:id/submit`. ExpensesController.submit (line 92–100) routes to ExpensesService.submit (expenses.service.ts:142–168). The service verifies status is `draft` or `rejected`; throws `NOT_SUBMITTABLE` (400) otherwise. Updates status to `submitted`, clears any rejectionReason. Concurrently, notifyApprovers (expenses.service.ts:170–213) queries all active admin and HR users for this client, builds a review URL pointing to `FRONTEND_URL/expenses/{id}`, and sends approval notification emails to each unique approver.

4. **Admin/HR reviews submitted expense.** Frontend calls `POST /expenses/:id/decision` with `DecideExpenseDto` (decision: 'approve' | 'reject', rejectionReason optional). ExpensesController.decide (line 102–113) enforces `@Roles('super_admin', 'admin', 'hr')`. ExpensesService.decide (expenses.service.ts:215–250) verifies status is `submitted`; throws `NOT_SUBMITTED` (400) if not. If decision is `reject`, requires rejectionReason; throws `REJECTION_REASON_REQUIRED` (400) if missing. Updates the expense: if approved, sets status to `approved`, approvedById (UUID of the deciding employee), and approvedAt. If rejected, sets status to `rejected`, approvedById, approvedAt, and rejectionReason. The employee can then resubmit from rejected status.

5. **Admin/HR marks expense paid (pre-payroll-integration).** Frontend calls `POST /expenses/:id/mark-paid` (line 115–123). ExpensesService.markPaid (expenses.service.ts:252–264) checks status is `approved`; throws `NOT_APPROVED` (400) otherwise. Sets status to `paid` and paidAt to the current timestamp. This manual step prevents duplicate reimbursement during eventual payroll integration.

### Validation & Business Rules

- **Status transitions:** `draft` → `submitted` (via /submit), `submitted` → `approved` or `rejected` (via /decision), `approved` → `paid` (via /mark-paid). Only `draft` and `rejected` expenses are editable (PATCH). Status `paid` and `approved` prevent deletion.
- **Role-based access:** All endpoints require `@Roles('super_admin', 'admin', 'hr', 'employee')` except `/decision` and `/mark-paid`, which require `@Roles('super_admin', 'admin', 'hr')`. The list endpoint checks `canSeeAll` (admin/HR/super_admin) to return all expenses or only the caller's own.
- **Employee context:** Employees filing expenses must have an employee record (linked via userId → employee.id in Prisma). HR/admin can file for others (CANNOT_SUBMIT_FOR_OTHERS check, line 103–107).
- **Zod schemas:** All DTOs validated via ZodValidationPipe. Amount accepts string or number, converted to BigInt. Currency is uppercase, 3 chars, defaults to AED. ExpenseDate must be ISO date string. Category, description, rejection reason max 500 chars. ProjectCode max 40 chars. DecideExpenseSchema requires decision enum and optional rejectionReason (required if rejecting).
- **Query filtering:** List endpoint (GET /expenses) supports filters: status, employeeId, category, from/to date range, search (description/category/projectCode, case-insensitive), and scope ('mine' or 'all', admin-only). Results paginated.
- **Audit trail:** approvedById (UUID of approving employee), approvedAt, paidAt, rejectionReason, and createdAt/updatedAt track all state changes.
- **Email notifications:** On submit, notifyApprovers sends to all active admin/HR users in the client, with expense currency/amount/category and a link to the expense detail page.

### Outcomes

**Success:**
- Expense persisted to `expenses` table with generated UUID.
- Status transitions recorded (createdAt, approvedAt, paidAt).
- ApprovedById and rejectionReason populated on decision.
- User sees HTTP 200 with updated expense object.
- Approvers receive email notification on submit.
- Frontend redirects or shows toast confirming status change (e.g., "Expense submitted").

**Failure modes:**
- `NO_EMPLOYEE_CONTEXT` (400): Caller is not an employee and no employeeId provided.
- `CANNOT_SUBMIT_FOR_OTHERS` (403): Caller is not admin/HR trying to file for another employee.
- `NOT_EDITABLE` (400): Attempt to update expense with status other than draft/rejected.
- `NOT_SUBMITTABLE` (400): Attempt to submit expense not in draft/rejected status.
- `NOT_SUBMITTED` (400): Attempt to approve/reject an expense not in submitted status.
- `REJECTION_REASON_REQUIRED` (400): Rejection without reason.
- `NOT_APPROVED` (400): Attempt to mark-paid an expense not in approved status.
- `CANNOT_DELETE` (400): Attempt to delete an approved or paid expense.
- `EXPENSE_NOT_FOUND` (404): Expense ID does not exist for this client.
- Email notification failures logged (warn level) but do not fail the transaction.

### Related Endpoints

- `GET /expenses` — List expenses with filters and pagination.
- `GET /expenses/:id` — Retrieve single expense details.
- `POST /expenses` — Create new expense (draft or submitted).
- `PATCH /expenses/:id` — Update draft or rejected expense.
- `POST /expenses/:id/submit` — Move from draft/rejected to submitted.
- `POST /expenses/:id/decision` — Approve or reject a submitted expense.
- `POST /expenses/:id/mark-paid` — Mark approved expense as paid.
- `DELETE /expenses/:id` — Delete draft or rejected expense.

---

<a id="13-advances"></a>

## 13. Salary Advance Lifecycle

### Overview
The Salary Advance Lifecycle manages employee requests for advance payments on salaries. Employees initiate advances in draft state, submit them for approval, and managers (admin/HR) approve or reject. Once approved, advances can be settled with optional tracking of actual amount spent (`amountUsed`), or cancelled at any stage before settlement. Unlike loans, advances are tied directly to salary disbursement and are meant for near-term spending needs.

### Entry Point
Advances are created via `POST /api/advances` with a request body containing the advance name, amount, currency, and optional purpose, expected spend date, and settlement due date. The employee can create it as a draft (default) or submit immediately. After creation, submission occurs via `POST /api/advances/{id}/submit`.

### Step-by-Step Walkthrough
1. **Employee initiates draft**: User submits `POST /api/advances` with `CreateAdvanceDto` (name, amount, currency; status defaults to 'draft'). The controller calls `advances.controller.ts:69–78`, which authenticates the caller and resolves their employee ID via `callerEmpId`. The service method `advances.service.ts:80–113` validates the employee context and writes the advance to the `advance` table with `status: draft`.

2. **Employee edits draft**: Employee updates the draft via `PATCH /api/advances/{id}` with `UpdateAdvanceDto`. The service `advances.service.ts:115–135` verifies the advance is in `draft` or `rejected` status; only these may be edited. The update applies partial changes and persists them.

3. **Employee submits**: Employee calls `POST /api/advances/{id}/submit`. The service `advances.service.ts:137–161` checks the advance is `draft` or `rejected`, then updates status to `submitted` and clears any prior `rejectionReason`. Simultaneously, `notifyApprovers` is invoked `advances.service.ts:163–206` to send approval notification emails to all active admin/HR users in the client scope, including the frontend review URL.

4. **Admin/HR decides**: An admin or HR user (role guard at `advances.controller.ts:97`) calls `POST /api/advances/{id}/decision` with `DecideAdvanceDto` (decision: 'approve' | 'reject', rejectionReason optional). The service `advances.service.ts:208–243` verifies status is `submitted`. If decision is 'approve', status becomes `approved`, `approvedById` is set to the deciding employee ID, and `approvedAt` is timestamped. If 'reject', status becomes `rejected`, `approvedById` and `approvedAt` are set, and `rejectionReason` is persisted.

5. **Rejected advance returns to draft or resubmit**: If rejected, the employee may call `PATCH /api/advances/{id}` to edit the advance again, then resubmit via `POST /api/advances/{id}/submit`. This repeats the approval flow.

6. **Admin/HR settles**: Once approved, an admin or HR user calls `POST /api/advances/{id}/settle` with optional `SettleAdvanceDto.amountUsed` (defaults to null). The service `advances.service.ts:245–261` verifies status is `approved`, then updates status to `settled`, sets `settledAt` to the current timestamp, and optionally records `amountUsed` for reconciliation.

7. **Cancel anytime before settlement**: At any point before settlement, any authorized user (employee, admin, HR; role guard at `advances.controller.ts:120`) calls `POST /api/advances/{id}/cancel`. The service `advances.service.ts:263–275` checks the status is not `settled`, then updates status to `cancelled`. Settled advances cannot be cancelled.

### Validation & Business Rules
- **Employee context required**: When creating an advance without specifying `employeeId`, the caller must have an associated employee record; otherwise error `NO_EMPLOYEE_CONTEXT` is thrown (`advances.service.ts:87–92`).
- **Authorization for others**: Only super_admin, admin, or HR roles may file advances on behalf of other employees; regular employees are rejected with `CANNOT_SUBMIT_FOR_OTHERS` (`advances.service.ts:93–98`).
- **Status transitions**: `draft` and `rejected` are the only editable and submittable states. Once `submitted`, the advance may only proceed to `approved` or `rejected` via decision. Only `approved` advances can be settled. Settled advances cannot be cancelled.
- **Decision validation**: Rejections require a non-empty `rejectionReason`; attempts to reject without one fail with `REJECTION_REASON_REQUIRED` (`advances.service.ts:221–226`).
- **Zod schemas enforce**: `createAdvanceSchema` (line 15), `updateAdvanceSchema` (line 28), `decideAdvanceSchema` (line 31), and `settleAdvanceSchema` (line 37) validate DTOs via `ZodValidationPipe`.
- **Role gates**: List, create, and submit are available to all roles; decision and settle are restricted to admin and HR only (`advances.controller.ts:97, 109`).
- **Approval notification**: When an advance is submitted, approvers (active admin and HR users in the client) are notified via email with a link to the advance review page (`advances.service.ts:189–200`).
- **Amount stored in minor units**: The `amount` and `amountUsed` fields are stored as `bigint` representing the smallest currency unit (e.g., cents for USD, fils for AED); the service formats output via `formatMinor` (`advances.service.ts:298–304`).

### Outcomes
**Success:**
- Advance is persisted with the correct status transition and all fields updated.
- User sees the advance object in the response with the new status, timestamps (e.g., `approvedAt`, `settledAt`), and approval metadata (e.g., `approvedById`).
- Approvers receive email notifications upon submission.
- Frontend redirects to advance detail view or list after each state change.

**Failure modes:**
- `NO_EMPLOYEE_CONTEXT` (HTTP 400): No employee record linked to caller and none provided in request.
- `CANNOT_SUBMIT_FOR_OTHERS` (HTTP 403): Caller lacks admin/HR role but attempts to file advance for another employee.
- `NOT_EDITABLE` (HTTP 400): Advance is not in `draft` or `rejected` status.
- `NOT_SUBMITTABLE` (HTTP 400): Advance is not in `draft` or `rejected` status.
- `NOT_SUBMITTED` (HTTP 400): Advance is not in `submitted` status when deciding.
- `REJECTION_REASON_REQUIRED` (HTTP 400): Rejection attempted without a reason.
- `NOT_APPROVED` (HTTP 400): Settle called on non-approved advance.
- `ALREADY_SETTLED` (HTTP 400): Cancel called on settled advance.
- `ADVANCE_NOT_FOUND` (HTTP 404): Advance with given ID and client does not exist.

### Related Endpoints
- `POST /api/advances` — Create new advance.
- `GET /api/advances` — List advances (filtered by status, employee, or search term).
- `GET /api/advances/{id}` — Retrieve single advance.
- `PATCH /api/advances/{id}` — Update editable advance.
- `POST /api/advances/{id}/submit` — Transition from draft/rejected to submitted.
- `POST /api/advances/{id}/decision` — Approve or reject submitted advance.
- `POST /api/advances/{id}/settle` — Mark approved advance as settled with optional amount used.
- `POST /api/advances/{id}/cancel` — Cancel advance before settlement.

---

<a id="14-loans"></a>

## 14. Loan Lifecycle

### Overview
The loan lifecycle flow enables HR and admin users to create employee loans, approve or reject them, manage active repayment schedules, and track balance adjustments through a comprehensive transaction ledger. A loan progresses through states (draft → active/paused → completed/cancelled), with each state supporting specific operations and automatic status transitions when the balance reaches zero.

### Entry Point
**POST /api/v1/loans** creates a new loan in draft status. The request requires role authorization (`super_admin`, `admin`, `hr`) and accepts a `CreateLoanDto` payload with employee ID, principal amount, monthly deduction, optional interest rate in basis points (0–10000), start date, and optional end date and reason.

### Step-by-Step Walkthrough
1. **Create loan (draft):** HR/admin calls `POST /api/v1/loans` with `CreateLoanDto` (loans.controller.ts:69–76). The service `create()` method (loans.service.ts:65–80) writes a new record with `status: draft`, `remainingBalance = principal`, and the provided `monthlyDeduction` rate.

2. **Edit draft loan:** HR/admin calls `PATCH /api/v1/loans/{id}` with partial `UpdateLoanDto` (loans.controller.ts:78–86). The `update()` method (loans.service.ts:82–101) validates the loan is in draft status; if principal changes, `remainingBalance` is synced.

3. **Approve or reject:** HR/admin calls `POST /api/v1/loans/{id}/decision` with `ApproveLoanDto.decision` = 'approve' or 'reject' (loans.controller.ts:88–99). The `approve()` method (loans.service.ts:107–149) checks the loan is draft; on rejection, status flips to `cancelled`. On approval, a Prisma transaction atomically updates status to `active`, sets `approvedById` and `approvedAt`, and creates a `disbursement` type `LoanTransaction` record with `type: disbursement`, `amount: principal`, and `balanceAfter: principal`.

4. **Monthly deduction posting:** During payroll processing (external trigger, not shown in these files), the `monthlyDeduction` amount is deducted from employee salary; a corresponding EMI transaction is logged via `POST /api/v1/loans/{id}/adjust` with `type: 'emi'` (loans.controller.ts:117–131).

5. **Pause active loan:** HR/admin calls `POST /api/v1/loans/{id}/pause` with `PauseLoanDto.until` date and optional reason (loans.controller.ts:101–109). The `pause()` method (loans.service.ts:151–180) validates status is `active`, atomically updates status to `paused`, stores current `monthlyDeduction` in `prePauseEmi`, zeroes `monthlyDeduction`, and logs a `pause` type transaction.

6. **Resume paused loan:** HR/admin calls `POST /api/v1/loans/{id}/resume` (loans.controller.ts:111–115). The `resume()` method (loans.service.ts:182–212) validates status is `paused`, restores the saved EMI rate from `prePauseEmi`, and flips status back to `active` with a `resume` transaction.

7. **Adjust balance (prepayment, EMI, writeoff):** HR/admin calls `POST /api/v1/loans/{id}/adjust` with `AdjustLoanDto` specifying type (`'emi'`, `'prepayment'`, `'writeoff'`, or `'adjustment'`), amount, date, and optional note (loans.controller.ts:117–131). The `adjust()` method (loans.service.ts:219–264) validates status is `active` or `paused`; computes new balance by subtracting amount (or adding if adjustment is negative) or zeroing on writeoff; creates a `LoanTransaction` record; if balance hits zero and loan is active, atomically sets status to `completed`.

8. **View loan details:** Employees, HR, and admins call `GET /api/v1/loans/{id}` (loans.controller.ts:63–67) to retrieve a single loan with full `transactions` array ordered by date descending (loans.service.ts:53–63).

9. **List loans:** Callers invoke `GET /api/v1/loans` with optional filters (status, employeeId, scope='mine'|'all') (loans.controller.ts:50–61). The `list()` method (loans.service.ts:22–51) applies role-based scoping: super_admin/admin/hr see all loans; employees see only their own.

### Validation & Business Rules
- **CreateLoanSchema** (loan.schemas.ts:15–24): employeeId is UUID, principal and monthlyDeduction are bigint, interestRateBps is 0–10000 (default 0), startDate is ISO date, endDate optional, reason max 500 chars.
- **Status transitions**: draft → active (approval) or cancelled (rejection); active → paused or completed (balance zero); paused → active.
- **Role gates**: all endpoints require `@Roles('super_admin', 'admin', 'hr')` except GET which includes `'employee'`.
- **NOT_EDITABLE error** (loans.service.ts:86): only draft loans may be patched.
- **NOT_PENDING error** (loans.service.ts:115): only draft loans may be approved/rejected.
- **NOT_ACTIVE error** (loans.service.ts:154): only active loans may be paused.
- **NOT_PAUSED error** (loans.service.ts:185): only paused loans may be resumed.
- **NOT_OPEN error** (loans.service.ts:223): only active or paused loans may be adjusted.
- **LOAN_NOT_FOUND error** (loans.service.ts:284): loan or client mismatch returns 404.
- **Automatic completion**: when `remainingBalance` reaches zero after an adjust on an active loan, status flips to `completed` (loans.service.ts:240, 259).
- **LoanTransaction ledger**: each state change and adjustment is immutably logged with type (disbursement, pause, resume, emi, prepayment, writeoff, adjustment), amount, balanceAfter, emiAtTime, date, and note. Adjustment type supports signed deltas: positive adds to balance, negative reduces it (loans.service.ts:231–237).

### Outcomes
**Success:**
- Loan created with draft status, returned in response.
- Approval atomically updates status to active, records disbursement, and returns full loan details with transactions.
- Pause/resume flips status, saves/restores EMI, and logs transition.
- Adjust creates transaction ledger entry, updates balance, and auto-completes if balance reaches zero.
- All state-change operations return the refreshed loan object from `findById()` (loans.service.ts:149, 179, 211, 263).

**Failure modes:**
- `NOT_EDITABLE` (400): attempt to patch non-draft loan.
- `NOT_PENDING` (400): attempt to approve/reject non-draft loan.
- `NOT_ACTIVE` (400): attempt to pause non-active loan.
- `NOT_PAUSED` (400): attempt to resume non-paused loan.
- `NOT_OPEN` (400): attempt to adjust non-active/paused loan.
- `LOAN_NOT_FOUND` (404): loan ID not found in client scope.
- Zod validation errors (400): malformed DTO (invalid UUID, non-ISO date, out-of-range interestRateBps, invalid enum).

### Related Endpoints
- `GET /api/v1/loans` — list loans with optional status/employeeId/scope filters
- `GET /api/v1/loans/{id}` — retrieve single loan with transaction history
- `POST /api/v1/loans` — create new draft loan
- `PATCH /api/v1/loans/{id}` — edit draft loan fields
- `POST /api/v1/loans/{id}/decision` — approve (disburse + activate) or reject loan
- `POST /api/v1/loans/{id}/pause` — pause active loan until specified date
- `POST /api/v1/loans/{id}/resume` — resume paused loan, restore EMI
- `POST /api/v1/loans/{id}/adjust` — record EMI, prepayment, writeoff, or signed adjustment

---

<a id="15-assets"></a>

## 15. Asset Management

### Overview

The Asset Management flow enables HR administrators to track organizational assets through their complete lifecycle: creation, assignment to employees with audit trails, status transitions (repair, retirement, loss), and deletion. This flow maintains an immutable `assetHistory` record for every assignment change, supporting compliance and accountability.

### Entry Point

The flow begins via REST endpoints accessed by HR users with `super_admin`, `admin`, or `hr` roles:
- `POST /api/assets` — Create a new asset
- `POST /api/assets/:id/assign` — Assign asset to employee
- `POST /api/assets/:id/unassign` — Unassign and set terminal status
- `DELETE /api/assets/:id` — Hard delete asset

All endpoints require Bearer token authentication and operate within an active `clientId` scope (api/src/modules/assets/assets.controller.ts:36–41).

### Step-by-Step Walkthrough

1. **Create Asset**: HR user submits form with `assetTag`, `name`, and optional fields (category, brand, model, serialNumber, condition, location, dates, cost, notes).
   - POST body validated against `createAssetSchema` (api/src/modules/assets/dto/asset.schemas.ts:15–29)
   - `AssetsService.create()` checks `assetTag` uniqueness per `clientId` — raises `ASSET_TAG_TAKEN` (409 Conflict) if duplicate (api/src/modules/assets/assets.service.ts:66–76)
   - Asset persisted with `status: in_stock` (api/src/modules/assets/assets.service.ts:93)
   - Returns complete asset record

2. **Assign Asset**: HR user selects an employee and assigns the asset via `POST /api/assets/:id/assign`.
   - Request body contains `assignedToId` (employee UUID), optional `assignedDate` and `note` (api/src/modules/assets/dto/asset.schemas.ts:35–40)
   - Controller resolves caller's `empId` by looking up `userId → employee.id` in same `clientId` (api/src/modules/assets/assets.controller.ts:90–91, 113–119)
   - `AssetsService.assign()` validates asset status — raises `NOT_ASSIGNABLE` (400) if asset is `retired` or `lost` (api/src/modules/assets/assets.service.ts:124–129)
   - **Atomic transaction**: (1) Update asset's `assignedToId`, `assignedDate`, `status → assigned`; (2) Create `assetHistory` record with `action: 'assigned'`, `fromEmployeeId` (previous holder), `toEmployeeId` (new holder), `performedById` (caller), `note`, `date` (api/src/modules/assets/assets.service.ts:131–152)
   - Returns refreshed asset with full `history` array ordered by date DESC

3. **Unassign Asset**: HR user unassigns via `POST /api/assets/:id/unassign`, specifying terminal status.
   - Request body: `status` (enum: `in_stock | in_repair | retired | lost`, default `in_stock`) and optional `note` (api/src/modules/assets/dto/asset.schemas.ts:42–46)
   - `AssetsService.unassign()` validates `status === assigned` — raises `NOT_ASSIGNED` (400) otherwise (api/src/modules/assets/assets.service.ts:163–168)
   - **Atomic transaction**: (1) Update asset's `assignedToId → null`, `assignedDate → null`, `status` to provided value; (2) Create `assetHistory` with `action` set to `status` value (or `'unassigned'` if `in_stock`), `fromEmployeeId` (previous holder), `toEmployeeId → null`, `performedById`, `note`, `date: now()` (api/src/modules/assets/assets.service.ts:169–190)
   - Returns refreshed asset record

4. **Delete Asset**: HR user hard-deletes via `DELETE /api/assets/:id`.
   - `AssetsService.delete()` fetches asset — raises `CANNOT_DELETE_ASSIGNED` (400) if `status === assigned` (api/src/modules/assets/assets.service.ts:196–200)
   - Permanently removes asset row from database via Prisma `delete()` (api/src/modules/assets/assets.service.ts:202)
   - Asset history records are retained (Prisma relation cascade not invoked)
   - Returns deleted asset object or void

### Validation & Business Rules

- **Role gate**: Only `super_admin`, `admin`, or `hr` can create, assign, unassign, or delete assets; all roles can read (api/src/modules/assets/assets.controller.ts:48, 63, 72, 82, 95, 108)
- **Uniqueness**: Asset tag must be unique within a `clientId`; duplicate raises error code `ASSET_TAG_TAKEN` (api/src/modules/assets/assets.service.ts:67–75)
- **Status state machine**: 
  - Assets created in `in_stock`
  - Can only be assigned from `in_stock` or `in_repair`; cannot assign `retired` or `lost` assets (api/src/modules/assets/assets.service.ts:124–129)
  - Must be `assigned` to unassign; unassigning sets status to one of `{in_stock, in_repair, retired, lost}` (api/src/modules/assets/assets.service.ts:163–168, 175)
  - Only non-assigned assets (`in_stock`, `in_repair`, `retired`, `lost`) can be deleted (api/src/modules/assets/assets.service.ts:196–200)
- **Audit trail**: Every assign/unassign creates immutable `assetHistory` record capturing `fromEmployeeId`, `toEmployeeId`, `performedById`, `action`, `note`, `date` — fully queryable by asset (api/src/modules/assets/assets.service.ts:140–151, 178–189)
- **Search and filter**: List endpoint supports filtering by `status`, `category`, `assignedToId` and full-text search across `assetTag`, `name`, `brand`, `model`, `serialNumber` (api/src/modules/assets/assets.service.ts:23–39)

### Outcomes

**Success**:
- Asset created with unique tag; returned with `id`, `status: in_stock`, metadata; frontend navigates to detail view or toast confirmation
- Asset assigned; status changes to `assigned`; history entry records the hand-off; all downstream assignment-dependent features (employee dashboard, asset inventory) immediately reflect change
- Asset unassigned; status transitions to selected terminal state; history entry marks action and reason; asset becomes available (or retired) for reallocation
- Asset deleted; hard-deleted from database; history retained for audit; UI refreshes asset list

**Failure modes**:
- `ASSET_TAG_TAKEN` (409) — Create fails; tag already exists in same organization
- `ASSET_NOT_FOUND` (404, error code `ASSET_NOT_FOUND`) — Assign, unassign, update, or fetch by id fails; asset doesn't exist or belongs to different client
- `NOT_ASSIGNABLE` (400, error code `NOT_ASSIGNABLE`) — Assign fails; asset is retired or lost (unmaintained state)
- `NOT_ASSIGNED` (400, error code `NOT_ASSIGNED`) — Unassign fails; asset is not currently assigned (wrong transition)
- `CANNOT_DELETE_ASSIGNED` (400, error code `CANNOT_DELETE_ASSIGNED`) — Delete fails; asset is still assigned to an employee; requires unassign first

### Related Endpoints

- `GET /api/assets` — List all assets with pagination, filtering, search (api/src/modules/assets/assets.controller.ts:47–54)
- `GET /api/assets/:id` — Retrieve single asset with `assignedTo` employee and full `history` (api/src/modules/assets/assets.controller.ts:56–60)
- `PATCH /api/assets/:id` — Update asset metadata (category, brand, dates, cost, notes) without status change (api/src/modules/assets/assets.controller.ts:71–79)

---

<a id="16-payroll-setup"></a>

## 16. Payroll Setup Configuration

### Overview
The Payroll Setup Configuration flow allows HR administrators and super-admins to create, read, update, and delete payroll configurations (setups) that define earning/deduction components and tax slabs for payroll runs. Each setup stores relational component and tax rule records alongside a JSON options blob for backward compatibility with legacy UI state.

### Entry Point
Three main entry points exist:

- **`GET /payroll-setups`** — List all setups for the client with included components and tax rules (directory-list endpoint for the wizard's setup selector).
- **`POST /payroll-setups`** — Create a new setup (requires `super_admin` or `admin` role).
- **`GET /payroll-setups/:id`** — Fetch a single setup with full relational data.
- **`PATCH /payroll-setups/:id`** — Update an existing setup.
- **`DELETE /payroll-setups/:id`** — Hard-delete a setup if no payroll runs reference it.

### Step-by-Step Walkthrough

1. **User clicks "New Payroll Setup" button in the React wizard** (frontend, `src/contexts/PayrollSetupContext.tsx:265–267`)
   - Collects setup metadata (name, country, currency, pay frequency) and arrays of components and tax rules via form state.

2. **Wizard calls `addSetup(setup)` from PayrollSetupContext** (frontend, `PayrollSetupContext.tsx:265–267`)
   - Transforms UI shape into API shape via `setupToCreateBody()` (lines 227–248), which:
     - Converts country display name to ISO-2 code via `toIsoCountry()`.
     - Maps `payslipComponents` array to `ComponentInput[]` using `componentToInput()` (lines 57–76), converting UI decimals (e.g., 100 for 100%) to minor units (basis points or currency cents) by multiplying by 100.
     - Maps `taxRules` array to `TaxRuleInput[]` using `taxToInput()` (lines 79–90), converting tax percentages (e.g., 15%) to basis points (1500 bps).
     - Preserves legacy schema (overtime, leaves, gratuity, etc.) inside the `options` JSON blob.

3. **Frontend calls `POST /payroll-setups`** (controller, `api/src/modules/payroll/payroll.controller.ts:61–69`)
   - Request body validated against `createPayrollSetupSchema` (DTO, `payroll.schemas.ts:30–40`).
   - Router gate: `@Roles('super_admin', 'admin')` — only these roles can create.

4. **Controller invokes `payroll.createSetup(clientId, userId, dto)`** (service, `payroll.service.ts:72–117`)
   - Opens a Prisma transaction.
   - Creates a single `PayrollSetup` row with columns: `name`, `description`, `country`, `currency`, `payFrequency`, `yearEndDate`, and `options` (JSON).
   - If `dto.components.length > 0`, bulk-creates `PayrollSetupComponent` rows (relational), storing type, calculationType, value (in minor units), formula, orderIndex, and isActive.
   - If `dto.taxRules.length > 0`, bulk-creates `PayrollSetupTaxRule` rows, storing slabName, incomeFromMinor, incomeToMinor (both in minor units, supporting open-ended slabs via null), rateBps, and orderIndex.
   - Commits transaction and returns the created setup.

5. **On successful creation, frontend refetches the list** (context, `PayrollSetupContext.tsx:252–253`)
   - `usePayrollSetupsApi()` re-runs, triggering `GET /payroll-setups` with `.include({ components, taxRules })` so the next list fetch includes all relational data.

6. **User clicks "Edit Setup"** (wizard, `PayrollSetupContext.tsx:268–270`)
   - Calls `updateSetup(setup)`, which:
     - Transforms the UI shape via `setupToCreateBody()` again (same decimal-to-minor-unit logic).
     - Calls `PATCH /payroll-setups/:id`.

7. **Controller invokes `payroll.updateSetup(clientId, id, dto)`** (service, `payroll.service.ts:119–172`)
   - Validates setup exists via `findSetup()`.
   - Opens a transaction.
   - Updates scalar `PayrollSetup` fields (name, description, country, currency, payFrequency, yearEndDate, options).
   - If `dto.components` is present, deletes all `PayrollSetupComponent` rows for this setup, then bulk-creates new ones with the same schema.
   - If `dto.taxRules` is present, deletes all `PayrollSetupTaxRule` rows, then bulk-creates new ones.
   - Commits and returns the updated setup.

8. **User clicks "Delete Setup"** (wizard, `PayrollSetupContext.tsx:271–272`)
   - Calls `deleteSetup(id)`, which invokes `DELETE /payroll-setups/:id`.

9. **Controller invokes `payroll.deleteSetup(clientId, id)`** (service, `payroll.service.ts:179–193`)
   - Validates setup exists.
   - **Business rule check:** counts `PayrollRun` rows with this setupId. If any exist, rejects with HTTP 400 and error code `SETUP_HAS_RUNS`, preventing deletion of setups with historical payroll data.
   - If safe, hard-deletes the setup; components and tax rules cascade-delete via FK `onDelete: Cascade`.
   - Returns `{ id, deleted: true }`.

10. **Round-trip hydration for the wizard** (context, `PayrollSetupContext.tsx:131–138`)
    - When `findSetup()` or `listSetups()` is called on the backend, the `include: { components, taxRules }` directive ensures relational data is fetched.
    - Frontend `rowToSetup()` (lines 127–225) then converts the API shape back to UI shape:
      - Runs `inputToComponent()` on each component row, dividing minor units by 100 to recover the original decimal value.
      - Runs `inputToTax()` on each tax rule row, dividing incomeFromMinor and incomeToMinor by 100, and dividing rateBps by 100 to recover percentage.
      - Falls back to the legacy `options` blob if relational rows are absent (backward compatibility for old setups).

### Validation & Business Rules

- **Authentication:** All endpoints require `@ApiBearerAuth()` with valid JWT.
- **Authorization:** 
  - **Create, Update, Delete:** `@Roles('super_admin', 'admin')` — HR users cannot mutate setups.
  - **Read (List & Find):** `@Roles('super_admin', 'admin', 'hr')` — HR users can view.
- **Schema validation (Zod):**
  - `name`: string, 1–120 chars.
  - `country`: ISO-2 (2 chars, uppercase).
  - `currency`: ISO-4217 (3 chars, uppercase).
  - `payFrequency`: enum `'monthly' | 'biweekly' | 'weekly'`.
  - `components[].value`: bigint-like (string or number), stored as minor units.
  - `components[].calculationType`: enum `'fixed' | 'percentage' | 'formula'`.
  - `taxRules[].incomeFromMinor` and `incomeToMinor`: bigint-like, in currency minor units (cents/halalas).
  - `taxRules[].rateBps`: integer 0–10000 (basis points).
  - Uniqueness: No unique constraint on setup name within a client; multiple setups can share a name.
- **Deletion constraint:** A setup cannot be deleted if `PayrollRun` rows reference it (error code `SETUP_HAS_RUNS`, HTTP 400).
- **Decimal/basis-point conversion:**
  - Frontend multiplies by 100 to convert decimals (UI) to minor units (API).
  - Frontend converts percentages (e.g., 15) to basis points (1500 bps).
  - Backend stores all numeric values as `bigint` or `integer` to avoid floating-point precision loss.
- **JSON options blob:** The `PayrollSetup.options` column stores a JSON object preserving legacy config (overtime rules, leave policies, gratuity slabs, etc.). It is round-tripped verbatim; the relational `components` and `taxRules` are the new canonical source.

### Outcomes

**Success:**
- HTTP 201 (create) or 200 (update/get/list/delete).
- Persisted `PayrollSetup` row plus relational `PayrollSetupComponent` and `PayrollSetupTaxRule` rows in the database.
- Frontend context refetches the list via lazy subscription; setup list toast shows "Setup created/updated".
- For delete: response `{ id, deleted: true }`.
- Downstream: payroll runs can now reference this setup for calculation and approval workflows.

**Failure modes:**
- **`SETUP_HAS_RUNS`** (HTTP 400): Attempt to delete a setup with active payroll runs.
- **`SETUP_NOT_FOUND`** (HTTP 404): Fetch or update a non-existent setup ID.
- **Zod validation errors** (HTTP 400): Missing required fields, invalid country code, invalid enum values, or out-of-range integers.
- **Unauthorized/Forbidden** (HTTP 401/403): Missing JWT, invalid role, or cross-client access.
- **RUN_ALREADY_EXISTS** (HTTP 400): Attempt to create a payroll run for a setup when one already exists for that year–month pair.

### Related Endpoints

- **`GET /payroll-setups`** — List all setups for the current client with components and tax rules included.
- **`GET /payroll-setups/:id`** — Fetch a single setup with full relational data.
- **`POST /payroll-setups`** — Create a new setup.
- **`PATCH /payroll-setups/:id`** — Update an existing setup (scalar fields and component/tax rule arrays).
- **`DELETE /payroll-setups/:id`** — Hard-delete a setup if it has no payroll runs.
- **`POST /payroll-runs`** — Create a payroll run referencing a setup (validates setup exists).
- **`POST /payroll-runs/:id/calculate`** — Calculate payroll lines using the setup's components and tax slabs (reads components and taxRules via setup include).

---

<a id="17-payroll-run"></a>

## 17. Payroll Run Lifecycle

### Overview
The Payroll Run Lifecycle manages the complete journey of a monthly payroll from creation through final completion. It enables HR admins to create a run for a specific month/year, calculate gross and net pay per employee using configurable components and tax slabs, submit the run for approval via the approvals engine, finalize and lock the run after approval, and mark it complete once paid. This flow ensures financial accuracy and audit compliance through structured state transitions and tamper protection.

### Entry Point
- **POST /payroll-runs** — Create a new payroll run (initial draft state)
- **POST /payroll-runs/{id}/calculate** — Compute all payroll lines
- **POST /payroll-runs/{id}/submit** — Submit calculated run for approval
- **POST /payroll-runs/{id}/finalize-approve** — Mark approved and lock
- **POST /payroll-runs/{id}/complete** — Mark as paid/completed

All endpoints require `@Roles('super_admin', 'admin')` except one-off adjustments and payslips which include `'hr'` and `'employee'` roles. All routes are scoped to the active client via `@ClientScope()` and `@UseGuards(ClientScopeGuard, RolesGuard)`.

### Step-by-Step Walkthrough

**Step 1: Create Run**
User clicks "Create Payroll Run" in the HR dashboard, selects setup and month/year. Frontend POSTs to `POST /payroll-runs` with `CreatePayrollRunDto` (payrollSetupId, month, year). Controller calls `payroll.createRun()` (payroll.service.ts:236), which verifies the setup exists and that no duplicate run exists for that setup/month/year. If duplicate found, raises `RUN_ALREADY_EXISTS` (400). Creates row in `PayrollRun` table with status `draft`, returning the new run.

**Step 2: Add One-Off Adjustments (Optional)**
Before calculating, admins/HR can POST to `POST /payroll-runs/{id}/one-offs` with `OneOffAdjustmentDto` (employeeId, name, amountMinor, type='earning'|'deduction'). Controller calls `payroll.addOneOff()` (payroll.service.ts:487). Checks run is not locked; creates row in `PayrollOneOffAdjustment` table. Multiple one-offs per employee are permitted. Can be deleted via `DELETE /payroll-runs/{id}/one-offs/{oneOffId}`, which calls `payroll.removeOneOff()` (payroll.service.ts:505).

**Step 3: Calculate Run**
Admin clicks "Calculate" button, which POSTs to `POST /payroll-runs/{id}/calculate`. Controller calls `payroll.calculateRun()` (payroll.service.ts:263). This is the core engine:

- Fetches all active employees and their current-effective compensation (base + allowances as BigInt minor units).
- Loads the setup's components (earnings/deductions with fixed, percentage, or formula calc types) and tax slabs (progressive income-based rates in basis points).
- Queries `PayrollOneOffAdjustment` table for the run, aggregating by employee into benefits/deductions.
- Queries active `Loan` rows for each employee's `monthlyDeduction` (EMI).
- For each employee, invokes `calculateLine()` from calculator.ts:74 with input `CalcInput` { basicMinor, allowancesMinor, loanDeductionMinor, oneOffBenefitsMinor, oneOffDeductionsMinor, components, taxSlabs }.

The calculator (calculator.ts:74–161) performs:
- Sums components in order (orderIndex ASC). Earnings increment running gross; deductions accumulate separately. Percentage calculations are applied against *current* gross at evaluation time.
- Differentiates statutory deductions (GOSI/NSF/PF/ESIC/EPF/CPF/SSO pattern match) from other deductions.
- Computes progressive tax: annualizes gross × 12, slices through tax slabs in order, applies each slab's rate in basis points (1500 = 15%), then divides tax back to monthly.
- Calculates net pay: gross − (tax + loan + statutory + other + oneOff deductions) + (reimbursement − advance).
- Returns detailed `CalcResult` with all component/deduction line items and a componentBreakdown array.

Each result row is persisted in `PayrollLine` with all fields from `CalcResult`. Run status moves to `calculated`, and run aggregates (totalGrossMinor, totalDeductionsMinor, totalNetMinor, employeeCount, runDate) are updated. Status transition validation enforces run must be in `draft` or `calculated` state; locked runs raise `RUN_LOCKED` (400).

**Step 4: Submit for Approval**
Admin POSTs to `POST /payroll-runs/{id}/submit`. Controller fetches the current user's employee record (if any), then calls `payroll.submitForApproval()` (payroll.service.ts:413). Validates run is in `calculated` state (raises `NOT_CALCULATED` if not). Calls `approvals.submitForApproval()` with module='payroll', entityId=runId, valueMinor=run.totalGrossMinor, and title formatted as "Payroll YYYY-MM". Updates run status to `pending_approval`. If requester has no employee context, raises `NO_EMPLOYEE_CONTEXT` (403).

**Step 5: Finalize and Approve**
After the approvals engine finalises (external event), admin POSTs to `POST /payroll-runs/{id}/finalize-approve`. Controller calls `payroll.finalizeApprove()` (payroll.service.ts:450). Validates run is in `pending_approval` or `calculated` state (raises `INVALID_STATE` if not). Updates run: status → `approved`, approvedByUserId, approvedAt timestamp, and crucially locks the run (locked=true, lockedByUserId, lockedAt). Locking prevents further modifications via calculate/addOneOff checks.

**Step 6: Complete Run**
Once payment processing is confirmed, admin POSTs to `POST /payroll-runs/{id}/complete`. Controller calls `payroll.completeRun()` (payroll.service.ts:471). Validates run is in `approved` state (raises `NOT_APPROVED` if not). Updates status → `completed` with completedAt timestamp.

**Step 7: Access Payslips**
Employees and HR access their payslips via `GET /payslips/mine`, which calls `payroll.listMyPayslips()` (payroll.service.ts:517). Queries `Payslip` table filtered by employeeId, joined to run details (month, year, setup name, currency), ordered descending by createdAt. Payslips are generated downstream (likely by a separate emit/generation service) after run completion.

### Validation & Business Rules

- **Status state machine**: draft → calculated → pending_approval → approved → completed. Back-stepping is blocked (e.g., `calculateRun` refuses non-draft/calculated states, `submitForApproval` requires calculated).
- **Idempotent calculation**: Calling `calculateRun` on draft or calculated run will re-compute all lines; deletes prior PayrollLine rows and recreates them. Blocks on locked runs.
- **Duplicate prevention**: `createRun` validates no existing PayrollRun for (setup, month, year) tuple; raises `RUN_ALREADY_EXISTS` (400).
- **Setup cascade safety**: `deleteSetup` refuses deletion if any PayrollRun references it (raises `SETUP_HAS_RUNS`, 400). Component and tax-rule deletes are cascade via FK.
- **Locking enforcement**: Any modification attempt on locked runs (calculate, addOneOff, removeOneOff) raises `RUN_LOCKED` (400).
- **Role gates**: Super-admin and admin can create/calculate/submit/approve/complete; HR can add/remove one-offs and list setups. Employees can only view their payslips.
- **Client isolation**: All queries scoped by `clientId`; client ID injected from JWT token via `@ActiveClientId()`.
- **Calculator inputs**: BasicMinor and allowancesMinor derived from `EmployeeCompensation` table (componentType='base' vs. others). One-off adjustments from `PayrollOneOffAdjustment`. Loan EMIs from `Loan.monthlyDeduction` (status='active'). All monetary values are BigInt minor units (halalas/fils/cents).
- **Tax computation**: Applied to annual equivalent of gross; slabs are progressive (inclusive ranges with basis points rates). Formula components evaluate to 0 until safe expression evaluator ships.
- **Component ordering**: Components and tax slabs are processed by orderIndex ASC; percentage components use current gross at evaluation time (left-to-right semantics).

### Outcomes

**Success Scenario:**
- Run transitions through status chain: draft → calculated → pending_approval → approved → completed.
- User sees toast notifications confirming each step (exact copy per frontend implementation).
- PayrollLine rows persist with gross, deductions, tax, net, and component breakdown (snapshotData.componentBreakdown as JSON array).
- Approvals service enqueues approval workflows; downstream payroll-emit or payslip-gen service creates Payslip rows upon run completion.
- Run locked post-approval prevents tampering.

**Failure Modes:**
- **RUN_ALREADY_EXISTS** (400): Duplicate month/year/setup detected on create.
- **SETUP_HAS_RUNS** (400): Attempt to delete setup that has existing runs.
- **RUN_LOCKED** (400): Attempt to calculate/add-oneOff/remove-oneOff on locked run.
- **NOT_CALCULATED** (400): Attempt to submit for approval on non-calculated run.
- **INVALID_STATE** (400): Attempt to finalize-approve on run not in pending_approval or calculated state.
- **NOT_APPROVED** (400): Attempt to complete non-approved run.
- **NO_EMPLOYEE_CONTEXT** (403): Requester has no employee record in the client; cannot infer submitter for approvals.
- **SETUP_NOT_FOUND** / **RUN_NOT_FOUND** (404): Setup or run does not exist for given client/ID.
- Client scope mismatch blocks all operations (guarded by ClientScopeGuard).

### Related Endpoints

- **GET /payroll-runs** — List runs with pagination and filters (setupId, year, status).
- **GET /payroll-runs/{id}** — Fetch full run with setup, lines (employee details included), and one-off adjustments.
- **GET /payroll-setups** — List payroll setups (components and tax rules included) for the client.
- **GET /payroll-setups/{id}** — Fetch single setup with full component and tax-rule definitions.
- **POST /payroll-setups** — Create payroll setup with components and tax slabs.
- **PATCH /payroll-setups/{id}** — Update setup metadata, components, or tax rules.
- **DELETE /payroll-setups/{id}** — Hard delete setup (refused if runs exist).
- **POST /payroll-runs/{id}/one-offs** — Add one-off adjustment for a specific employee.
- **DELETE /payroll-runs/{id}/one-offs/{oneOffId}** — Remove one-off adjustment.
- **GET /payslips/mine** — Employee view of their own payslips.

---

<a id="18-approvals-engine"></a>

## 18. Approval Workflow Engine

### Overview
The Approval Workflow Engine is the central request-routing system that governs multi-level approvals for leave, expenses, advances, loans, assets, and payroll submissions. When an employee submits a request, the engine resolves the matching ApprovalPolicy based on module type and request value, creates a RequestApproval record, assigns level-1 approvers from the designated ApprovalGroup, and orchestrates progression through sequential approval levels. Approvers act on their assignments, and the engine tracks status transitions, delegates approvals, enforces per-level quorum gates (any_one / all_must / majority), and finalizes requests once all levels pass or rejects them immediately.

### Entry Point
Domain modules call `ApprovalsService.submitForApproval()` when a request is submitted (e.g., leave request saved with `status: pending`). The frontend workflow is not a single entry point but distributed: employee submits leave/expense/advance → module controller calls submitForApproval internally → Approvals engine fires notifications. Approval actors interact via:
- `POST /approval-requests/:id/decision` — approver submits approve/reject decision
- `GET /approval-requests` — list pending or submitted requests (default scope: "pending" for assigned, "mine" for submitted by caller, "all" for admin)
- `GET /approval-requests/:id` — fetch full request with assignments and history

### Step-by-Step Walkthrough

1. **Domain module submits request.** Employee creates leave request / expense / advance / loan / asset / payroll entry. On submission, domain module calls `submitForApproval({clientId, module, entityId, requesterEmployeeId, valueMinor, category?, title?})` from ApprovalsService (approvals.service.ts:319).

2. **Policy resolution.** Engine calls `resolvePolicy()` (approvals.service.ts:250) which queries `approval_policies` table, matching on `module`, `valueMinor` (min/max range check), and optional `category`. Returns most specific policy: prefer category-match if present, else use uncategorized baseline (sortOrder + minValueMinor desc).

3. **Group and approver lookup.** If policy has no levels, uses fallback `policy.groupId`. If policy has levels, uses `firstLevel.groupId` for level 1. Engine calls `getActiveApprovers()` (approvals.service.ts:282) which reads `approval_group_members` and applies `approval_delegations` (date-range match) to route assignments to delegates.

4. **Create RequestApproval and level-1 assignments.** Transaction in `submitForApproval()` (approvals.service.ts:364):
   - Upsert `request_approvals` record with `status: pending`, `currentLevel: 1`, `currentGroupId: groupId`, and snapshotted `valueMinor`/`valueUnit`.
   - Bulk-insert `request_assignments` with `levelOrder: 1`, `status: pending` for each active approver.
   - Idempotent on `(module, entityId)` — re-submitting existing pending request is a no-op.

5. **Fire notifications.** Best-effort in `notifyAssignees()` (approvals.service.ts:652):
   - Create in-app `notifications` records for each assigned approver.
   - Send `sendApprovalNotification()` emails (via MailService) with review URL.

6. **Approver acts: decision endpoint.** Approver calls `POST /approval-requests/:id/decision` (approvals.controller.ts:173) with `{decision: 'approve'|'reject', comment?}`. Controller extracts actor info (userId, employeeId from CurrentUser decorator) and calls `ApprovalsService.decide()` (approvals.service.ts:407).

7. **Validation and permission check.** `decide()` reads `request_approvals` with current group and assignments, validates: request status is `pending`, actor has an `assignment` at `currentLevel` with `status: pending`, and actor has an `employeeId` (employee record exists).

8. **Record decision.** In transaction (approvals.service.ts:451):
   - Mark actor's `request_assignment` with `status: acted`, `actedAt: now()`.
   - Insert `request_approval_history` record with `action: approve|reject`, `comment`, `levelOrder`, `actorUserId`, `actorEmployeeId`.

9. **Rejection path.** If `decision === 'reject'`, immediately update `request_approvals` to `status: rejected`, `finalizedAt: now()`, and return. Module receives reject callback (see "Outcomes").

10. **Approval path — level satisfaction check.** Query all `request_assignments` at current level; count those with `status: acted`. Check approval type (`approvalType` from `approval_groups`):
   - `any_one`: level satisfied if acted >= 1.
   - `all_must`: level satisfied if acted >= total.
   - `majority`: level satisfied if acted * 2 > total (strict majority).

11. **Advance to next level or finalize.** If level satisfied (approvals.service.ts:494):
   - Mark unacted assignments at this level as `status: skipped`.
   - Query `policy.levels` for `levelOrder === currentLevel + 1`.
   - If next level exists, read active approvers for that group, bulk-insert new assignments, insert history record with `action: system_advance`, update request `currentLevel` and `currentGroupId`.
   - If no next level, update request to `status: approved`, `finalizedAt: now()`, finalize callback.

### Validation & Business Rules

- **Role gates:** `POST /approval-groups` / `PATCH /approval-groups/:id` / `DELETE /approval-groups/:id` require `@Roles('super_admin', 'admin')`. `POST /approval-policies`, `PATCH /approval-policies/:id` also require admin. `POST /approval-delegations` allow `@Roles('super_admin', 'admin', 'hr')`. Request decision endpoint allows any authenticated role but enforces assignment ownership.

- **Policy schema validation** (approval.schemas.ts): `createPolicySchema` validates `module` enum (leave|expense|advance|loan|asset|payroll), `minValueMinor`/`maxValueMinor` as bigint, `category` max 80 chars, and `levels` array with `levelOrder` (1–20), `groupId` UUID, `mode` enum (sequential|parallel), `slaHours` (1–720). `decideRequestSchema` requires `decision` enum (approve|reject) and optional `comment` (max 1000 chars).

- **Uniqueness & constraints:** `request_approvals` enforces `unique(module, entityId)` to prevent duplicate submissions. `approval_delegations` unique per `(fromEmployeeId, startDate, endDate)` implicitly via service logic. `approval_group_members` composite PK on `(groupId, employeeId)`.

- **Status transitions:** `request_approvals.status` progresses `pending` → (approved|rejected) or stays pending across levels. `request_assignments.status` progresses `pending` → (acted|skipped). History records immutable via insert-only.

- **Delegation routing:** `getActiveApprovers()` filters active delegations by `isActive: true`, `startDate <= onDate`, `endDate >= onDate`, and rewrites approver from `fromEmployeeId` to `toEmployeeId`. Records `viaDelegation: true` on assignment for audit.

- **Error codes:** `NO_MATCHING_POLICY` (HTTP 400) when no policy matches request value. `POLICY_MISCONFIGURED` (HTTP 400) when policy has no levels and no fallback group. `EMPTY_APPROVAL_GROUP` (HTTP 400) when matched group has no active members. `REQUEST_NOT_FOUND` (HTTP 404). `REQUEST_NOT_PENDING` (HTTP 400) if request already finalized. `NOT_AN_ASSIGNED_APPROVER` (HTTP 403) if actor lacks assignment. `NO_EMPLOYEE_CONTEXT` (HTTP 403) if actor has no employee record. `POLICY_NOT_FOUND` (HTTP 404), `GROUP_NOT_FOUND` (HTTP 404), `DELEGATION_NOT_FOUND` (HTTP 404) for miscellaneous lookups.

- **Audit trail:** Every decision recorded in `request_approval_history` with action enum (approve|reject|comment|delegate|cancel|system_advance), levelOrder, group, actor, and timestamp. Comments optional per decision.

### Outcomes

**Success:**
- Request transitions to `approved` with `finalizedAt` set. Domain module receives finalize callback (internal hook — not exposed as API; consume via domain-specific service watching `request_approvals.status = 'approved'`). Approvers see requests removed from "pending" queue.
- User toast: "Request approved" or "Request rejected with comment: ...". Redirect to request detail or list view.
- Notifications cleared or marked read for approved/rejected state.

**Failure modes:**
- `NO_MATCHING_POLICY` (HTTP 400): no approval policy matches the request module + value combination. User sees error banner "Cannot submit: no approval policy configured for this request type." Domain module must catch and surface to UI.
- `EMPTY_APPROVAL_GROUP` (HTTP 400): matched group has no active members. Admin must populate the group before requests can be submitted. Error message: "Approval group is empty; add members before submitting requests."
- `REQUEST_NOT_PENDING` (HTTP 400): approver attempts to act on already-finalized request (likely race condition or stale UI). UI should refetch request state.
- `NOT_AN_ASSIGNED_APPROVER` (HTTP 403): approver attempting to act on request not assigned to them. UI enforces visibility via query scope ("pending" returns only assigned requests).
- `REQUEST_NOT_FOUND` (HTTP 404): request ID invalid or cross-tenant leak prevented by clientId check.
- Policy update deletes old levels and recreates via transaction — existing in-flight requests unaffected because they reference snapshotted `policyId`.

### Related Endpoints

- `GET /approval-groups` — list all groups; `POST /approval-groups` — create group with members and approval type.
- `PATCH /approval-groups/:id` — update group (name, members, approval type); `DELETE /approval-groups/:id` — soft-delete (isActive: false).
- `GET /approval-policies` — list policies (filterable by module); `POST /approval-policies` — create policy with levels.
- `PATCH /approval-policies/:id` — update policy; no dedicated delete (soft-delete via isActive: false recommended).
- `GET /approval-delegations` — list all delegations; `POST /approval-delegations` — create delegation (fromEmployeeId → toEmployeeId, date range).
- `DELETE /approval-delegations/:id` — revoke delegation (isActive: false).
- Cron endpoint (internal): `expireDelegations()` bulk-marks past-endDate delegations as inactive (Phase 8 integration).

---

<a id="19-performance"></a>

## 19. Performance Reviews

### Overview

The Performance Reviews flow manages the complete lifecycle of employee performance evaluations within a performance cycle. HR and admin users create cycles, define questionnaires, and assign assessments to employees from three perspectives (self, peer, manager). Employees and designated reviewers respond to questionnaires, submit their assessments (locking responses), and HR conducts final calibration to produce consolidated performance ratings.

### Entry Point

- **`POST /performance/cycles`** – HR/Admin initiates a new performance cycle with name, start date, and end date.
- **`PATCH /performance/cycles/:id/status`** – HR/Admin transitions cycle through statuses: `draft` → `open` → `in_calibration` → `closed`.
- **`POST /performance/assessments`** – HR/Admin creates individual assessment tasks for each employee within a cycle, specifying assessment type (`self`, `peer`, or `manager`).
- **`POST /performance/assessments/:id/submit`** – Employee or designated reviewer submits their completed assessment, locking responses.

### Step-by-Step Walkthrough

1. **HR creates a performance cycle** (api/src/modules/performance/performance.controller.ts:50–56). HR/Admin POST to `POST /performance/cycles` with `createCycleSchema` validation (api/src/modules/performance/dto/performance.schemas.ts:5–9). The controller calls `PerformanceService.createCycle()` (api/src/modules/performance/performance.service.ts:24–27), which inserts a record into the `performanceCycle` table with `status='draft'` by default.

2. **HR defines questionnaires for the cycle** (performance.controller.ts:77–83). HR POST to `POST /performance/questionnaires` with `upsertQuestionnaireSchema` validation (performance.schemas.ts:17–22). The service calls `upsertQuestionnaire()` (performance.service.ts:40–49), storing questionnaire questions as JSON, optionally filtered by `audience` (e.g., "self", "peer", "manager").

3. **HR updates cycle status to open** (performance.controller.ts:58–65). HR PATCH to `PATCH /performance/cycles/:id/status` with `updateCycleStatusSchema`, specifying status `'open'`. Service calls `updateCycleStatus()` (performance.service.ts:29–33), updating the cycle record.

4. **HR creates assessments for each employee** (performance.controller.ts:96–102). HR POST to `POST /performance/assessments` with `createAssessmentSchema` validation (performance.schemas.ts:25–30), specifying `cycleId`, `employeeId`, `reviewerId`, and `type` ('self', 'peer', or 'manager'). The service calls `createAssessment()` (performance.service.ts:60–69), inserting a record into `performanceAssessment` with `status='draft'` (default) and empty responses.

5. **Employee/reviewer accesses and completes their assessment**. Frontend fetches assessments via `GET /performance/assessments` (performance.controller.ts:87–94), filtered by `cycleId` and/or `reviewerId`. Employee responds to questionnaire questions in the UI.

6. **Employee/reviewer submits their assessment** (performance.controller.ts:104–111). Frontend POST to `POST /performance/assessments/:id/submit` with `submitAssessmentSchema` validation (performance.schemas.ts:33–36), including questionnaire `responses` (dict) and optional numeric `rating` (0–5). The service calls `submitAssessment()` (performance.service.ts:71–82), which validates the assessment exists (throws `NotFoundException` with code `'ASSESSMENT_NOT_FOUND'` if not), then updates the assessment with responses, rating, and `status='submitted'`, setting `submittedAt` timestamp.

7. **HR initiates calibration phase**. HR updates cycle status to `'in_calibration'` via `PATCH /performance/cycles/:id/status`.

8. **HR/Admin reviews and calibrates final ratings** (performance.controller.ts:123–130). HR/Admin POST to `POST /performance/calibrations` with `upsertCalibrationSchema` validation (performance.schemas.ts:39–44), specifying `cycleId`, `employeeId`, and `calibratedRating` (0–5, stored as string). The service calls `upsertCalibration()` (performance.service.ts:89–105), which upserts into the `performanceCalibration` table with unique constraint on `(cycleId, employeeId)`, recording `calibratedRating`, optional `notes`, and `calibratedByUserId`.

9. **HR closes the cycle**. HR updates cycle status to `'closed'` via `PATCH /performance/cycles/:id/status`.

### Validation & Business Rules

- **Cycle creation**: Name required (1–120 chars), startDate and endDate must be ISO date strings matching `/^\d{4}-\d{2}-\d{2}/`.
- **Cycle status transitions**: Schema enforces enum `['draft', 'open', 'in_calibration', 'closed']`; no validation logic prevents invalid transitions in code.
- **Questionnaire creation**: Name required (1–120 chars), questions array optional (defaults to `[]`), audience optional (max 40 chars, stored as JSON/text).
- **Assessment creation**: `cycleId`, `employeeId`, `reviewerId` must be valid UUIDs; `type` must be `'self'`, `'peer'`, or `'manager'`. Assessment starts in `draft` status with no responses.
- **Assessment submission**: Responses validated as record of unknown values. Rating optional, coerced to number, range 0–5. Submission atomically updates responses, rating, and sets `status='submitted'` with `submittedAt=now()`. If assessment not found, returns HTTP 404 with error code `ASSESSMENT_NOT_FOUND`.
- **Calibration upsert**: Compound unique constraint on `(cycleId, employeeId)`. `calibratedRating` coerced to number (0–5) and stored as string. `notes` optional (max 1000 chars). `calibratedByUserId` recorded for audit.
- **Role-based access**: Assessment submit available to `super_admin`, `admin`, `hr`, and `employee` roles. Calibration restricted to `super_admin` and `admin`. Cycle and questionnaire management restricted to `super_admin`, `admin`, and `hr`.

### Outcomes

**Success:**
- Assessment submission: Returns updated `performanceAssessment` record with `status='submitted'`, `submittedAt` timestamp, and locked responses. No email or notification side effects documented in code.
- Calibration upsert: Returns inserted or updated `performanceCalibration` record. Subsequent queries via `GET /performance/calibrations` return all calibrations for the cycle.
- Cycle status update: Returns count of matched/modified records via `updateMany()` Prisma operation.

**Failure modes:**
- Assessment submit with invalid UUID for `:id` → HTTP 400 (ParseUUIDPipe validation failure).
- Assessment submit for non-existent assessment → HTTP 404, error code `ASSESSMENT_NOT_FOUND`.
- Malformed request body (invalid Zod schema) → HTTP 400 with Zod validation errors.
- Insufficient role permissions → HTTP 403 (RolesGuard).
- Invalid client scope → HTTP 403 (ClientScopeGuard).

### Related Endpoints

- `GET /performance/cycles` – List all cycles for client, sorted newest first.
- `POST /performance/cycles` – Create new cycle (HR/Admin only).
- `PATCH /performance/cycles/:id/status` – Update cycle status (HR/Admin only).
- `GET /performance/questionnaires?cycleId=<uuid>` – List questionnaires for a cycle.
- `POST /performance/questionnaires` – Create or update questionnaire (HR/Admin only).
- `GET /performance/assessments?cycleId=<uuid>&reviewerId=<uuid>` – List assessments, optionally filtered by cycle and/or reviewer.
- `POST /performance/assessments` – Create assessment (HR/Admin only).
- `POST /performance/assessments/:id/submit` – Submit completed assessment (any authenticated user with sufficient role).
- `GET /performance/calibrations?cycleId=<uuid>` – List calibrations for a cycle (HR/Admin only).
- `POST /performance/calibrations` – Upsert calibration record (super_admin/admin only).

---

<a id="20-separations-eosb"></a>

## 20. Separations & End-of-Service Benefits

### Overview

The Separations & End-of-Service Benefits (EOSB) flow manages employee separations from hiring termination through final settlement benefits calculation. HR/Admin users draft separations (including EOSB gratuity under Saudi and UAE labor law), approve them, and process them to mark employees as separated and optionally link them to a payroll run.

### Entry Point

The flow is initiated by an HR user accessing the separations wizard in the frontend and submitting a POST request to `POST /separations` with employee ID, separation type, and settlement details. An upstream preview endpoint `POST /separations/eosb-preview` (api/src/modules/separations/separations.controller.ts:52-57) enables pure calculator output without persisting data.

### Step-by-Step Walkthrough

1. **Preview EOSB (Optional):** HR user clicks "Calculate Preview" in the separation form. Frontend calls `POST /separations/eosb-preview` with `EosbCalcDto` (lastBasic, joiningDate, lastWorkingDate, reason, country). The `previewEosb` method (api/src/modules/separations/separations.service.ts:56-74) dispatches to `calculateEosb()` (api/src/modules/separations/eosb/index.ts:32-43), which selects KSA or UAE calculator. No database write; returns breakdown with components (e.g., first 5-year segment, post-5-year segment, factor adjustments) and descriptive notes.

2. **Create Separation (Draft):** Frontend collects `CreateSeparationDto` (employeeId, lastWorkingDate, type, reason, notice days, unpaid salary, leave encashment, notice pay, loan deductions) and POSTs to `POST /separations` with `@Roles('super_admin', 'admin', 'hr')` guard. The `create` method (api/src/modules/separations/separations.service.ts:76-141) fetches the employee and validates joiningDate exists (error code `NO_JOINING_DATE` if missing). It extracts the active base compensation row to compute `lastBasic`. If country is 'SA' or 'AE', it calls `calculateEosb()` with the employee's work location; otherwise EOSB is zero. The method computes `totalSettlement` by summing EOSB, unpaid salary, leave encashment, notice pay, minus loan deductions. All values are stored in minor units (cents/fils). The record is created with `status: pending`.

3. **Retrieve Separation:** HR views the created separation via `GET /separations/:id` (api/src/modules/separations/separations.controller.ts:46-50). The `findById` method (api/src/modules/separations/separations.service.ts:47-54) fetches the full record including nested employee, or throws `SEPARATION_NOT_FOUND` (404).

4. **Approve Separation:** After review, HR approves via `POST /separations/:id/approve` with the current user ID. The `approve` method (api/src/modules/separations/separations.service.ts:143-155) validates the record is `SeparationStatus.pending`, updates status to `approved`, and records the approving user ID in `approvedByUserId`. Error code `NOT_PENDING` (400) if already approved/processed.

5. **Process Separation:** After approval, HR calls `POST /separations/:id/process` with optional `payrollRunId` in the body. The `process` method (api/src/modules/separations/separations.service.ts:157-181) validates status is `approved`, then in a transaction: (a) updates the separation record to `status: processed`, sets `processedDate: now()`, and optionally links `payrollRunId`; (b) updates the related employee record to `status: separated` and sets `separationDate` to the separation's `lastWorkingDate`. Returns the full updated separation. Error code `NOT_APPROVED` (400) if not approved.

### Validation & Business Rules

- **Role guards:** All endpoints require `'super_admin', 'admin',` or `'hr'` roles via `@Roles()` decorator and `RolesGuard` (api/src/modules/separations/separations.controller.ts:31, 38, 47, 53, 60, 69, 79).
- **Zod validation:** `createSeparationSchema` enforces employeeId as UUID, lastWorkingDate as ISO date, type as one of `['resignation', 'termination', 'end_of_contract', 'retirement']`, notice days 0–365, and optional big-integer settlement fields (api/src/modules/separations/dto/separation.schemas.ts:12-24).
- **EOSB country logic:** Only Saudi Arabia (SA) and UAE (AE) compute gratuity. Calculator uses Saudi Labor Law Articles 84–87 (resignation under 2 years = 0%, 2–5 years = 1/3, 5–10 years = 2/3, ≥10 years = 100%) and UAE Federal Decree Law 33/2021 (first 5 years at 21 days basic, after 5 years at 30 days, capped at 24 months of basic).
- **Employee joining date required:** Creation fails with `NO_JOINING_DATE` if employee has no joining date (api/src/modules/separations/separations.service.ts:84-88).
- **Unique constraint:** Database enforces `@@unique([employeeId])` — only one active separation per employee (api/prisma/schema.prisma).
- **Status transitions:** `pending` → `approved` → `processed`. No reversal; attempting to approve non-pending or process non-approved records raises `NOT_PENDING` or `NOT_APPROVED` (400).
- **Client-scoped queries:** All reads filtered by `clientId`; client isolation enforced by `@ClientScope()` and `ClientScopeGuard`.

### Outcomes

**Success:**
- Separation record persists in `separations` table with all settlement components and calculated EOSB breakdown stored as JSON in `eosbBreakdown`.
- Employee status flipped to `separated` (EmployeeStatus enum) with `separationDate` recorded upon process.
- If `payrollRunId` provided during process, the separation links to the payroll run for final settlement in payroll.
- Frontend receives the full separation object and redirects to a confirmation view.

**Failure modes:**
- `EMPLOYEE_NOT_FOUND` (404): Employee ID does not exist or does not belong to the client.
- `SEPARATION_NOT_FOUND` (404): Separation ID does not exist or belongs to a different client.
- `NO_JOINING_DATE` (400): Employee record has no joining date; EOSB calculation is impossible.
- `NOT_PENDING` (400): Attempt to approve a separation that is not in pending status.
- `NOT_APPROVED` (400): Attempt to process a separation that is not in approved status.
- Zod validation errors (400): Invalid UUID, non-ISO date, invalid type enum, or out-of-range values for notice days.

### Related Endpoints

- `GET /separations` — List separations for the client with optional status filter (api/src/modules/separations/separations.controller.ts:37-44).
- `GET /separations/:id` — Fetch a single separation with employee details (api/src/modules/separations/separations.controller.ts:46-50).
- `POST /separations/eosb-preview` — Pure EOSB calculator; no persistence (api/src/modules/separations/separations.controller.ts:52-57).
- `POST /separations` — Create separation record in pending status (api/src/modules/separations/separations.controller.ts:59-66).
- `POST /separations/:id/approve` — Move separation from pending to approved (api/src/modules/separations/separations.controller.ts:68-76).
- `POST /separations/:id/process` — Mark separation processed, flip employee status, optionally link payroll run (api/src/modules/separations/separations.controller.ts:78-86).

---

<a id="21-notifications"></a>

## 21. In-App Notifications

### Overview
The In-App Notifications flow allows users to receive, manage, and dismiss real-time notifications within the payroll system. Notifications are created programmatically by other modules (approvals, leave decisions, payroll events) and surfaced to the frontend via a paginated list endpoint. Users can view, filter, mark read/unread, and dismiss notifications from the bell menu.

### Entry Point
The notification feed is accessed via `GET /api/notifications`, which requires bearer token authentication. The user interacts with the bell icon in the UI, which triggers calls to fetch the notification list, unread badge count, and performs read/dismiss operations. Notifications are created internally by other modules (e.g., approvals, leave) calling `NotificationsService.create()` — there is no public endpoint for user-initiated notification creation.

### Step-by-Step Walkthrough
1. **Frontend bell click** → user opens notification panel, FE calls `GET /api/notifications?page=1&pageSize=20&state=unread` (notifications.controller.ts:37–45).
2. **List endpoint validation** → `listNotificationsQuerySchema` (notification.schemas.ts:4–10) validates query params: optional `state` ('unread'|'read'), `category`, `severity`, and pagination.
3. **Service query** → `listForUser()` (notifications.service.ts:17–55) builds a Prisma `where` clause filtering by `userId`, `clientId`, and optional `state`/`category`/`severity`; performs fulltext search on `title` and `body` if `search` param present.
4. **DB transaction** → `findMany()` with `orderBy: { createdAt: 'desc' }` and pagination, plus a `count()` in a single transaction, returns items and total count.
5. **Badge update** → FE calls `GET /api/notifications/unread-count` (notifications.controller.ts:47–55), which hits `unreadCount()` (notifications.service.ts:57–61) to fetch count of records where `readAt: null`.
6. **Mark read** → FE submits `POST /api/notifications/mark-read` with `{ ids: ["uuid1", "uuid2"] }` (notifications.controller.ts:57–67). Schema validates array of 1–500 UUIDs (notification.schemas.ts:12–15).
7. **Service mark-read** → `markRead()` (notifications.service.ts:65–71) calls `updateMany()` with `where: { id: { in: dto.ids }, userId, clientId, readAt: null }` and sets `readAt: new Date()`. Returns `{ updated: count }`.
8. **Mark all read** → FE submits `POST /api/notifications/mark-all-read` (notifications.controller.ts:69–74). `markAllRead()` (notifications.service.ts:73–79) updates all unread records for the user.
9. **Dismiss** → FE calls `DELETE /api/notifications/{id}` with UUID param (notifications.controller.ts:76–84). `delete()` (notifications.service.ts:81–86) performs `deleteMany()` scoped to user and clientId, returns `{ deleted: boolean }`.
10. **Producer side** → Other modules import `NotificationsService.create()` (notifications.service.ts:95–97), passing `CreateNotificationDto` to insert a notification row. `notifyClientAdmins()` (notifications.service.ts:103–115) broadcasts to all admins in a client.

### Validation & Business Rules
- **Authentication:** All endpoints require `@UseGuards(ClientScopeGuard)` and bearer token via `@CurrentUser()` and `@ActiveClientId()`.
- **Schema validation:** `listNotificationsQuerySchema` extends `paginationQuerySchema` (default page=1, pageSize=20); query validates `state` enum, optional `category`/`severity`; `markReadSchema` requires 1–500 UUID array.
- **CreateNotificationDto schema** (notification.schemas.ts:22–34): `clientId` and `userId` are required UUIDs; `title` is 1–200 chars; `body`, `link`, `entityType`, `entityId` are optional; `severity` defaults to 'info' ('info'|'warning'|'urgent'); `actorUserId` optional for audit trail.
- **Query scoping:** All reads/writes scoped by `userId` and `clientId`, preventing cross-user/cross-tenant access.
- **Readability:** Filtering by `state` ('unread' checks `readAt: null`, 'read' checks `readAt: { not: null }`); search is case-insensitive substring on `title` or `body`.
- **Idempotency:** `markRead()` filters `readAt: null` before update—marking already-read notifications is safe. `markAllRead()` updates only unread records.
- **Soft delete:** `delete()` uses hard delete (not a soft-delete flag), immediately removing the notification row.

### Outcomes
**Success:**
- **List:** Returns paginated array of notification objects with metadata (total, totalPages, current page).
- **Unread-count:** Returns `{ count: number }` for badge display.
- **Mark-read/mark-all-read:** Returns `{ updated: number }` indicating how many were affected. Frontend updates UI state and re-fetches badge.
- **Dismiss:** Returns `{ deleted: boolean }`; UI removes notification from list.

**Failure modes:**
- **Invalid UUID param** (DELETE): `ParseUUIDPipe` returns HTTP 400 with validation error.
- **Unauthorized access:** If user/clientId mismatch, `markRead()` or `delete()` silently updates/deletes 0 records (no error thrown).
- **Invalid query params:** `ZodValidationPipe` returns HTTP 400 with schema errors (e.g., `state` not in enum, `pageSize` exceeds limit).
- **Producer-side:** If a module calls `create()` with invalid `CreateNotificationDto`, Zod raises validation error in that module before the call reaches Prisma.

### Related Endpoints
- `GET /api/notifications` — list notifications with filtering/search
- `GET /api/notifications/unread-count` — fetch unread badge count
- `POST /api/notifications/mark-read` — mark specific notifications read
- `POST /api/notifications/mark-all-read` — mark all unread notifications read
- `DELETE /api/notifications/{id}` — dismiss (hard-delete) a notification

---

<a id="22-reminders"></a>

## 22. Reminders (Document Expiry, Birthdays, etc.)

### Overview
The reminders module implements a per-client rule engine that monitors upcoming expiry dates, birthdays, and probation ends, then dispatches notifications and emails to relevant stakeholders. Admins and HR managers configure rules per reminder category (document expiry, asset warranty, probation end, advance settlement, birthday); a daily cron at 06:00 UTC automatically scans for entities matching rule criteria and creates notifications, or manual `/reminders/run` triggers the dispatcher immediately for testing.

### Entry Point
**Cron Schedule:**
- `@Cron(CronExpression.EVERY_DAY_AT_6AM)` — calls `runScheduled()` daily (reminders.service.ts:66), which processes all active clients and also expires delegations.

**Manual Trigger (Debug/Testing):**
- `POST /api/reminders/run` — requires `super_admin` or `admin` role. Returns `{ dispatched: n }` where n is the count of notifications created for that client (reminders.controller.ts:33–39).

### Step-by-Step Walkthrough
1. **Admin configures rule:** Admin calls `POST /api/reminders/rules` with a `ReminderRule` DTO (reminders.controller.ts:24–31). The service calls `upsert()` (reminders.service.ts:43–62), upserting on the unique key `(clientId, category, name)`. Fields include `isEnabled`, `leadDaysBefore` (array of integers), `repeatFrequency`, `recipients`, and `priority`.

2. **Cron or manual trigger fires:** Either the daily 06:00 cron invokes `runScheduled()` (reminders.service.ts:66) or an admin manually hits `POST /api/reminders/run` (reminders.controller.ts:33). Both paths call `processClient(clientId)` (reminders.service.ts:90).

3. **Fetch enabled rules:** `processClient()` queries all enabled rules for the client (reminders.service.ts:91–93) and iterates each rule by category.

4. **Category-specific processing:** Depending on `rule.category`, one of five processors runs:
   - `processProbationEnd()` (reminders.service.ts:126–161): finds employees with `status: 'active'` whose `probationEndDate` matches lead days; notifies the employee and manager.
   - `processDocumentExpiry()` (reminders.service.ts:163–194): finds `employeeDocument` records expiring within lead days; notifies the employee.
   - `processAssetWarranty()` (reminders.service.ts:196–231): finds `asset` records with `warrantyExpiry` within lead days; notifies all client admins.
   - `processAdvanceSettlement()` (reminders.service.ts:233–265): finds `advance` records with `status: 'approved'` and `settlementDueDate` within lead days; notifies the employee.
   - `processBirthdays()` (reminders.service.ts:267–304): matches employees born today (month and day only); broadcasts to all client admins.

5. **Idempotency check:** For each eligible entity–recipient pair, `alreadyDispatched()` (reminders.service.ts:308–318) checks `reminderDispatch` table using a composite key: `${ruleId}:${entityType}:${entityId}:${recipientUserId}:${leadDays}`. If found, the notification is skipped.

6. **Dispatch notification:** If idempotent check passes, `dispatch()` (reminders.service.ts:320–353) calls `notifications.create()` to enqueue an in-app notification, then inserts a `reminderDispatch` row with the composite key for future idempotency checks.

7. **Update rule state:** After all rules process, `processClient()` updates all rules' `lastRunAt` timestamp (reminders.service.ts:117–120).

### Validation & Business Rules
- **Role gates:** `GET /reminders/rules` requires `super_admin`, `admin`, or `hr`; `POST /reminders/rules` and `POST /reminders/run` require `super_admin` or `admin` only.
- **Unique constraint:** Rules upsert on `(clientId, category, name)` to prevent duplicates per category–name combination (reminders.service.ts:45–50).
- **Lead days:** The `leadDaysBefore` array allows multiple trigger windows (e.g., `[7, 14, 30]` for 7, 14, and 30 days before expiry). Each lead value generates a separate notification per eligible entity.
- **Idempotency key:** Composited from `ruleId:entityType:entityId:recipientUserId:leadDays` to guarantee exactly one notification per unique combination per rule run (reminders.service.ts:315).
- **Status filters:** Probation-end and birthday rules only match `status: 'active'` employees; advance-settlement only matches `status: 'approved'` advances (reminders.service.ts:134, 241, 272).
- **Date matching:** All date comparisons normalize to day boundaries using `startOfDay()` (reminders.service.ts:356–359) and check `{ gte: target, lt: addDays(target, 1) }` for same-day precision.
- **Recipient routing:** Probation-end notifies the employee and their manager; document-expiry and advance-settlement notify the employee; asset-warranty broadcasts to all admins; birthdays broadcast to all admins.

### Outcomes
**Success:**
- Notification inserted into `notifications` table with category, title, link, and entity context.
- `reminderDispatch` row created with composite `dispatchKey` key and reference to the notification.
- In-app notification visible to recipient; email delivery handled by `NotificationsService` (exact method not shown here).
- `lastRunAt` timestamp updated on all rules for that client.
- Controller returns `{ dispatched: n }` showing count of notifications created.

**Failure Modes:**
- **Rule not found:** `GET /reminders/rules` returns empty array if no rules exist for the client.
- **No matching entities:** Processor returns count of 0 if no employees, documents, assets, or advances fall within the lead-day windows.
- **Missing recipient:** Document-expiry, probation-end, and advance-settlement skip notifications if `userId` is null (reminders.service.ts:177, 141, 247).
- **Cron error:** If `runScheduled()` throws, error is logged and processing halts for that iteration; next day's cron retries (reminders.service.ts:68–75).

### Related Endpoints
- `GET /api/reminders/rules` — list all rules for the client.
- `POST /api/reminders/rules` — create or update a single rule.
- `POST /api/reminders/run` — manually trigger dispatcher for this client (returns count of dispatched notifications).

---

<a id="23-mail-delivery"></a>

## 23. Mail Delivery (Resend)

### Overview
The Mail Delivery (Resend) flow provides a centralized, single-channel transactional mail system that powers user onboarding, password resets, email verification, and approval workflows. The `MailService` integrates with Resend's SMTP API but safely falls back to console-only logging when `RESEND_API_KEY` is not configured, ensuring development and CI environments work without external dependencies. All four mail templates—invitation, password-reset, email-verification, and approval-notification—flow through this same service with zero error propagation; failures are logged but never thrown, so mail problems never break user-facing endpoints.

### Entry Point
Mail delivery is **not** a single entry point but rather a fire-and-forget side effect triggered by multiple user actions across the API:

- **Invitation:** `POST /invitations` (create new invitation) or `POST /invitations/:id/resend` (resend existing)
- **Password Reset:** `POST /auth/forgot-password` (request reset email)
- **Email Verification:** `POST /auth/register` (sent automatically after account creation) or explicit `POST /auth/verify-email` (complete verification with token)
- **Approval Notifications:** Fire when a leave/expense/advance/payroll request transitions to `awaiting_approval` status (internal trigger via `decision` endpoints)

Each originates from a NestJS controller, flows through a service layer, and calls one of four `MailService` template methods (`sendInvitation`, `sendPasswordReset`, `sendEmailVerification`, `sendApprovalNotification`).

### Step-by-Step Walkthrough

1. **Frontend initiates action** (e.g., admin clicks "Invite employee" or user clicks "Forgot password?")
2. **HTTP request hits NestJS controller** (`auth.controller.ts:78` for forgot-password, `invitations.controller.ts:53` for create invitation)
3. **Controller routes to service method** (e.g., `AuthService.forgotPassword()` at `auth.service.ts:173`)
4. **Service generates token & token hash**:
   - Creates plaintext token via `randomBytes(32).toString('hex')`
   - Hashes token with SHA-256 and writes hash to DB (`passwordResetToken`, `invitation`, `emailVerificationToken` tables)
   - Sets expiration (`PASSWORD_RESET_TOKEN_TTL_MIN`, `EMAIL_VERIFICATION_TOKEN_TTL_HOURS`, or 24-hour invitation expiry)
5. **Service calls MailService template method** (e.g., `mail.service.ts:113` for password reset)
6. **MailService composes URL** by concatenating `FRONTEND_URL` + template route + token (e.g., `/reset-password?token=<plaintext-token>`)
7. **MailService renders HTML template** (e.g., `renderPasswordResetEmail()` at `mail.service.ts:177`) with inline CSS, preheader, and CTA button
8. **MailService.send()** (lines 58–91):
   - If `RESEND_API_KEY` empty: logs to console, returns `{ ok: false, skipped: true }`
   - If initialized: calls `this.resend.emails.send()` with from/to/subject/html
   - Catches any Resend API errors, logs them, returns `{ ok: false, error: message }`
   - On success: returns `{ ok: true, id: data?.id }`
9. **Result bubbles back to caller** (service ignores result; endpoint returns success to frontend regardless)

### Validation & Business Rules

- **Email uniqueness:** Invitations reject if user already holds a role in the client (`invitations.service.ts:39–47`); password reset leaks no information (returns success even if email not found, per `auth.service.ts:176`)
- **Token integrity:** All tokens are SHA-256 hashes stored in DB; plaintext token sent only once in email
- **Token expiration:** 
  - Password reset: `PASSWORD_RESET_TOKEN_TTL_MIN` (config, typically 30 min)
  - Email verification: `EMAIL_VERIFICATION_TOKEN_TTL_HOURS` (config, typically 24 h)
  - Invitation: 24 hours hardcoded in template (`mail.service.ts:172`)
- **One-time use:** Password reset tokens marked `usedAt` after redemption (`auth.service.ts:218`); invitation status changed to `accepted` on accept (`invitations.service.ts:171`)
- **Role guards:** Invitation create/resend restricted to `@Roles('super_admin', 'admin', 'hr')` with client scope
- **Approval notification deduplication:** Leave/expense/advance services deduplicate approver emails with a `Set` before calling `Promise.all()` to avoid duplicate sends
- **No error propagation:** All `mail.send()` calls are awaited but results ignored; a failed Resend request logs but does not reject the promise or throw an exception

### Outcomes

**Success:**
- Token record persisted to DB (with hash, not plaintext)
- Email queued with Resend (if API key present) or logged to console (if key absent)
- `SendEmailResult` with `ok: true` returned; HTTP endpoint responds with success (e.g., `{ acknowledged: true }` for forgot-password, or the created entity for invitations)
- User receives email with one-time-use CTA button linking to frontend callback

**Failure Modes:**
- **`RESEND_API_KEY` not set:** Email skipped, logged to console at WARN level, `SendEmailResult.skipped === true`
- **Resend API error** (invalid from address, rate limit, malformed request): Logged at ERROR level, returns `{ ok: false, error: message }`, HTTP endpoint still succeeds (callers never see mail failures)
- **Invalid token on verify:** Frontend POSTs token to `POST /auth/verify-email` or `POST /invitations/accept`; service hashes token and queries DB, returns `INVALID_VERIFICATION_TOKEN` (400) or `INVITATION_EXPIRED` (400) if hash not found or expired
- **Token already used:** Reset password endpoint returns `INVALID_RESET_TOKEN` (400) if `usedAt !== null`; invitation accept returns `INVITATION_NOT_PENDING` (400) if status is not pending
- **Request validation error:** ZodValidationPipe rejects malformed email/password/token fields with 400

### Related Endpoints

- `POST /auth/register` — creates user, fires email verification
- `POST /auth/forgot-password` — generates password reset token, sends email (202 ACCEPTED regardless of email validity)
- `POST /auth/reset-password` — validates & consumes reset token, updates password hash
- `POST /auth/verify-email` — validates & consumes verification token, sets `emailVerifiedAt`
- `POST /invitations` — creates invitation, sends invite email (requires `super_admin`, `admin`, or `hr` role)
- `POST /invitations/:id/resend` — rotates invitation token, resends email (requires client scope + role)
- `POST /invitations/accept` — validates token, creates user + role + employee, issues session
- `POST /leave/requests` / `POST /expenses` / `POST /advances` — create request, trigger approval emails if status is `awaiting_approval` (via internal `notifyApprovers` helper or service-level approval discovery)

---

<a id="24-audit-log"></a>

## 24. Audit Logging

### Overview
The Audit Logging flow provides a cross-cutting mechanism to record user actions across the payroll system. The AuditService captures actor details (user ID, email, role), action type (create, update, delete, login, etc.), entity information (type, ID, label), and before/after JSON snapshots of changes. All audit logs are persisted to the `audit_logs` table and remain immutable; admins and super admins query them via a read-only REST endpoint.

### Entry Point
**GET /audit-logs**

Admin and super_admin users call this endpoint to list audit log entries. Authentication is required (Bearer token). The request method is GET, and query parameters filter by user, entity type, entity ID, action, or date range (ISO format).

### Step-by-Step Walkthrough

1. **Admin initiates audit log query** – Super admin or admin user clicks "Audit Logs" in the management interface or calls `GET /audit-logs?entityType=employee&action=create`.

2. **Request validation** – The request passes through `ClientScopeGuard` and `RolesGuard` (audit.controller.ts:13) to verify active client scope and role membership.

3. **Query parameter parsing** – The `@Query` decorator applies `ZodValidationPipe` with `listAuditQuerySchema` (audit.controller.ts:28). Schema validates optional UUID userId, ISO date strings for `from`/`to`, and string filters for entityType, entityId, action; pagination defaults are inherited from `paginationQuerySchema` (audit.schemas.ts:4–17).

4. **Service list method** – The controller calls `audit.list(clientId, query)` (audit.controller.ts:30), delegating to the AuditService (audit.service.ts:15–62).

5. **Build WHERE clause** – AuditService constructs a Prisma `AuditLogWhereInput` that filters by clientId, userId, entityType, entityId, action, and createdAt range (audit.service.ts:16–40). If a `search` parameter is provided, it adds an OR clause to match entityLabel, userEmail, action, or entityType (insensitive case match).

6. **Execute paginated query** – The service calls `this.prisma.$transaction()` with two operations: a `findMany` call to fetch records ordered by createdAt DESC with skip/take pagination (audit.service.ts:42–48), and a `count` call to get the total count for pagination metadata (audit.service.ts:49).

7. **Return paginated response** – The controller returns a JSON object with `data` array of AuditLog records and pagination metadata (page, pageSize, total, totalPages) (audit.service.ts:51–61).

8. **Recording flow (background)** – When other modules perform actions (employee creation, role updates, payroll submissions), they call `AuditService.record(dto: RecordAuditDto)` directly (audit.service.ts:71). The DTO includes clientId, userId, userEmail, userRole, action, entityType, entityId, entityLabel, beforeValue (JSON snapshot of prior state), afterValue (JSON snapshot of new state), ipAddress, and userAgent (audit.schemas.ts:27–41).

9. **Write audit log** – The AuditService creates a new record in `audit_logs` table, converting null values to `Prisma.JsonNull` for JSON columns (audit.service.ts:73–86). If a write fails, the error is caught and warn-logged; the audit failure does not block the domain operation (best-effort pattern, audit.service.ts:88–94).

### Validation & Business Rules

- **Role gate**: Only `super_admin` and `admin` roles can query audit logs (audit.controller.ts:15).
- **Client scope**: All reads are scoped to the authenticated user's active clientId; filtering adds additional WHERE conditions (audit.service.ts:17).
- **Query parameters**: `userId` must be a valid UUID; `from` and `to` must match ISO date format `\d{4}-\d{2}-\d{2}` (audit.schemas.ts:9–15).
- **Action field**: Supports create, update, delete, login, logout, approve, reject, and other domain-specific strings (max 80 chars).
- **Entity labels**: Optional human-readable name for the entity (e.g., employee name, max 200 chars).
- **Before/after snapshots**: Can be any JSON structure or null; Prisma 6 distinguishes SQL NULL from JSON null, requiring explicit `Prisma.JsonNull` conversion (audit.service.ts:78–85).
- **Indexing**: The table maintains indexes on (clientId, createdAt), (entityType, entityId), and (userId) for fast filtering (schema.prisma).
- **Best-effort writes**: Recording failures are logged as warnings and never throw; domain operations proceed regardless (audit.service.ts:71–95).

### Outcomes

**Success:**
- Audit log record persists in the `audit_logs` table with all actor, action, entity, and JSON snapshot fields populated.
- GET request returns HTTP 200 with paginated data: `{ data: [...], meta: { pagination: { page, pageSize, total, totalPages } } }`.
- Admins see a chronologically ordered list (newest first, ordered by createdAt DESC).
- Search/filter queries execute efficiently using database indexes.

**Failure modes:**
- **HTTP 401**: Missing or invalid Bearer token (caught by AuthGuard).
- **HTTP 403**: User lacks required `super_admin` or `admin` role (RolesGuard).
- **HTTP 400**: Query parameters fail Zod validation (e.g., invalid UUID format for userId, malformed ISO date for from/to). ZodValidationPipe returns the validation error message.
- **HTTP 500**: Internal server error if Prisma transaction fails unexpectedly (though query filters and pagination are low-risk).
- **Audit write failure**: If `AuditService.record()` encounters a Prisma error, the error is caught and warn-logged (Logger.warn); the calling domain operation is not blocked and the user sees success. The audit entry is lost.

### Related Endpoints

- **GET /audit-logs** – List audit logs with optional filtering and pagination (read-only, admin-only).
- **Domain mutations** (indirect) – Any controller endpoint that calls `AuditService.record()` (e.g., employee create/update, payroll submission, role assignment) triggers an async, best-effort audit write.
- **Query endpoints** – Search parameters (userId, entityType, entityId, action, from, to, search) support real-time filtering across the audit trail.
