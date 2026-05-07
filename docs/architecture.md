# HRConnect — Architecture Overview

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + Tailwind + shadcn/ui |
| State / data fetching | TanStack Query, React Context for transient UI state |
| Backend | Lovable Cloud (Supabase): Postgres + RLS + Auth + Storage + Edge Functions (Deno) |
| Money | `bigint` minor units (see `src/lib/money.ts`) |

## Multi-tenancy

Every business table has a `client_id` column referencing `public.clients`. Row-Level
Security (RLS) policies use two helper functions:

- `get_user_client_id(uid)` — returns the caller's tenant
- `is_admin_or_hr_in_client(uid, client_id)` — true if the caller is admin/hr in that tenant

**Three roles** in `user_roles`:
- `super_admin` — cross-tenant; manages clients
- `admin` / `hr` — full tenant access
- `employee` — sees only own data + colleague directory entries

## Feature flags

`feature_definitions` (global) lists every togglable feature. `feature_toggles`
(per-user) overrides the role-based default. Edge functions and the
`useFeatureAccess` hook use `has_feature(uid, key)` to authorize.

`feature_presets` (per client) bundle togglable feature sets so HR can apply
"Standard Employee" / "Manager" / etc. in one click.

## Money handling

All monetary amounts are stored as `bigint` minor units (halalas, fils, cents)
to avoid IEEE-754 rounding bugs. Helpers in `src/lib/money.ts`:

- `toMinorUnits(123.45, "SAR")` -> `12345n`
- `addMoney`, `subtractMoney`, `multiplyMoney`, `percentOf`, `divideMoney`
- `formatMoney(12345n, "SAR")` -> `"SAR 123.45"`

## Payroll engine

`src/lib/payroll/calculator.ts` accepts a payroll setup + employee + period and
returns gross / deductions / net using bigint math. Each company defines a
`payroll_setup` with components (basic, housing, allowances, statutory deductions).

End-of-Service: `src/lib/eosb/{ksa,uae}.ts` implement KSA and UAE labor law.

## Edge functions

| Function | Purpose |
|----------|---------|
| `create-client` | Super-admin-only; provisions a new tenant + admin user |
| `invite-employee` | Admin/HR invites an employee, creates auth user + employee row |
| `set-feature-toggle` | Toggle a single feature for a user |
| `bulk-set-feature-toggles` | Bulk toggles |
| `bulk-apply-preset` | Apply a feature preset to many users at once |
| `approve-payroll-run` | Marks a payroll run completed; writes audit log |
| `generate-payslip-pdf` | Server-side PDF rendering with `pdf-lib` |
| `generate-wps-file` | KSA SAMA Wage Protection System SIF (CSV) |
| `export-user-data` | GDPR/PDPL personal data export |

All sensitive functions are protected by:
- JWT validation in code
- Tenant check (caller must belong to the same client)
- `check_rate_limit(key, max, window_seconds)`
- Zod schema validation on inputs

## Audit trail

`audit_logs` captures who did what to which entity with before/after JSON
snapshots. Admin/HR can read their tenant's logs; super-admin sees all.

## Storage buckets

Private buckets gated by RLS on `storage.objects`:
- `employee-documents`, `expense-receipts`, `asset-images`, `payslips`,
  `company-policies`, `receipts`
Public read buckets (still write-restricted): `avatars`, `client-logos`.
