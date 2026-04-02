

## Show Full Profile for Own Record (Employee Role)

### Problem
Currently, when `role === "employee"`, **all** profiles (including own) show only the Work tab with mini org chart. The user wants their **own** profile to show all tabs with full details.

### Change

**File: `src/pages/EmployeesPage.tsx`** — Line 1298

Change the condition from:
```
if (isEmployee) {
```
to:
```
if (isEmployee && !isOwnProfile) {
```

This makes the Work-only + mini org chart view apply **only when viewing others**. When viewing own profile (`isOwnProfile`), the code falls through to the full profile view below.

Additionally, in the full profile section that renders below (the employer view), wrap certain elements with `isOwnProfile` checks:
- Hide the **Separation** button when `isOwnProfile`
- Pass `readOnly={true}` to all `SectionCard` components when `isOwnProfile` so edit/save buttons are hidden
- Optionally hide **Compensation** tab for own-profile employee view

This is a minimal conditional change — one line gates the restricted view, and a few `readOnly` props protect the full view.

