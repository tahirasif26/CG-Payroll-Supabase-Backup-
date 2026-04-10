

# Authentication & Role-Based Access for ConnectHR

## What We're Building

1. **Login/Signup pages** — Clean, branded ConnectHR auth form with Email/Password + Google sign-in
2. **Role-based access** — Replace the manual Employer/Employee toggle with real roles (`admin`, `hr`, `employee`) stored in the database
3. **Profiles table** — Link authenticated users to employee records
4. **Protected routes** — Admin/HR see all pages; employees see only their own data

---

## Database Setup

### 1. `profiles` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK, FK → auth.users) | ON DELETE CASCADE |
| full_name | text | |
| avatar_url | text | nullable |
| employee_id | text | nullable, links to mock employee ID |
| created_at | timestamptz | default now() |

- RLS: users can read/update only their own profile
- Trigger: auto-create profile row on signup

### 2. `user_roles` table (security best practice)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | ON DELETE CASCADE |
| role | app_role enum (`admin`, `hr`, `employee`) | |

- RLS with `has_role()` security definer function
- First admin assigned manually via the app's user management

### 3. `has_role()` function
Security definer function to check roles without recursive RLS issues.

---

## Frontend Changes

### New Files
- **`src/pages/AuthPage.tsx`** — Login/Signup form with tabs, Google OAuth button, ConnectHR branding
- **`src/hooks/useAuth.ts`** — Auth state hook (session, profile, role)
- **`src/components/ProtectedRoute.tsx`** — Redirects unauthenticated users to /auth

### Modified Files
- **`src/contexts/RoleContext.tsx`** — Replace hardcoded toggle with real role from `user_roles` table. Role type changes to `admin | hr | employee`. Remove `setRole`.
- **`src/components/AppSidebar.tsx`** — Remove Employer/Employee toggle buttons from footer. Show nav based on actual role (`admin`/`hr` = full nav, `employee` = limited nav).
- **`src/components/AppLayout.tsx`** — Show logged-in user's name from profile. Add logout button.
- **`src/App.tsx`** — Wrap routes with auth check. Show AuthPage when not logged in.

### Auth Page Design
- Centered card with ConnectHR logo
- Email + password fields with validation
- "Sign in with Google" button
- Toggle between Login / Sign Up
- Password reset link (forgot password flow)

### Role-Based Navigation
- **Admin/HR**: See all sidebar groups (Dashboard, Employees, Payroll, Expenses, Assets, Settings, etc.)
- **Employee**: See only Dashboard, My Payslips, My Leave, My Expenses, My Assets, Company Policies, Directory

---

## Technical Details

- Google OAuth via `lovable.auth.signInWithOAuth("google")` (managed, no config needed)
- Email/password via `supabase.auth.signUp()` / `signInWithPassword()`
- Email confirmation disabled by default (users verify email before login)
- Configure Social Auth tool will be called to set up Google OAuth integration
- Admin assigns roles through an updated User Management page

