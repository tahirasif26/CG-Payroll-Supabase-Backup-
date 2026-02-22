

## EMI Pause Feature for Employee Loans

### Overview
Add the ability to pause EMI deductions on active loans for a specified number of months. This is a common request where employees need temporary relief from loan repayments.

### How It Works

- A new **"Pause EMI"** button will appear alongside the existing "Adjust EMI" button on active loan detail views
- Clicking it opens a dialog where the admin selects the number of months to pause (1-6)
- Optionally, a reason can be provided (e.g., "Employee on unpaid leave")
- When paused:
  - The loan's `monthlyDeduction` is set to 0
  - A new transaction of type `emi_pause` is recorded with the pause duration and reason
  - The loan detail view shows a visible **"EMI Paused"** indicator with the number of remaining pause months
  - The end date is automatically extended by the number of pause months
- When the pause period ends (or the admin manually resumes early), the EMI reverts to its previous value and an `emi_resume` transaction is recorded
- A **"Resume EMI"** button replaces the Pause button while paused, allowing early resumption

### Changes

**Type update (`src/types/hcm.ts`)**
- Add `emi_pause` and `emi_resume` to the `LoanTransaction.type` union
- Add optional fields to `Loan`: `pausedUntil?: string`, `prePauseEmi?: number`

**Loans page update (`src/pages/LoansPage.tsx`)**
- Add "Pause EMI" dialog with month selector (1-6) and reason textarea
- Add "Resume EMI" button when loan is currently paused
- Show a warning badge/banner on paused loans in both the list view and detail view
- Record `emi_pause` transaction when pausing (stores original EMI, pause months, reason)
- Record `emi_resume` transaction when resuming (restores original EMI)
- Transaction history table updated to display the two new types with appropriate badge colors

### Technical Details

**Pause EMI flow:**
1. Admin clicks "Pause EMI" on an active loan
2. Selects number of months (1-6), enters optional reason
3. On confirm:
   - Store current EMI in `loan.prePauseEmi`
   - Set `loan.monthlyDeduction` to 0
   - Calculate `loan.pausedUntil` date (current date + N months)
   - Extend `loan.endDate` by N months
   - Add `emi_pause` transaction with note showing original EMI, pause duration, and reason

**Resume EMI flow (manual or auto):**
1. Admin clicks "Resume EMI" (or pause period expires conceptually)
2. On confirm:
   - Restore `loan.monthlyDeduction` from `loan.prePauseEmi`
   - Clear `loan.pausedUntil` and `loan.prePauseEmi`
   - Add `emi_resume` transaction

**UI indicators:**
- Paused loans show an amber "EMI Paused" badge in the list table
- Detail view shows a highlighted banner: "EMI paused until [date] -- original EMI: SAR X"
- Transaction history shows `emi_pause` and `emi_resume` with distinct badge colors

### Files to Modify
| File | Change |
|------|--------|
| `src/types/hcm.ts` | Add `emi_pause`, `emi_resume` to transaction type; add `pausedUntil`, `prePauseEmi` to `Loan` |
| `src/pages/LoansPage.tsx` | Add Pause EMI dialog, Resume EMI button, pause indicators in list and detail views, new transaction type rendering |

