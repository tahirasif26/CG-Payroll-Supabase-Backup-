

# Digital Birthday & Anniversary Cards

## Overview
Add a **Digital Cards** feature to the Birthdays & Anniversaries page that lets employers enable auto-scheduled digital greeting cards for employees. Cards will feature rotating yearly designs, preview capability, and a per-employee enable/disable toggle. Since there's no backend/email service connected, we'll build the full UI with card design previews and scheduling configuration, with email sending shown as a simulated action.

## What Gets Built

### 1. Card Design Templates
- Create 8-10 card design templates (4-5 birthday, 4-5 anniversary) using pure CSS/HTML with gradients, patterns, and decorative elements
- Each template has a unique theme (confetti, elegant gold, modern geometric, floral, minimalist, etc.)
- Templates rotate by year automatically -- the system picks a different design each year so employees never get the same card twice
- Cards display: employee first name, occasion (birthday/anniversary), years of service (for anniversaries), company name, and a warm message

### 2. Card Settings Panel
- A new **"Digital Cards"** tab or section on the Birthdays page
- Global toggle: **Enable Auto-Send Digital Cards** (master on/off switch)
- Separate toggles for Birthday cards and Anniversary cards
- Custom sender name and message fields
- Preview button to see all available card designs in a gallery modal

### 3. Per-Employee Card Scheduling
- Add a new column to the birthdays table: **"Card"** with a switch toggle per employee
- When enabled, shows a small badge like "Birthday card scheduled" or "Anniversary card scheduled"
- Bulk enable/disable option via a "Select All" checkbox

### 4. Card Preview & Gallery
- A modal/dialog showing all card templates in a responsive grid
- Click any card to see it full-size with sample data filled in
- Each card shows which year it would be used (2025, 2026, etc.)
- A **"Send Preview"** button that simulates sending (shows a toast notification)

### 5. Card History Log
- Simple table showing previously "sent" cards with: employee name, occasion, date sent, design used, and status

## Technical Details

### New Files
- **`src/components/cards/CardTemplates.tsx`** -- 8-10 React components rendering unique card designs using CSS gradients, SVG decorations, and Tailwind styling. Each exports a component that accepts `{ name, occasion, yearsOfService, companyName, year }` props.
- **`src/components/cards/CardGallery.tsx`** -- Dialog component displaying all templates in a grid with preview capability.
- **`src/components/cards/CardSettingsPanel.tsx`** -- Settings UI with global toggles, custom message fields, and the gallery trigger.
- **`src/contexts/CardContext.tsx`** -- Context managing card settings state (enabled/disabled per employee, global settings, card history log).

### Modified Files
- **`src/pages/BirthdaysPage.tsx`** -- Add a Tabs wrapper with "Overview" (existing table) and "Digital Cards" (new settings + per-employee toggles). Add card toggle column to the existing table.
- **`src/components/AppSidebar.tsx`** -- No changes needed (already navigates to `/birthdays`).
- **`src/App.tsx`** -- Wrap with `CardProvider`.

### Design Rotation Logic
```text
templateIndex = (currentYear + employeeIdHash) % totalTemplates
```
This ensures each employee gets a different card each year, and different employees get different cards in the same year.

### Card Template Styles (examples)
1. **Confetti Burst** -- Vibrant gradient background with CSS confetti dots
2. **Elegant Gold** -- Dark background with gold accent borders and serif typography
3. **Modern Geometric** -- Clean lines with geometric SVG patterns
4. **Warm Sunset** -- Orange-pink gradient with soft curves
5. **Nature Garden** -- Green tones with leaf/floral SVG accents
6. **Ocean Breeze** -- Blue gradient with wave patterns
7. **Starlight** -- Dark navy with star/sparkle decorations
8. **Minimalist** -- White card with single accent color and clean typography
