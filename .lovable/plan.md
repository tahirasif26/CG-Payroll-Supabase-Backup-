

## RemotePass-Inspired Theme

Based on the RemotePass website, the new color palette will shift from the current gold/yellow theme to a clean **blue and white** design.

### Color Extraction from RemotePass

| Element | Color |
|---------|-------|
| Primary (buttons, links, accents) | Bright blue `#3B5EF5` |
| Background | Very light blue-gray `#F5F7FF` |
| Card / Surface | Pure white `#FFFFFF` |
| Dark text / Headings | Near-black `#1A1A2E` |
| Muted text | Gray `#6B7280` |
| Sidebar background | Dark navy `#1A1A2E` |
| Sidebar accent | Slightly lighter navy `#2A2A42` |
| Success | Green `#10B981` |
| Warning | Amber `#F59E0B` |
| Destructive | Red `#EF4444` |
| Info | Light blue `#3B82F6` |

### What Changes

**File: `src/index.css`**
- Update all CSS custom properties (`:root` and `.dark`) to the blue-based palette
- Replace gold/yellow primary (`52 100% 50%`) with blue (`233 90% 60%`)
- Update sidebar variables to dark navy tones
- Update accent colors from yellow to light blue
- Replace the `.gradient-ey` and `.text-gradient-ey` utilities with blue gradients
- Update chart colors to complementary blue palette

### Mapped Variables (Light Mode)

| Variable | Current (Gold) | New (Blue) |
|----------|---------------|------------|
| `--primary` | `52 100% 50%` | `233 90% 60%` |
| `--primary-foreground` | `240 10% 16%` | `0 0% 100%` |
| `--background` | `220 14% 96%` | `230 60% 98%` |
| `--foreground` | `240 10% 16%` | `240 20% 12%` |
| `--card` | `0 0% 100%` | `0 0% 100%` (unchanged) |
| `--secondary` | `240 10% 16%` | `233 80% 95%` |
| `--secondary-foreground` | `0 0% 100%` | `233 90% 40%` |
| `--accent` | `52 100% 94%` | `230 60% 96%` |
| `--ring` | `52 100% 50%` | `233 90% 60%` |
| `--sidebar-background` | `240 10% 16%` | `240 20% 12%` |
| `--sidebar-primary` | `52 100% 50%` | `233 90% 60%` |
| `--sidebar-primary-foreground` | `240 10% 16%` | `0 0% 100%` |
| `--sidebar-accent` | `240 8% 22%` | `240 15% 20%` |

### Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Update all CSS custom properties and gradient utilities |

No structural or component changes needed -- only the CSS variables and utility classes.

