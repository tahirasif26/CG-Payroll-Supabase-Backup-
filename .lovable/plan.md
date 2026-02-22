

## Access Management Module under Asset Tracking

### Overview
Create a new "Access Management" collapsible navigation group in the sidebar (separate from Asset Tracking) containing three pages: ID Cards, Door/Lock Management, and Access Control. On separation approval, all BLE access for the departing employee will be automatically revoked.

### Lockly Secure Plus Compatibility
The Lockly Secure Plus does support Bluetooth Low Energy (BLE), so it is compatible at the protocol level. The system we build will serve as the **access management layer** -- the central record of who can access which doors. Each employee gets a unique BLE UUID and QR code. In a production environment, this data would be sent to the Lockly cloud API (or any BLE lock vendor's API) to provision/revoke access. For now, the app manages authorizations internally, ready for future hardware integration.

### What Gets Built

**1. BLE Access Context** (`src/contexts/BLEAccessContext.tsx`)
- Manages doors/locks (CRUD), access grants (employee-to-door mappings), and auto-generated BLE UUIDs
- Key functions: `addDoor`, `editDoor`, `deleteDoor`, `grantAccess`, `revokeAccess`, `revokeAllForEmployee`, `getAccessForEmployee`, `getAccessForDoor`
- Data models:
  - `BLEDoor`: id, name, location, status (active/inactive)
  - `BLEAccessGrant`: id, employeeId, doorId, grantedAt, revokedAt, status (active/revoked)

**2. ID Cards Page** (`src/pages/IDCardsPage.tsx`) -- route `/id-cards`
- Grid of cards for all active employees
- Each card shows: company name, avatar/initials, name, employee ID, designation, department, joining date, BLE UUID, QR code, and list of authorized doors
- Click to open print-ready dialog; search/filter bar

**3. Access Management Page** (`src/pages/AccessManagementPage.tsx`) -- route `/access-management`
- **Doors/Locks tab**: Table with add/edit/delete for BLE lock points (name, location, status)
- **Access Control tab**: Employee-to-door authorization matrix; grant/revoke access with bulk operations; only active employees in dropdowns

**4. Utilities** (new files)
- `src/lib/bleAccess.ts` -- deterministic BLE UUID generator from employee ID (no dependencies)
- `src/lib/qrcode.ts` -- minimal SVG-based QR code renderer (no dependencies)

**5. Sidebar Changes** (`src/components/AppSidebar.tsx`)
- New collapsible group **"Access Management"** with a `Shield` icon, containing:
  - ID Cards (`/id-cards`)
  - Door & Lock Management (`/access-management`)
- Positioned after "Asset Tracking" in the sidebar

**6. Separation Integration** (`src/pages/SeparationsPage.tsx`)
- On separation approval, call `revokeAllForEmployee(employeeId)` to deactivate all BLE access
- Show an informational line in the pre-approval checklist dialog: "BLE Access: X active grants will be revoked"

**7. Routing** (`src/App.tsx`)
- Add `BLEAccessProvider` wrapper
- Add routes: `/id-cards` and `/access-management`

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/bleAccess.ts` | Deterministic BLE UUID generator |
| `src/lib/qrcode.ts` | Minimal QR code SVG renderer |
| `src/contexts/BLEAccessContext.tsx` | Doors, grants, revocation logic |
| `src/pages/IDCardsPage.tsx` | Employee ID card grid with QR and BLE UUID |
| `src/pages/AccessManagementPage.tsx` | Door CRUD + employee access control matrix |

### Files to Modify
| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add "Access Management" nav group with ID Cards and Door Management items |
| `src/App.tsx` | Add `BLEAccessProvider`, two new routes |
| `src/pages/SeparationsPage.tsx` | Call `revokeAllForEmployee` on approval; show BLE info in checklist dialog |

