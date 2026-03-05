

## Restructure Mileage Page: Separate GPS and Manual Entry

### What the user wants
Instead of a single "New Mileage" button that opens a dialog with GPS/Manual tabs, the user wants:
1. **GPS Mode** as a button on the Mileage page itself -- clicking "Start" shows the map, live tracking, stop button, and calculations directly on the page (not in a dialog)
2. **Manual Entry** as a separate button that opens the existing dialog (manual fields only)

### Changes

**1. `src/pages/MileagePage.tsx`**
- Replace single "New Mileage" button with two buttons: "GPS Trip" and "Manual Entry"
- Add inline GPS tracking section that appears on the page when user clicks "GPS Trip":
  - Initially shows a "Start Trip" button with employee/vehicle/date selectors
  - On start: shows Leaflet map, live distance/amount stats, and "Stop Trip" button
  - On stop: shows review summary with Submit button
  - All rendered inline on the page, not in a dialog
- "Manual Entry" button opens `MileageEntryDialog` in manual-only mode

**2. `src/components/expenses/MileageEntryDialog.tsx`**
- Remove the GPS tab entirely -- this dialog becomes manual-entry only
- Remove Tabs component, keep only the manual entry fields
- Remove all GPS/map-related code and imports from this component

**3. New component: `src/components/expenses/GPSMileageTracker.tsx`**
- Self-contained inline component for the GPS workflow
- States: `idle` → `setup` (pick employee/vehicle/date) → `tracking` (map + live stats) → `review` (summary + submit)
- Contains the Leaflet map, geolocation logic (with `getCurrentPosition` first, then `watchPosition`), Haversine calculation
- Calls `onSubmit` callback and `onClose` to hide itself when done

### Files to Create
- `src/components/expenses/GPSMileageTracker.tsx`

### Files to Modify
- `src/pages/MileagePage.tsx` -- add GPS button, inline GPS tracker, change "New Mileage" to "Manual Entry"
- `src/components/expenses/MileageEntryDialog.tsx` -- strip GPS code, manual-only

