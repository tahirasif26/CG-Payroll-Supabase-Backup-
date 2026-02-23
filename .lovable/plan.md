

## Approval Matrix System

### Overview
Replace the current simple approve/reject buttons with a structured approval workflow system. This includes:
- A configurable **Expense Approval Matrix** in Settings with role-based thresholds
- **HR Approval role** enforcement for loans and loan changes
- **Payroll Approval role** enforcement for payroll completion
- A new **ApprovalContext** to centralize permission checking across the app

### What Changes

**1. New Approval Context (`src/contexts/ApprovalContext.tsx`)**
- Central store for approval roles and expense thresholds
- Interfaces:
  - `ApprovalRole`: defines a named role (e.g., "Department Manager", "Finance Head", "HR Manager", "Payroll Manager") with permissions: `canApproveExpenses`, `expenseApprovalLimit` (max amount they can approve), `canApproveHR` (loans, loan changes, separations), `canApprovePayroll`
  - `UserApprovalAssignment`: maps an employee to one or more approval roles
- Functions: `canUserApproveExpense(userId, amount)`, `canUserApproveHR(userId)`, `canUserApprovePayroll(userId)`, `getUserApprovalRoles(userId)`
- Persisted to localStorage, seeded with defaults matching existing `userPermissions` data

**2. Approval Matrix Settings Page (`src/pages/settings/ApprovalMatrixPage.tsx`)**
- New settings page under Settings nav: "Approval Matrix"
- Two sections:
  - **Approval Roles**: CRUD table with columns: Role Name, Expense Limit (max amount), Can Approve HR, Can Approve Payroll. Add/Edit dialog to configure each role.
  - **User Assignments**: Table showing Employee, Assigned Roles (multi-select). Add/Edit dialog to assign roles to employees.
- Route: `/settings/approval-matrix`

**3. Replace User Management Page**
- The existing User Management page (`/settings/users`) will be replaced by the new Approval Matrix page which covers the same permissions in a more structured way
- The sidebar entry "User Management" becomes "Approval Matrix"

**4. Expense Approval Enforcement (`src/pages/ExpensesPage.tsx`)**
- When clicking Approve on an expense:
  - Check if the current simulated user (from `RoleContext.currentEmployeeId`) has an approval role with sufficient `expenseApprovalLimit` for the expense amount
  - If the amount exceeds their limit, show a toast: "Your approval limit is SAR X. This expense of SAR Y requires a higher authority."
  - If no expense approval role at all, show: "You do not have expense approval permissions."
- Show the approver's name and approval limit in a tooltip on the approve button

**5. Loan & HR Approval Enforcement (`src/pages/LoansPage.tsx`)**
- Guard all loan actions (create, edit, EMI adjust, pause, resume) with `canUserApproveHR(currentEmployeeId)`
- If user lacks HR approval role, show a toast: "This action requires HR approval permissions."
- Same check applied when approving separations in `SeparationsPage.tsx`

**6. Payroll Approval Enforcement (`src/pages/PayrollPage.tsx`)**
- Guard "Complete & Lock" action with `canUserApprovePayroll(currentEmployeeId)`
- If user lacks payroll approval role, show a toast: "Completing payroll requires Payroll approval permissions."
- Creating new payroll runs and processing remain unrestricted (or can be gated similarly)

### Technical Details

**File: `src/contexts/ApprovalContext.tsx` (new)**
```
ApprovalRole {
  id: string;
  name: string;
  expenseApprovalLimit: number; // 0 = no expense approval
  canApproveHR: boolean;
  canApprovePayroll: boolean;
}

UserApprovalAssignment {
  id: string;
  userId: string;
  userName: string;
  roleIds: string[];
}
```
- `canUserApproveExpense(userId, amount)`: finds user's roles, returns true if any role has `expenseApprovalLimit >= amount`
- `canUserApproveHR(userId)`: returns true if any assigned role has `canApproveHR === true`
- `canUserApprovePayroll(userId)`: returns true if any assigned role has `canApprovePayroll === true`
- Default seed roles: "Department Manager" (limit 5000, no HR/payroll), "Finance Head" (limit 50000, no HR/payroll), "HR Manager" (no expense limit, HR = true), "Payroll Manager" (no expense limit, payroll = true), "Admin" (unlimited expense, HR + payroll)

**File: `src/pages/settings/ApprovalMatrixPage.tsx` (new)**
- Two-tab layout: "Approval Roles" and "User Assignments"
- Roles tab: table + add/edit dialog with fields for name, expense limit, HR toggle, payroll toggle
- Assignments tab: table + add/edit dialog with employee select and multi-checkbox for roles

**File: `src/components/AppSidebar.tsx`**
- Replace `{ title: "User Management", url: "/settings/users", icon: Shield }` with `{ title: "Approval Matrix", url: "/settings/approval-matrix", icon: Shield }`

**File: `src/App.tsx`**
- Add route: `/settings/approval-matrix` -> `ApprovalMatrixPage`
- Wrap app with `ApprovalProvider`
- Keep `/settings/users` route pointing to the new page for backward compatibility

**File: `src/pages/ExpensesPage.tsx`**
- Import `useApprovals` and `useRole`
- In `handleApprove`: call `canUserApproveExpense(currentEmployeeId, exp.amount)` before approving
- Show toast with specific limit info if denied

**File: `src/pages/LoansPage.tsx`**
- Import `useApprovals` and `useRole`
- Guard `handleSubmit`, `handleSaveEdit`, `handleEmiAdjust`, `handlePauseEmi`, `handleResumeEmi` with `canUserApproveHR` check

**File: `src/pages/PayrollPage.tsx`**
- Import `useApprovals` and `useRole`
- Guard `handleComplete` (the "Complete & Lock" action) with `canUserApprovePayroll` check

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/contexts/ApprovalContext.tsx` | New context with roles, assignments, and permission check functions |
| `src/pages/settings/ApprovalMatrixPage.tsx` | New settings page with roles and user assignment management |
| `src/App.tsx` | Add ApprovalProvider wrapper and new route |
| `src/components/AppSidebar.tsx` | Replace User Management with Approval Matrix in settings nav |
| `src/pages/ExpensesPage.tsx` | Add expense approval threshold enforcement |
| `src/pages/LoansPage.tsx` | Add HR approval role guard on all loan actions |
| `src/pages/PayrollPage.tsx` | Add payroll approval role guard on complete/lock |
| `src/data/settingsData.ts` | Can remove `UserPermission` interface and `userPermissions` data (replaced by ApprovalContext) |

