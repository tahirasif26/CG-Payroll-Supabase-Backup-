

# Two Changes: Remove Currency from Company Profile + Employee Email Invite System

## 1. Remove Currency Tab from Company Profile

Currency is already managed per Payroll Setup, so it's redundant in Company Profile.

**Changes:**
- `src/pages/settings/CompanyProfilePage.tsx` — Remove the "Currency" tab and `CurrencySection` import. Keep only: Company Details, GL Code Mapping, Visual Preference (3 tabs).
- `src/components/TopNavLayout.tsx` — Remove `/settings/currency` from Settings matchPaths if present.
- `src/App.tsx` — Remove or redirect the `/settings/currency` route (currently points to CompanyProfilePage).

---

## 2. Employee Invite System (World-Class Email Onboarding)

When an admin creates a new employee, the system will send an invite email to their personal email. The employee clicks the link, sets their password, and logs in — seeing only their own data.

### Flow

```text
Admin creates employee (AddEmployeeWizard)
  ↓
System calls supabase.auth.admin.inviteUserByEmail()
  (via a secure Edge Function — client can't call admin APIs)
  ↓
Employee receives email with magic link
  ↓
Employee clicks link → lands on /reset-password
  ↓
Sets password → logged in as "employee" role
  ↓
Profile auto-created via existing trigger (handle_new_user)
  ↓
Employee sees: Dashboard, My Payslips, My Leave, My Expenses, etc.
```

### What Gets Built

1. **Edge Function: `invite-employee`**
   - Accepts: `{ email, full_name, employee_id }` 
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to call `supabase.auth.admin.inviteUserByEmail()`
   - Sets `user_metadata` with `full_name` so the profile trigger picks it up
   - Links the new auth user to the employee record via `employee_id` in profiles
   - Returns success/error

2. **Update `AddEmployeeWizard.tsx`**
   - After successfully creating the employee record, call the `invite-employee` edge function
   - Show a toast: "Invite email sent to [email]"
   - Add a toggle/checkbox: "Send login invite to employee" (checked by default)
   - Show the work email field prominently with a note: "This email will receive the login invite"

3. **Update `profiles` table trigger** 
   - The existing `handle_new_user` trigger already creates a profile with `full_name` from metadata
   - Add a migration to also set `employee_id` from `raw_user_meta_data->>'employee_id'` if present

4. **Employee email field clarity**
   - Ensure the wizard has both "Personal Email" and "Work Email" 
   - The invite goes to the **Work Email** (or personal if no work email)
   - Add helper text: "An invite link will be sent to this email for the employee to set up their account"

### Technical Details

| Item | Detail |
|------|--------|
| Edge Function | `supabase/functions/invite-employee/index.ts` |
| Auth method | `supabase.auth.admin.inviteUserByEmail()` via service role key |
| Secret needed | `SUPABASE_SERVICE_ROLE_KEY` (already configured) |
| Redirect URL | `window.location.origin/reset-password` (existing page handles password set) |
| Role assignment | Existing `handle_new_user` trigger assigns `employee` role by default |
| Profile linking | `employee_id` passed via `user_metadata` and set in profile via updated trigger |

### Security
- Edge function validates JWT to ensure only admin/hr users can send invites
- Input validation with Zod (email format, required fields)
- Service role key never exposed to client

