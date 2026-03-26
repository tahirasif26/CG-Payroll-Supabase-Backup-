

## Document Expiry Tracking Feature

### Overview

Add document expiry date tracking to the employee documents module with status indicators, automated reminder settings, and document re-upload/versioning support.

### Technical Details

**1. Update Document Data Model** (`src/pages/EmployeesPage.tsx`)

Extend the `EmployeeDoc` interface:
- `expiryDate?: string` -- optional expiry date
- `status: "active" | "expiring-soon" | "expired" | "no-expiry"` -- computed from expiry date
- `version: number` -- document version tracking
- `previousVersions?: { name: string; uploadedDate: string; expiryDate?: string }[]` -- version history

Update `employeeDocs` mock data to include expiry dates for some documents (e.g., National ID expires 2025-06-01, Employment Contract no expiry).

**2. Add Expiry Status Computation**

Create a helper function that computes status based on current date and a configurable "expiring soon" threshold (default 30 days):
- No expiry date -> `no-expiry`
- Past expiry -> `expired`
- Within threshold -> `expiring-soon`
- Otherwise -> `active`

**3. Update StatusBadge** (`src/components/StatusBadge.tsx`)

Add two new variants:
- `expiring-soon` -- warning style (yellow/amber)
- `no-expiry` -- muted/neutral style

**4. Enhance DocumentsTab Component**

- Display expiry date next to each document (or "No expiry" if not set)
- Show a colored `StatusBadge` for expiry status on each document row
- Highlight expired documents with a subtle red background
- Add a "Re-upload" button on each document row that opens the upload dialog pre-filled with document name/type, incrementing the version
- Add a "Version History" expandable section per document showing previous versions

**5. Update Upload Dialog**

Add to the existing upload dialog form:
- Optional "Expiry Date" field using the Shadcn date picker (Popover + Calendar)
- When re-uploading, pre-fill document name and type, show "Updating version X to X+1"

**6. Create Document Expiry Reminder Settings**

Add a small settings card within the DocumentsTab (or as a collapsible section at the top):
- "Reminder Days Before Expiry" -- numeric input (default 30)
- "Auto-remind" toggle with frequency options: Every 7 / 15 / 30 days
- Store settings in component state (mock -- no backend)

**7. Document State Management**

Move `employeeDocs` from a static const to a `useState` so uploads, re-uploads, and expiry updates are reflected in the UI. The upload handler will push new documents (or new versions) into this state.

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/EmployeesPage.tsx` | Extend `EmployeeDoc`, convert docs to state, update `DocumentsTab`, enhance upload dialog with expiry date picker and re-upload flow, add reminder settings UI |
| `src/components/StatusBadge.tsx` | Add `expiring-soon` and `no-expiry` status variants |

### UI Layout

```text
Documents Tab
+--------------------------------------------------+
| [Settings icon] Reminder Settings (collapsible)  |
|   Remind __ days before expiry  [Auto] [30 days] |
+--------------------------------------------------+
| Documents                          [Upload]       |
+--------------------------------------------------+
| [icon] National ID                                |
|        Identity · 2021-03-15 · Exp: 2025-06-01   |
|        [Expiring Soon badge]  [Re-upload] [View]  |
|        > Version History (v2)                     |
|--------------------------------------------------| 
| [icon] Employment Contract                        |
|        Contract · 2021-03-15 · No Expiry          |
|        [No Expiry badge]      [Re-upload] [View]  |
+--------------------------------------------------+
```

