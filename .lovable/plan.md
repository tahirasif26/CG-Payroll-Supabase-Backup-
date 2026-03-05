

## Mileage Expense Tracking Feature

This feature adds a dedicated Mileage page under Expense Tracking with GPS-based trip recording (live map), manual entry, automatic reimbursement calculation, and mileage settings.

### Map Library Choice

Since Google Maps requires an API key, this will use **Leaflet + OpenStreetMap** (free, no API key). The `leaflet` and `react-leaflet` packages will be installed. This gives a fully interactive map with marker tracking and polyline drawing at zero cost.

### Changes Overview

**1. Sidebar & Routing**
- Add "Mileage" to `expenseTrackingNav` in `AppSidebar.tsx` with a `Navigation` (or `MapPin`) icon, URL `/mileage`
- Add route `/mileage` → `MileagePage` in `App.tsx`

**2. New Page: `src/pages/MileagePage.tsx`**
- Page header "Mileage Tracking" with a "New Mileage" button
- Table listing past mileage claims (date, distance, rate, amount, status, actions)
- Uses the same approval/status flow as regular expenses
- Mock data for a few sample mileage entries

**3. New Component: `src/components/expenses/MileageEntryDialog.tsx`**
- Modal with two tabs: **GPS Mode** and **Manual Entry**

**GPS Mode tab:**
- "Start Trip" button that requests browser geolocation permission
- Once started, renders a Leaflet map (roughly half the dialog) showing:
  - Car/vehicle marker at current position (custom icon)
  - Polyline drawn as coordinates accumulate
  - Live distance counter (calculated using Haversine formula between consecutive points)
  - Live calculated amount (distance × per-km rate)
- Uses `navigator.geolocation.watchPosition()` for real-time tracking
- "Stop Trip" button finalizes the route, transitions to the review step

**Manual Entry tab:**
- Distance (km) input with live amount calculation
- Optional "From" and "To" address text fields
- Notes textarea

**Common fields (both modes):**
- Date (defaults to today)
- Category (pre-set to "Mileage", read-only)
- Vehicle type dropdown (Car, Motorcycle, Bicycle — optional)
- Notes textarea
- Attachment upload (odometer photo, map screenshot)

**Review step (after Stop Trip or manual submit):**
- Summary card: date, distance, rate, total amount, map snapshot (for GPS mode), notes
- All fields editable except auto-calculated amount
- Submit button adds the entry as a mileage expense

**4. Mileage Settings: `src/components/expenses/MileageSettings.tsx`**
- Added as a new tab in the Expense Categories settings page (or as a section)
- Fields: Default per-km rate (e.g., 5 SAR/km), rates by vehicle type, daily distance cap, toggle for requiring GPS
- Stored in local state (same pattern as other settings)

**5. Data & Types**
- Add `MileageEntry` interface to `src/types/hcm.ts`:
  ```
  interface MileageEntry {
    id, employeeId, employeeName, date, distance (km),
    rate, amount, vehicleType, fromAddress, toAddress,
    routeCoordinates (lat/lng array), notes, status,
    attachments
  }
  ```
- Add mock mileage data in `src/data/mockData.ts`
- Add mileage settings defaults in `src/data/settingsData.ts`

**6. Mileage Analytics**
- Add a "Mileage" filter option in the Expense Analytics page
- Include total distance, total amount, and average distance per trip as summary cards when mileage filter is active

**7. Notifications**
- Toast notifications for: successful submission, policy cap exceeded (if distance > daily cap), approval/rejection
- Warning toast if trip exceeds 2 hours without stopping (simple timer check)

### Dependencies
- `leaflet` and `react-leaflet` — free map rendering with OpenStreetMap tiles
- Leaflet CSS imported globally

### Files to Create
- `src/pages/MileagePage.tsx`
- `src/components/expenses/MileageEntryDialog.tsx`
- `src/components/expenses/MileageSettings.tsx`

### Files to Modify
- `src/components/AppSidebar.tsx` — add Mileage nav item
- `src/App.tsx` — add /mileage route
- `src/types/hcm.ts` — add MileageEntry type
- `src/data/mockData.ts` — add mock mileage data
- `src/data/settingsData.ts` — add mileage rate settings
- `src/pages/settings/ExpenseCategoriesPage.tsx` — add Mileage Settings tab
- `src/components/expenses/ExpenseAnalytics.tsx` — add mileage filter/metrics

