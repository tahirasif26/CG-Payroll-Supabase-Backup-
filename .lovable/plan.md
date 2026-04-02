

## Refactor Employee Profile (Employee Role) — Work Tab Only with Mini Org Chart

### Overview

When viewing any employee profile as an **employee** (both self and others), replace the current view with a single **Work** tab showing limited work info plus a visual mini org chart showing the hierarchy (manager above, selected employee, direct reports below) — matching the reference screenshot style.

### Changes

**File: `src/pages/EmployeesPage.tsx`**

1. **Remove the current Limited Profile View** (lines ~1299-1365) and the multi-tab own-profile view distinction

2. **Replace with a unified employee-role profile view** that shows:
   - Back button
   - Employee header (avatar, name, designation)
   - Single card with work details: Name, Designation, Work Email, Work Phone, Department
   - **Mini Org Chart section** below the work details:
     - Manager card at top (who this employee reports to) with connector line
     - Selected employee card in the middle with "View profile" button and report counts
     - Divider line with label "People reporting to [Name]"
     - Grid of direct report cards (avatar, name, designation) below

3. **Mini Org Chart design** (matching screenshot):
   - Each card: bordered box with avatar (initials circle), name, title
   - Vertical connector lines between levels
   - Manager card → connector → employee card → connector with label → direct reports grid
   - Report count badge ("X reports, Y direct") on the employee's card
   - Direct reports shown as horizontal cards in a responsive grid

4. **Directory table for employee role**: Keep current behavior (limited columns)

### Technical Details

- Use `reportMap` from `useReporting` to find manager and direct reports
- Walk up one level for manager, walk down to find manager's manager if needed for the "grandparent" display
- The mini org chart is a simple CSS flex/grid layout, not the full OrgChartPage tree
- For employee role (both self and others), the profile renders identically — no edit buttons, single view
- Employer role profile remains completely unchanged

