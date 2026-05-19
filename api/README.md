# cg-payroll API

NestJS backend for ConnectHR / cg-payroll. Replaces direct Supabase access from the frontend with a typed, RBAC-aware HTTP API backed by Prisma + local PostgreSQL.

**Status:** Phase 1 complete — Auth (JWT + refresh rotation + password reset), RBAC guards, Tenants, Invitations.

## Stack

- NestJS 11
- Prisma 6 / PostgreSQL 16
- JWT auth via `@nestjs/jwt` + `passport-jwt`, bcrypt for password hashing
- Zod (env + DTO validation)
- nestjs-pino (structured logs, secrets redacted)
- Swagger / OpenAPI
- Helmet, compression, rate limiting

## Project layout

```
api/
├── prisma/
│   ├── schema.prisma          # Foundational + auth/invitation models
│   └── seed.ts                # Demo super admin + demo tenant + demo admin
├── prisma.config.ts           # Datasource URL (Prisma 6.5+ config)
└── src/
    ├── main.ts                # Bootstrap: helmet, compression, CORS, swagger
    ├── app.module.ts          # Root module — global JwtAuthGuard + Throttler
    ├── config/                # Zod env validation + typed ConfigService
    ├── common/
    │   ├── decorators/        # @Public, @CurrentUser, @Roles, @ClientScope,
    │   │                      #   @ActiveClientId, @RequireFeature
    │   ├── dto/               # ApiResponse envelope, pagination helpers
    │   ├── filters/           # GlobalExceptionFilter (Prisma → HTTP mapping)
    │   ├── interceptors/      # ResponseInterceptor (wraps responses)
    │   ├── pipes/             # ZodValidationPipe
    │   └── types/             # JwtAccessPayload, RequestUser, etc.
    ├── infrastructure/
    │   ├── prisma/            # PrismaModule + PrismaService
    │   └── mail/              # Dev console transport (swap point for SMTP)
    └── modules/
        ├── auth/              # JWT + refresh + reset + password change
        │   ├── guards/        # JwtAuthGuard, RolesGuard, FeatureGuard,
        │   │                  #   ClientScopeGuard
        │   └── strategies/    # JwtStrategy
        ├── rbac/              # has_role / has_feature / is_admin_or_hr_in_client
        ├── users/             # /users/me + profile + password change
        ├── tenants/           # POST /tenants — replaces create-client edge fn
        ├── invitations/       # invite, resend, revoke, accept — replaces
        │                      #   invite-employee & resend-invite edge fns
        └── health/            # /health and /health/ready
```

## Local setup

### 1. Start Postgres

From the repo root:

```sh
docker compose up -d postgres
```

### 2. Install deps

```sh
cd api
npm install
```

### 3. Configure env

```sh
cp .env.example .env
# Replace the JWT secrets with `openssl rand -hex 32` in any non-dev environment.
```

### 4. Run migrations + seed

```sh
npm run prisma:migrate:dev -- --name phase1_auth
npm run db:seed
```

The seed prints demo credentials. You'll get a super-admin user, a demo tenant, and a demo admin user.

### 5. Start the API

```sh
npm run start:dev
```

- API:     http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Health:  http://localhost:3001/api/v1/health/ready

## Endpoints (Phase 1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | public | Self-signup |
| `POST` | `/api/v1/auth/login` | public | Email + password → access + refresh |
| `POST` | `/api/v1/auth/refresh` | public | Rotates refresh token; replay detection |
| `POST` | `/api/v1/auth/logout` | JWT | `{ refreshToken?, allDevices? }` |
| `POST` | `/api/v1/auth/forgot-password` | public | Always 202 — no email enumeration |
| `POST` | `/api/v1/auth/reset-password` | public | `{ token, password }` |
| `POST` | `/api/v1/auth/verify-email` | public | `{ token }` |
| `GET`  | `/api/v1/users/me` | JWT | User + profile + memberships |
| `PATCH`| `/api/v1/users/me/profile` | JWT | Update profile |
| `PATCH`| `/api/v1/users/me/password` | JWT | Change password |
| `POST` | `/api/v1/tenants` | public¹ | Provision tenant + bootstrap admin |
| `GET`  | `/api/v1/tenants` | super_admin | Paginated list |
| `GET`  | `/api/v1/tenants/:id` | JWT | Tenant by id |
| `PATCH`| `/api/v1/tenants/:id` | super_admin / admin | Update tenant |
| `GET`  | `/api/v1/invitations` | admin / hr (scoped) | List invites for active client |
| `POST` | `/api/v1/invitations` | admin / hr (scoped) | Send invitation |
| `POST` | `/api/v1/invitations/:id/resend` | admin / hr (scoped) | Resend with fresh token |
| `DELETE`| `/api/v1/invitations/:id` | admin / hr (scoped) | Revoke pending invite |
| `POST` | `/api/v1/invitations/accept` | public | `{ token, password }` → auto-login |

¹ `POST /tenants` is temporarily `@Public` so the very first tenant can be created. Tighten to `super_admin` once you've bootstrapped your platform admin (Phase 1.1 — add a bootstrap-token gate).

### Client-scoping

Endpoints with `@ClientScope()` resolve the active client in this order:
1. `X-Client-Id` header
2. `:clientId` route param
3. `user.primaryClientId` (JWT claim)

Super-admins can pick any client; everyone else must be a member.

## Response envelope

```json
// success
{ "success": true, "data": { ... }, "meta": { "pagination": { ... } } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { ... } } }
```

## Security notes

- **Refresh-token rotation:** every refresh issues a new token, revokes the old, and detects replay (revoked-then-reused) by burning the entire family.
- **Password reset:** stored as `sha256(token)`; single-use; expires after `PASSWORD_RESET_TOKEN_TTL_MIN`; successful reset revokes all sessions.
- **Email enumeration:** `forgot-password` always returns 202 regardless of whether the email exists.
- **Bcrypt rounds:** controlled by `BCRYPT_ROUNDS` (default 12).
- **Helmet + CORS:** wired in `main.ts`. `FRONTEND_URL` and `CORS_ORIGINS` must match your dev FE port.
- **Throttler:** 100 requests / 60 seconds by default (configurable).
- **Log redaction:** `Authorization`, `Cookie`, `password*`, `token*`, `refreshToken` are scrubbed from pino logs.

## Mail transport

Phase 1 ships a dev mail transport that **logs to console**. Outgoing messages appear in your dev server output. Swap [`MailService.send()`](src/infrastructure/mail/mail.service.ts) for nodemailer + SMTP / Resend / SES in a later phase — the interface is stable.

## Roadmap

| Phase | Status |
|---|---|
| 0. Scaffold | ✅ done |
| 1. Auth + RBAC + Tenants + Invitations | ✅ done |
| 2. Frontend service layer | next |
| 3. Read-side modules (Employees, Org, Policies, Notifications, Audit) | pending |
| 4. Assets / Expenses / Advances / Loans / Leave | pending |
| 5. Approval engine | pending |
| 6. Payroll (incl. PDF gen, WPS export) | pending |
| 7. Performance + Separations/EOSB | pending |
| 8. Reminders cron + Realtime (WebSocket) | pending |
| 9. Storage (S3/MinIO) | pending |
| 10. Hardening | pending |

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate:dev` | Create + apply a dev migration |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed reference + demo data |
| `npm run db:reset` | Drop + recreate DB and reseed |
| `npm test` | Jest unit tests |
| `npm run lint` | ESLint with autofix |
