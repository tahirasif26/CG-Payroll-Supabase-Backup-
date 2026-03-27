

## Fix: Policy Form File Upload Overlapping All Fields

### Problem

The hidden file `<input>` on line 260-269 uses `position: absolute; inset: 0` to overlay the upload drop zone, but its parent `<div>` (line 256) does not have `position: relative`. This causes the invisible file input to cover the entire dialog, so clicking anywhere (title field, description, etc.) triggers the file picker.

### Fix

**File**: `src/pages/settings/CompanyPoliciesPage.tsx`

Add `relative` to the upload zone's parent `<div>` class on line 256:

```
// Before
<div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">

// After
<div className="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
```

Also remove the redundant inline `style` prop on line 268 since the class already handles positioning.

This is a one-line className change — the file input will then only overlay its intended drop zone area.

