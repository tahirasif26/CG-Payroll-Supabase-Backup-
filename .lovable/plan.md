

## Simplify GPS Tracking: Dedicated Page with Start-Only Flow

### What the user wants
- GPS button on Mileage page should navigate to a **new dedicated page** (`/mileage/gps`)
- That page shows **only a big "Start Trip" button** — no employee selector, no date picker, no vehicle selector
- The logged-in employee is auto-detected from `RoleContext` (`currentEmployeeId`)
- Date = today (auto), Vehicle = car (default)
- When user clicks **Start**: map appears with live GPS tracking, distance/amount calculations, and a **Stop** button
- When user clicks **Stop**: review summary with Submit button
- Employee selection is completely removed from GPS flow

### Files to Create

**`src/pages/GPSTrackingPage.tsx`**
- New full page component (not inline card)
- Uses `useRole().currentEmployeeId` to auto-set the logged-in employee
- Auto-sets date to today, vehicle to "car"
- Three phases:
  1. **Ready**: Large centered "Start Trip" button only (clean, minimal UI)
  2. **Tracking**: Full-width map (Leaflet), live distance + amount stats bar, "Stop Trip" button
  3. **Review**: Trip summary, optional notes, route map preview, Submit + Back buttons
- Uses same geolocation logic (getCurrentPosition → watchPosition)
- Calls navigate back to `/mileage` after submit

### Files to Modify

**`src/App.tsx`**
- Add route: `<Route path="/mileage/gps" element={<GPSTrackingPage />} />`

**`src/pages/MileagePage.tsx`**
- Change GPS Trip button to navigate to `/mileage/gps` using `useNavigate()`
- Remove the inline `GPSMileageTracker` component and its imports
- Keep Manual Entry button as-is

### Files to Remove (no longer needed)
- `src/components/expenses/GPSMileageTracker.tsx` — logic moves into `GPSTrackingPage`

