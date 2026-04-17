# ConnectHR

A multi-tenant Human Capital Management (HCM) suite for the Gulf region: payroll, expenses, leave, assets, performance, and compliance — built on React + Lovable Cloud (Supabase).

## Highlights
- Multi-tenant SaaS with strict tenant isolation (RLS on every business table)
- Real-time payroll engine with `bigint` money math (no floating-point errors)
- KSA + UAE end-of-service benefit calculators
- SAMA WPS file generation
- Per-user feature flags + presets
- Full audit trail of sensitive actions
- GDPR / PDPL personal data export

## Tech Stack
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query
- Lovable Cloud (Supabase): Postgres, RLS, Auth, Storage, Edge Functions
- Vitest for unit tests

## Local Setup

Prerequisites: Node 18+ and npm.

```sh
git clone <YOUR_GIT_URL>
cd connecthr
npm install
cp .env.example .env  # then fill in VITE_SUPABASE_* values
npm run dev
```

The app runs on http://localhost:8080.

## Scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |

## Editing in Lovable

Visit your [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting. Changes are committed to this repo automatically.

## Documentation
- [Architecture overview](./docs/architecture.md)
- [Production deployment checklist](./DEPLOYMENT.md)

## Bootstrapping the first super-admin
See [DEPLOYMENT.md → section 10](./DEPLOYMENT.md).

## Deploying

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click **Share → Publish**.
Custom domains: Project Settings → Domains.
