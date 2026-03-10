

## Plan: Asset Tracking Module — Categories, Store, and Requests

### Overview

Transform the current single-view `AssetsPage.tsx` into a tabbed interface with three tabs: **Asset Categories**, **Asset Store**, and **Asset Requests**. The existing asset inventory table (assign/reassign/history) becomes a fourth implicit tab or stays as "Asset Inventory" to preserve current functionality.

### Architecture

**New Types** (add to `src/types/hcm.ts`):
- `AssetCategory` — id, name, description, status, createdDate
- `AssetStoreItem` — id, name, categoryId, brand, model, description, image, status, sku, estimatedCost, warrantyPeriod, specifications, publishToStore, createdDate
- `AssetRequest` — id, employeeId, employeeName, storeItemId, storeItemName, category, requestDate, reason, priority, status

**New Context** — expand `AssetContext.tsx` to include:
- `categories[]` with CRUD + delete guard (no delete if assets linked)
- `storeItems[]` with CRUD + delete guard (no delete if requested/assigned)
- `assetRequests[]` with create + approve/reject
- `getEmployeeRequests(employeeId)` for employee view
- Helper: `getStoreItemsForDisplay()` — only items with `publishToStore === true` and `status === "active"`

**Restructure `AssetsPage.tsx`**:
- Add Tabs component with 4 tabs:
  1. **Asset Inventory** — existing table (assign, reassign, history, CRUD) — admin only
  2. **Asset Categories** — admin-only category CRUD table
  3. **Asset Store** — card-based catalog; admin sees list+add; employee sees store cards with Request button
  4. **Asset Requests** — admin sees all requests with approve/reject; employee sees their own requests

### Tab Details

**Tab 1 — Asset Inventory** (existing functionality, moved into a tab)
- Keep current code as-is inside a `TabsContent`
- Update the "Add Asset" dialog to include:
  - New fields: Brand, Model, Description, Image upload (as URL input or placeholder)
  - "Publish to Store" radio: None (default) / Publish to Store
  - If "Publish to Store" selected: image + description become required
  - On save, creates both an inventory `Asset` and an `AssetStoreItem`

**Tab 2 — Asset Categories** (admin only)
- Table: Category Name, Description, Status (Active/Inactive badge), Created Date, Actions (Edit/Delete)
- Add/Edit via Dialog with fields: name, description, status
- Delete guard: if any store items or assets use the category, show warning and block

**Tab 3 — Asset Store**
- **Admin view**: Table listing all store items + "Add Asset to Store" button with full form (name, category dropdown, brand, model, description, image URL, status, optional SKU/cost/warranty/specs)
- **Employee view**: Card grid (responsive: 1/2/3-4 cols) showing only published+active items. Each card: image placeholder, name, category, brand, model, description, "Request" button. NO quantity/stock/availability shown.
- Search bar + category/brand filters at top

**Tab 4 — Asset Requests**
- **Admin view**: Table with Employee Name, Asset Name, Category, Request Date, Reason, Priority, Status + Approve/Reject buttons for pending requests
- **Employee view**: Same table filtered to their own requests (read-only status)
- Request modal (triggered from Store card): auto-fills asset name, category, employee name, date; requires reason; optional priority (Low/Medium/High)

### Files to Create
- None (all logic goes into expanded context and page)

### Files to Modify
- `src/types/hcm.ts` — add `AssetCategory`, `AssetStoreItem`, `AssetRequest` interfaces
- `src/contexts/AssetContext.tsx` — add categories, store items, requests state + CRUD methods
- `src/pages/AssetsPage.tsx` — full rewrite with 4 tabs
- `src/components/AppSidebar.tsx` — no change needed (already points to `/assets`)

### Mock Data
- Seed 5-7 categories (Laptops, Keyboards, Monitors, Mobile Phones, Printers, Tablets, Accessories)
- Seed 5-6 store items (HP Core i7, Dell XPS, MacBook Pro 14, Dell 27 Monitor, Logitech K380)
- Seed 2-3 sample requests

### Role-Based Visibility
- **Employer**: All 4 tabs visible, full CRUD on categories/store, approve/reject requests
- **Employee**: Sees "Asset Store" and "Asset Requests" tabs only (plus "My Assets" from inventory). Store shows card grid with Request buttons. Requests tab shows only their submissions.

