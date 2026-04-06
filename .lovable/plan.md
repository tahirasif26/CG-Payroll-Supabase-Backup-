

# Payroll Setup System — Implementation Plan

## Overview

Replace the current employee-type-driven payroll configuration with a **Payroll Setup** entity. Each setup encapsulates all payroll rules (pay schedule, components, taxes, deductions, overtime, loans, leave, settlement, retirement, approvals). Employees are assigned to a setup, and payroll runs derive all rules from it.

## Architecture

```text
PayrollSetup (new entity)
  ├── Pay Schedule
  ├── Payroll Options (toggles)
  ├── Payslip Components (earnings/deductions table)
  ├── Tax Rules (slab table)
  ├── Salary Rules
  ├── Overtime config
  ├── Auto Deductions
  ├── Loan & Advance Adjustments
  ├── Leave & Encashment
  ├── Final Settlement
  ├── Retirement Policies (PF/VPS)
  └── Approval Workflow

Employee.payrollSetupId → links to one setup
PayrollRun → fetches setup per employee, applies rules
```

## Changes

### 1. New Types — `src/types/payrollSetup.ts`
Define `PayrollSetup` interface with all 12 tab sections as nested objects. Include `id`, `name`, `country`, `currency`, `status`, `lastUpdated`, and sub-interfaces for each tab (PaySchedule, PayrollOptions, PayslipComponent[], TaxSlab[], SalaryRules, OvertimeConfig, AutoDeductions, LoanAdvanceConfig, LeaveEncashment, FinalSettlement, RetirementPolicies, ApprovalWorkflow).

### 2. Context — `src/contexts/PayrollSetupContext.tsx`
- CRUD operations for setups (add, edit, delete, duplicate, toggle status)
- Seed with 2-3 default setups (e.g., "Saudi Full-Time", "Contractor Setup", "Intern Setup")
- `getSetupById(id)` helper
- `getEmployeesBySetup(setupId)` to count assigned employees

### 3. Mock Data — `src/data/payrollSetupData.ts`
Pre-populate 3 setups with realistic configurations covering different pay schedules, tax slabs, overtime rules, and retirement policies.

### 4. Payroll Setup List Page — `src/pages/PayrollSetupPage.tsx`
- PageHeader: "Payroll Setup" with subtitle
- "+ New Setup" button top-right
- Table: Setup Name, Country, Employees Assigned (count), Pay Schedule, Status, Last Updated, Actions (Edit/Duplicate/Delete)
- Click Edit → navigate to edit page

### 5. Payroll Setup Editor — `src/pages/PayrollSetupEditorPage.tsx`
Full-page form with:
- **Top section**: Setup Name, Country, Currency, Status toggle
- **12 tabs** using existing `Tabs` component, each rendering form fields/tables as described in requirements
- Save/Cancel buttons
- Tab components split into `src/components/payrollSetup/` folder for manageability:
  - `PayScheduleTab.tsx`
  - `PayrollOptionsTab.tsx`
  - `PayslipComponentsTab.tsx`
  - `TaxRulesTab.tsx`
  - `SalaryRulesTab.tsx`
  - `OvertimeTab.tsx`
  - `AutoDeductionsTab.tsx`
  - `LoanAdvanceTab.tsx`
  - `LeaveEncashmentTab.tsx`
  - `FinalSettlementTab.tsx`
  - `RetirementPoliciesTab.tsx`
  - `ApprovalWorkflowTab.tsx`

### 6. Navigation Update — `src/components/AppSidebar.tsx`
Update `payrollSubNav`:
```
- Payroll Setup → /payroll/setup
- Payroll Runs → /payroll (existing)
- Payslips → /payslips
- Analytics → /analytics
```

### 7. Routes — `src/App.tsx`
Add:
- `/payroll/setup` → PayrollSetupPage (list)
- `/payroll/setup/new` → PayrollSetupEditorPage
- `/payroll/setup/:id` → PayrollSetupEditorPage (edit mode)
- Wrap app with `PayrollSetupProvider`

### 8. Employee Integration — `src/types/hcm.ts` + `src/pages/EmployeesPage.tsx`
- Add `payrollSetupId?: string` to `Employee` interface
- In employee profile Work tab, add "Payroll Setup" dropdown populated from context
- Display setup name in employee details
- Update mock employees to have assigned setups

### 9. Payroll Run Integration — `src/pages/PayrollPage.tsx`
- When generating payroll, fetch each employee's `payrollSetupId`
- Use setup's payslip components instead of global compensation settings
- Apply setup's tax rules instead of global tax configs
- Apply setup's overtime, auto deductions, loan/advance config
- Group employees by setup in preview for clarity
- Remove employee type multi-select from new run dialog (setup-driven now)

### 10. Retire Old Payroll Settings
- Remove "Payroll Settings" from `employerSettingsNav` in sidebar
- Remove route `/settings/payroll` → PayrollSettingsPage
- Keep CompensationSettingsPage, DeductionsPage, TaxPage files but mark as deprecated (don't delete to avoid breaking imports elsewhere immediately)
- Remove old settings references gradually

## File Summary

| Action | File |
|--------|------|
| Create | `src/types/payrollSetup.ts` |
| Create | `src/contexts/PayrollSetupContext.tsx` |
| Create | `src/data/payrollSetupData.ts` |
| Create | `src/pages/PayrollSetupPage.tsx` |
| Create | `src/pages/PayrollSetupEditorPage.tsx` |
| Create | `src/components/payrollSetup/*.tsx` (12 tab components) |
| Edit | `src/components/AppSidebar.tsx` — update nav |
| Edit | `src/App.tsx` — add routes + provider |
| Edit | `src/types/hcm.ts` — add `payrollSetupId` to Employee |
| Edit | `src/data/mockData.ts` — assign setups to employees |
| Edit | `src/pages/PayrollPage.tsx` — use setup-driven logic |
| Edit | `src/pages/EmployeesPage.tsx` — add setup dropdown |

## Estimated scope
~18 new files, ~6 edited files. Large feature — will be implemented incrementally with task tracking.

