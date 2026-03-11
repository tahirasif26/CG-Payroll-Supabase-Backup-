

## Plan: Separate Asset Tracking into Sidebar Sub-Navigation

### What Changes

Currently all 4 sections (Inventory, Categories, Store, Requests) live as `<Tabs>` inside a single `AssetsPage.tsx`. The user wants them as **separate sidebar nav items** under the "Asset Tracking" collapsible group, each loading its own route/page — matching how Payroll, Expense Tracking, etc. work.

### Approach

**1. Update Sidebar Navigation** (`src/components/AppSidebar.tsx`)

Change `assetTrackingNav` from one item to four:
- Asset Inventory → `/assets/inventory`
- Asset Categories → `/assets/categories`
- Asset Store → `/assets/store`
- Asset Requests → `/assets/requests`

**2. Create 4 Separate Page Components**

Extract the content of each `TabsContent` from the current `AssetsPage.tsx` into its own page file:
- `src/pages/assets/AssetInventoryPage.tsx` — existing inventory table + dialogs
- `src/pages/assets/AssetCategoriesPage.tsx` — categories CRUD table
- `src/pages/assets/AssetStorePage.tsx` — card grid (employee) / list (admin) + store dialogs
- `src/pages/assets/AssetRequestsPage.tsx` — requests table + request dialog

Each page will:
- Have its own `PageHeader`
- Pull from the shared `AssetContext` (no context changes needed)
- Contain only the state and dialogs relevant to that section

**3. Update Routes** (`src/App.tsx`)

Replace the single `/assets` route with:
```
/assets/inventory → AssetInventoryPage
/assets/categories → AssetCategoriesPage
/assets/store → AssetStorePage
/assets/requests → AssetRequestsPage
```

**4. Delete old `AssetsPage.tsx`** (or redirect `/assets` to `/assets/inventory`)

**5. Role-based visibility**
- Sidebar: Employee sees only "Asset Store" and "Asset Requests" 
- Or keep all visible but guard content inside pages (simpler — matches current pattern where role checks happen inside pages)

### Files to Modify
- `src/components/AppSidebar.tsx` — expand `assetTrackingNav` to 4 items
- `src/App.tsx` — add 4 new routes, remove old `/assets` route

### Files to Create
- `src/pages/assets/AssetInventoryPage.tsx`
- `src/pages/assets/AssetCategoriesPage.tsx`
- `src/pages/assets/AssetStorePage.tsx`
- `src/pages/assets/AssetRequestsPage.tsx`

### Files to Remove
- `src/pages/AssetsPage.tsx` (replaced by the 4 new pages)

### No Changes Needed
- `src/contexts/AssetContext.tsx` — shared context stays as-is
- `src/types/hcm.ts` — no type changes

