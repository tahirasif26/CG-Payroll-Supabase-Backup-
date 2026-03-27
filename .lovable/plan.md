

## RBAC for Employee Directory

### Overview

When role is **employer** (admin), the current full-access experience remains unchanged. When role is **employee**, viewing a colleague's profile shows only a "Limited Profile" with public attributes. Viewing their own profile shows full details (read-only).

### Access Matrix

| Viewer | Target | Directory Table | Profile Detail |
|--------|--------|----------------|----------------|
| Employer | Any | Full columns (all current) | All tabs, edit, separation |
| Employee | Self | Full columns | All tabs (read-only, no edit buttons) |
| Employee | Others | Name, Dept, Designation, Email only | Limited card: name, photo, title, dept, email, reports-to, direct reports |

### Files to Modify

**`src/pages/EmployeesPage.tsx`** — all changes here:

1. **Import `useRole`** from RoleContext and `useReporting` (already imported)

2. **Directory Table** (`EmployeeDirectoryTable`):
   - Accept `isEmployee` prop
   - When `isEmployee=true`: hide Category, Work Location columns; keep Name, ID, Department, Designation, Status
   - Hide "Add Employee" and "Export" buttons in PageHeader

3. **Profile Detail View** (the `if (selectedEmployee)` block ~line 1283):
   - Add access check: `const { role, currentEmployeeId } = useRole()`
   - Derive `isOwnProfile = role === "employee" && selectedEmployee.id === currentEmployeeId`
   - Derive `isLimitedView = role === "employee" && !isOwnProfile`

4. **Limited Profile View** — when `isLimitedView`:
   - Show only a single card (no tabs) with: avatar, full name, designation, department, work email
   - Show "Reports To" from ReportingContext
   - Show "Direct Reports" — employees whose manager is this person (from `reportMap`)
   - Hide: Separation button, all edit buttons, all sensitive tabs

5. **Own Profile View** — when `isOwnProfile`:
   - Show all tabs but hide edit buttons on SectionCard (pass `readOnly` prop)
   - Hide: Separation button, Compensation tab (or show read-only)
   - Keep: Personal, Work, Time Off, Documents, Assets tabs as read-only

6. **Employer View** — unchanged (current behavior)

### Implementation Details

- Create a `LimitedProfileView` component inline that renders a simple card with public fields + org hierarchy
- Pass `readOnly` boolean to `SectionCard` to conditionally hide Edit button
- In main component: wrap the profile detail rendering in conditional logic based on role
- Direct reports query: `employees.filter(e => reportMap[e.id] === selectedEmployee.id)`

