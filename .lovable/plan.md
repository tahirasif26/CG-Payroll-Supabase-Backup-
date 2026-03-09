

## Plan: Add Advance Dropdown to Expense Claim Form

### Problem
Advances data lives as local state in `AdvancesPage.tsx`. The expense form in `ExpensesPage.tsx` has no way to access it. We need to:
1. Share advance data across both pages
2. Add an "Against Advance" dropdown to the expense form
3. Filter advances per employee (only show that employee's approved advances with remaining balance)

### Approach

**1. Create shared Advance context (`src/contexts/AdvanceContext.tsx`)**
- Move the `Advance` interface and `initialAdvances` data into a new context
- Expose `advances`, `addAdvance`, `updateAdvance`, `approveAdvance`, `rejectAdvance`, and a helper `getEmployeeAdvances(employeeId)` that returns only approved advances with remaining balance > 0
- Wrap app in `AdvanceProvider`

**2. Update `src/pages/AdvancesPage.tsx`**
- Replace local state with `useAdvances()` context
- Remove the `Advance` interface and `initialAdvances` (now in context)

**3. Update `src/pages/ExpensesPage.tsx`**
- Import `useAdvances()` context
- Add a new form field `formAdvanceId` (optional dropdown)
- When employee is selected in the form, filter advances to show only that employee's **approved** advances with remaining balance > 0
- Display advance name + remaining balance in dropdown options
- When an expense is submitted against an advance, update the advance's `amountUsed` via context
- Store `advanceId` on the expense record (add to `ExpenseReimbursement` type or store locally)

**4. Update `src/types/hcm.ts`**
- Add optional `advanceId?: string` field to `ExpenseReimbursement` interface

**5. Update `src/main.tsx` or `src/App.tsx`**
- Wrap with `AdvanceProvider`

### Form UX
- The "Against Advance" dropdown appears after employee selection in both New and Edit forms
- Shows: `"{advanceName} — Remaining: {currency} {remaining}"` for each option
- Includes a "None" option (no advance linkage)
- When advance is selected, the advance's remaining balance is shown as a hint
- On submit, the advance's `amountUsed` increments by the expense amount

### Files to Create
- `src/contexts/AdvanceContext.tsx`

### Files to Modify
- `src/pages/AdvancesPage.tsx` — use shared context
- `src/pages/ExpensesPage.tsx` — add advance dropdown to form
- `src/types/hcm.ts` — add `advanceId` to `ExpenseReimbursement`
- `src/App.tsx` — add `AdvanceProvider`

