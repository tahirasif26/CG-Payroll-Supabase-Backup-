## Plan: Bulk Asset Creation and Asset Lifecycle Enhancements

### Overview

Add bulk asset creation to Asset Inventory, expand asset statuses to include "retired", and ensure the assignment workflow aligns with the request approval flow. The Asset Store remains catalog-only with no inventory/stock tracking.

### 1. Type Changes (`src/types/hcm.ts`)

- **Asset.status**: Add `"retired"` to the union type: `"assigned" | "available" | "maintenance" | "retired"`
- **Asset**: Add optional `returnDate?: string | null` field for assignment tracking

### 2. Asset Inventory Page (`src/pages/assets/AssetInventoryPage.tsx`)

**Bulk Add Assets Modal** — new dialog triggered by a "Bulk Add Assets" button next to existing "Add Asset":

- **Fields**:
  - Category (dropdown from active categories)
  - Asset Model (dropdown filtered from Asset Store items matching selected category)
  - Quantity (number input, min 1.
  - Serial Number Generation: radio toggle between Auto Generate and Manual Import
- **Auto Generate**:
  - Serial Prefix (text input)
  - Starting Number (number input)
  - Preview panel showing generated serial numbers (scrollable list, e.g. LAP001...LAP200)
  - "Generate Preview" button to populate the list before saving
- **Manual Import**:
  - File input accepting `.csv` and `.xlsx` files
  - Uses existing `xlsx` package (already installed) to parse uploaded file
  - Expects a "Serial Number" column
  - Preview parsed serial numbers in same scrollable list
- **On Save**: Creates N individual `Asset` records in context, each with unique serial number, all status "available", name/category from the selected store model

**Status filter update**: Add "Retired" option to the status filter dropdown

**Assignment enhancements**: Update the reassign dialog to include optional "Return Date" field

### 3. Context Updates (`src/contexts/AssetContext.tsx`)

- `**bulkAddAssets(assets: Asset[])**`: New method to batch-insert multiple assets and log a single "created" history entry per asset
- No stock/quantity tracking — each asset is an independent record

### 4. StatusBadge (`src/components/StatusBadge.tsx`)

- Add `retired` style: `"bg-muted text-muted-foreground"` (same as inactive)

### 5. Asset Requests Page

- No changes needed — already has Pending/Approved/Rejected workflow with approve/reject buttons for admins

### Files to Modify


| File                                      | Change                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/types/hcm.ts`                        | Add `"retired"` to Asset status, add `returnDate` field                                      |
| `src/contexts/AssetContext.tsx`           | Add `bulkAddAssets` method                                                                   |
| `src/pages/assets/AssetInventoryPage.tsx` | Add Bulk Add dialog with auto-generate + CSV import, serial preview, return date in reassign |
| `src/components/StatusBadge.tsx`          | Add `retired` variant                                                                        |


### No Changes To

- Asset Store page (catalog only, no stock)
- Asset Categories page
- Asset Requests page (workflow already exists)