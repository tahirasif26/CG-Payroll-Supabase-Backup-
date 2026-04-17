# ConnectHR — Production Deployment Checklist

This is the pre-flight checklist to run before pointing customers at the app.

## 1. Database
- [ ] All migrations applied (auto-managed by Lovable Cloud)
- [ ] All RLS policies enabled and tested for every tenant table
- [ ] `feature_definitions` seeded
- [ ] Default `approval_roles` and `feature_presets` seeded per client (auto on client create)
- [ ] Database backups / Point-in-Time Recovery enabled
- [ ] Performance indexes applied (Step 15 migration)

## 2. Auth
- [ ] Email signup **disabled** in Lovable Cloud → Auth (only super-admin can create clients; admins invite employees)
- [ ] Auth email templates customized with ConnectHR branding
- [ ] Password requirements set (min 8 chars, complexity)
- [ ] Google OAuth provider configured with production redirect URIs

## 3. Edge Functions
- [ ] All required secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY`
- [ ] `PRODUCTION_DOMAIN` env var set, CORS restricted in production builds
- [ ] Rate limiting verified (`check_rate_limit` covers all sensitive functions)
- [ ] Service role key NEVER imported into the React app

## 4. Storage
- [ ] All buckets created: `avatars`, `client-logos`, `employee-documents`, `expense-receipts`, `asset-images`, `payslips`, `company-policies`, `receipts`
- [ ] RLS policies on `storage.objects` for each bucket
- [ ] Public buckets do not allow listing
- [ ] File size limits set per bucket

## 5. Frontend
- [ ] Environment variables set in hosting platform
- [ ] Sentry DSN configured (optional)
- [ ] Custom domain connected with SSL
- [ ] Build succeeds: `npm run build`
- [ ] No chunk > 500 KB gzipped without justification (lazy loading is on)

## 6. Quality
- [ ] All tests pass: `npm run test`
- [ ] TypeScript builds: `npx tsc --noEmit`
- [ ] ESLint clean: `npm run lint`
- [ ] Lighthouse > 90 on Dashboard, Employees, Payroll

## 7. Bootstrap
- [ ] First `super_admin` user created (manually insert into `user_roles` after first signup)
- [ ] Test client created via Client Management
- [ ] Admin invitation flow verified end-to-end
- [ ] Employee invitation flow verified end-to-end

## 8. Monitoring
- [ ] Sentry receiving errors (optional)
- [ ] Edge function logs reachable in Lovable Cloud dashboard
- [ ] Health check endpoint returns 200

## 9. Compliance
- [ ] Privacy policy page live (`/privacy`)
- [ ] Terms of service page live (`/terms`)
- [ ] Data export edge function tested (`export-user-data`)
- [ ] Audit logs being written for sensitive actions
- [ ] WPS file generator tested with at least one completed payroll run

## 10. Bootstrapping the first super-admin

Lovable Cloud has no signup form for super-admins. Bootstrap manually:

1. Sign up via the normal `/auth` page with the desired admin email.
2. In Lovable Cloud → SQL editor, run:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<that-user-uuid>', 'super_admin');
   ```
3. Log out / in. The user now sees Client Management.
