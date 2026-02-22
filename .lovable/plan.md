

## Automatic Leave Balance Carryforward

### Overview
This feature builds on the previously approved (but not yet implemented) year-end date and carryforward settings. It adds leave balance tracking per employee per year, and automatic rollover logic: at year-end, if an employee's remaining leave days for a given type are less than or equal to the configured maximum carryforward, those days automatically roll into the next year's balance.

### What Gets Built (all together)

**1. Year-End Date in Company Profile (from prior plan)**
- Add `yearEndDate` (MM-DD format) and `yearEndLocked` boolean to `ClientConfig`
- One-time setting on Company Settings page -- locked after first save

**2. Max Carryforward on Leave Types (from prior plan)**
- Add `maxCarryForwardDays` field to `LeaveType` interface (default: 0 = no carryforward)
- Editable in Leave Types settings table and dialog
- Defaults: Annual Leave = 5, all others = 0

**3. Employee Leave Balance Tracking (new)**
- New interface `EmployeeLeaveBalance` in `LeaveTypeContext`:
  - `employeeId`, `leaveTypeId`, `year` (e.g. "2025-2026"), `entitled`, `used`, `carriedForward`, `remaining`
- Context provides functions:
  - `getBalanceForEmployee(employeeId, leaveTypeId, year)` -- returns balance record
  - `getBalancesForYear(employeeId, year)` -- returns all leave type balances
- Balances are auto-initialized from allocations (or `defaultDays`) when first accessed
- When a leave request is approved, `used` increments and `remaining` decrements

**4. Automatic Carryforward Logic (new)**
- New function `runYearEndCarryforward(fromYear, toYear)` in context
- For each employee + leave type:
  - Calculate remaining = entitled + carriedForward - used
  - If remaining > 0 and leave type has `maxCarryForwardDays > 0`:
    - Carryforward = min(remaining, maxCarryForwardDays)
  - Create next year's balance with `carriedForward` = calculated amount
- A "Run Year-End Rollover" button on the Leave Management page (visible when year-end date is configured)
- Shows a confirmation dialog with a preview table of what will carry forward per employee before executing
- Once run for a given year, it cannot be run again (tracked via a `completedRollovers` list)

**5. Leave Balance View on Leave Page (new)**
- New tab or section on the Leave Management page: "Leave Balances"
- Table showing each employee's balances per leave type for the current fiscal year:
  - Columns: Employee, Leave Type, Entitled, Carried Forward, Used, Remaining
- Remaining days highlighted amber if low, green if healthy

### Technical Details

**File: `src/contexts/ClientContext.tsx`**
- Add to `ClientConfig`: `yearEndDate?: string`, `yearEndLocked?: boolean`

**File: `src/pages/settings/CompanySettingsPage.tsx`**
- Add fiscal year-end month/day selector, locked after save

**File: `src/contexts/LeaveTypeContext.tsx`**
- Add `maxCarryForwardDays: number` to `LeaveType` (default 0)
- Add `EmployeeLeaveBalance` interface with fields: `employeeId`, `leaveTypeId`, `year`, `entitled`, `used`, `carriedForward`, `remaining`
- Add state: `balances: EmployeeLeaveBalance[]`, `completedRollovers: string[]`
- Add functions: `getBalanceForEmployee`, `getBalancesForYear`, `recordLeaveUsage`, `runYearEndCarryforward`, `initializeBalances`
- Carryforward logic: `carryforward = Math.min(remaining, maxCarryForwardDays)` -- only if remaining > 0 and maxCarryForwardDays > 0

**File: `src/pages/settings/LeaveTypesPage.tsx`**
- Add "Max Carryforward" column to table
- Add numeric input in add/edit dialog for `maxCarryForwardDays`

**File: `src/pages/LeavePage.tsx`**
- Add "Leave Balances" tab showing per-employee balances for the current fiscal year
- Add "Run Year-End Rollover" button (only visible when year-end date is set)
- Rollover confirmation dialog shows a preview of carryforward amounts
- When approving a leave request, call `recordLeaveUsage` to update balances

### Carryforward Rule Summary

```text
For each employee + leave type at year-end:
  remaining = entitled + carriedForward - used
  if remaining <= maxCarryForwardDays AND remaining > 0:
      next year carriedForward = remaining  (all remaining days roll over)
  if remaining > maxCarryForwardDays AND maxCarryForwardDays > 0:
      next year carriedForward = maxCarryForwardDays  (capped at max)
  if maxCarryForwardDays = 0:
      next year carriedForward = 0  (no rollover)
```

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ClientContext.tsx` | Add `yearEndDate`, `yearEndLocked` to config |
| `src/pages/settings/CompanySettingsPage.tsx` | Add year-end date picker with lock behavior |
| `src/contexts/LeaveTypeContext.tsx` | Add `maxCarryForwardDays` to LeaveType, add balance tracking state and carryforward logic |
| `src/pages/settings/LeaveTypesPage.tsx` | Add carryforward column and form field |
| `src/pages/LeavePage.tsx` | Add balances tab, rollover button, update approve to track usage |

