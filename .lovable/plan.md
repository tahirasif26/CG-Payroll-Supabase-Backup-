

## Add Work Location Country to Employee Directory

A small UI update to show the **Work Location Country** column in the employee directory table.

### Changes

**File: `src/pages/EmployeesPage.tsx`**

In the `EmployeeDirectoryTable` component:

1. Add a new table header column "Work Location" between "Category" and "Salary" in the header row (line ~239).
2. Add a matching table cell in each row displaying `emp.workLocationCountry` with a small map-pin icon for visual clarity (after the Category cell, around line ~265).
3. Update the `colSpan` in the empty-state row from 8 to 9 to account for the new column.

No new files, dependencies, or context changes needed.

