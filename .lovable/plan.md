

# Multi-Currency Implementation Plan

## Overview

This plan implements full multi-currency support with three main areas: Currency Settings (expanded), Expenses (currency-aware), Payroll (country subtotals with reporting currency), and Payslips (pay currency display). The term "reporting currency" replaces "converted currency" throughout.

---

## 1. Currency Settings Page - Expanded

The current simple currency selector page will be rebuilt into three sections:

### Section A: Reporting Currency (mandatory)
- Rename "Default Currency" to "Reporting Currency"
- Keep the existing currency dropdown but make it clearly labeled as the organization's reporting currency
- Add explanatory text: "All payroll totals and reports will be converted to this currency for consolidated reporting"

### Section B: Country-Currency Mapping Table
- A table mapping each work location country to its default pay currency
- Columns: Country | Pay Currency | Actions (Edit)
- Pre-populated from `workLocationCountries` list with sensible defaults (Saudi Arabia = SAR, UAE = AED, etc.)
- Inline edit via dialog to change the mapped currency
- This determines each employee's pay currency automatically based on their `workLocationCountry`

### Section C: Exchange Rates (separate sidebar menu item)
- Add a new sidebar nav item "Exchange Rates" under Settings (with `ArrowLeftRight` icon)
- New page `/settings/exchange-rates` with a dedicated `ExchangeRatesPage`
- Table with columns: From Currency | To Currency (reporting currency, fixed) | Rate | Last Updated | Actions
- Add/Edit/Delete exchange rates via dialog
- Only currencies that appear in country-currency mappings need rates
- Rate is always relative to the reporting currency (e.g., 1 USD = 3.75 SAR)

---

## 2. Expenses Page - Currency Support

### Expense Form Changes
- Add "Expense Currency" dropdown (defaults to employee's pay currency)
- Add "Exchange Rate" field (auto-fills from exchange rate settings, editable for override)
- Show calculated "Amount in Pay Currency" live as user types
- Label changes: "Amount (SAR)" becomes "Amount" with currency shown dynamically

### Expense Table Changes
- Show original amount with currency code (e.g., "USD 500")
- Show converted amount in parentheses if different from pay currency (e.g., "(SAR 1,875)")
- Payroll picks up the converted amount

### Type Changes
- Add to `ExpenseReimbursement`: `currency?: string`, `exchangeRate?: number`, `originalAmount?: number`

---

## 3. Payroll Page - Country Subtotals and Reporting Currency

### Payroll Detail View Changes
- Add a "Country" column in the employee breakdown table
- Group/subtotal rows by work location country
  - Each country group shows a subtotal row with country name, employee count, and totals in the country's pay currency
- Add a "Currency" column showing each employee's pay currency (SAR, AED, GBP, etc.)

### Stat Cards
- Top-level stat cards show totals converted to the **reporting currency**
- Label format: "Total Gross (SAR)" where SAR is the reporting currency
- Conversion uses the exchange rates from settings

### CSV Accounting Entry
- Add Currency column per line
- Add Reporting Currency Amount column for cross-currency lines

---

## 4. Payslips - Pay Currency Display

- Show amounts in the employee's pay currency throughout the payslip
- Add a small note showing reporting currency equivalent if different
- Currency symbol/code shown next to all monetary values

---

## Technical Details

### New/Modified Files

| File | Change |
|------|--------|
| `src/data/settingsData.ts` | Add `CountryCurrencyMapping` and `ExchangeRate` interfaces; add default data arrays |
| `src/types/hcm.ts` | Add `currency`, `exchangeRate`, `originalAmount` to `ExpenseReimbursement` |
| `src/pages/settings/CurrencySettingsPage.tsx` | Rebuild with reporting currency selector + country-currency mapping table |
| `src/pages/settings/ExchangeRatesPage.tsx` | New page for exchange rate management (add/edit/delete) |
| `src/components/AppSidebar.tsx` | Add "Exchange Rates" nav item under Settings |
| `src/App.tsx` | Add route `/settings/exchange-rates` |
| `src/pages/ExpensesPage.tsx` | Add currency selector, exchange rate field, show original + converted amounts |
| `src/pages/PayrollPage.tsx` | Add country column, country subtotal rows, reporting currency totals in stat cards, currency in CSV |
| `src/pages/PayslipsPage.tsx` | Show pay currency, add reporting currency equivalent note |
| `src/data/mockData.ts` | Add sample exchange rates, update some expenses with currency fields |

### Data Structures

```text
CountryCurrencyMapping {
  country: string        // e.g., "Saudi Arabia"
  currencyCode: string   // e.g., "SAR"
}

ExchangeRate {
  id: string
  fromCurrency: string   // e.g., "USD"
  toReportingRate: number // e.g., 3.75 (1 USD = 3.75 SAR)
  lastUpdated: string    // date
}
```

### Payroll Country Subtotal Example

```text
Country: Saudi Arabia (5 employees) - Pay Currency: SAR
  Aisha Rahman    | SAR | 18,000 | ... | 15,300
  Omar Al-Faisal  | SAR | 28,000 | ... | 23,800
  ...
  Subtotal SAR:          | 136,000 | ... | 115,600

Country: UAE (1 employee) - Pay Currency: AED
  Fatima Hassan   | AED | 12,000 | ... | 10,200
  Subtotal AED:          | 12,000  | ... | 10,200

Country: Bahrain (1 employee) - Pay Currency: BHD
  Tariq Zaman     | BHD | 26,000 | ... | 22,100
  Subtotal BHD:          | 26,000  | ... | 22,100

----------------------------------------------------
Grand Total (Reporting - SAR): 196,000 | ... | 166,600
```

### Implementation Sequence
1. Data layer: types, settings data, mock data
2. Currency Settings page rebuild + Exchange Rates page (new)
3. Sidebar + routing updates
4. Expenses page currency support
5. Payroll page country subtotals + reporting currency
6. Payslips pay currency display

