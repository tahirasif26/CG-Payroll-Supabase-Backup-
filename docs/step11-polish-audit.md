# STEP 11 — Polish & Consistency Audit

_Read-only audit. No code changed. Use this to prioritize a follow-up implementation pass._

---

## Executive summary

| Area | Status | Effort |
|---|---|---|
| Primitives (PageHeader, StatusBadge, StatCard) | ✅ Exist, used widely | — |
| EmptyState | ❌ Inlined ~17 places, no shared component | S |
| ConfirmDialog | ❌ No shared wrapper (uses raw AlertDialog) | S |
| LoadingSkeleton | ⚠️ `skeleton.tsx` exists, no page-level presets | S |
| DataTable wrapper | ❌ Each page hand-rolls Table + filters + empty state | M |
| Design tokens file | ❌ No `src/lib/design-tokens.ts`; tokens live in `index.css` (acceptable) | XS |
| Typography consistency | ⚠️ Mixed `font-bold` vs `font-semibold` for h1; mostly OK | S |
| Spacing | ✅ Mostly on the 4/8/12/16/24 rhythm | — |
| Color discipline | ✅ Semantic tokens used (`bg-success/15`, `text-warning`) | — |
| Icons | ✅ Lucide everywhere, sizes consistent | — |
| Forms | ⚠️ Mix of react-hook-form + ad-hoc useState forms | M |
| Micro-interactions | ⚠️ Hover/focus states inconsistent across custom buttons | S |
| Dark mode | ⚠️ Theme toggle exists; not audited page-by-page | M |
| Mobile | ⚠️ Tables don't collapse to cards on narrow screens | M |
| Accessibility | ⚠️ Icon-only buttons missing aria-labels in several places | S |
| Error boundaries | ⚠️ Only `ChunkErrorBoundary` (4 usages); no per-route boundary | S |
| Toast position | ⚠️ Sonner uses default; no explicit position config | XS |
| Favicon / meta | ⚠️ Default Lovable favicon, generic `<title>` | XS |

---

## Tier 1 — Must-do (highest ROI, lowest risk)

### 1. `src/components/EmptyState.tsx` (NEW)
17 inlined empty-state blocks found across pages. All use the same pattern:
`text-center py-8/12/16 text-muted-foreground`. Centralize:

```tsx
<EmptyState icon={Users} title="No employees yet" description="..." action={<Button>+ Add</Button>} />
```

**Pages to migrate after creation:**
- `EmployeesPage.tsx` (3 occurrences)
- `PayrollPage.tsx`, `PayslipsPage.tsx`, `PayrollSetupPage.tsx`
- `LeavePage.tsx`, `SeparationsPage.tsx`
- `ProjectsPage.tsx` (2), `TimesheetsPage.tsx`, `IDCardsPage.tsx`
- `CostAllocationPage.tsx`, `ClientManagementPage.tsx` (already has local one)
- `dashboards/EmployeeDashboard.tsx` (3), `dashboards/SuperAdminDashboard.tsx`
- `performance/*` (3 pages)
- `settings/FeatureAccessPage.tsx`

### 2. `src/components/ConfirmDialog.tsx` (NEW)
Several pages use `AlertDialog` directly with copy-pasted `<AlertDialogHeader/Footer>`. Wrap once.

### 3. `src/components/LoadingSkeleton.tsx` (NEW)
Add presets: `<LoadingSkeleton type="table" rows={8} />`, `type="cards"`, `type="detail"`.
Build on top of existing `ui/skeleton.tsx`. Replace `"Loading…"` text in `CostAllocationPage`, etc.

### 4. PageHeader: minor unification
Current `PageHeader` uses `text-2xl font-bold`. Spec calls for `font-semibold`. Decide one and stop having pages render their own `<h1 className="text-2xl font-bold">…</h1>`. Search `text-2xl font-bold` across pages → migrate to `<PageHeader />`.

### 5. Sonner toast position
`src/components/ui/sonner.tsx` doesn't set `position`. Add `position="top-right"` and `richColors`. One-line change, app-wide consistency.

---

## Tier 2 — Should-do

### 6. Per-route ErrorBoundary
Only `ChunkErrorBoundary` exists. Wrap each lazy route in `<Suspense>` + `<ErrorBoundary fallback={<PageErrorFallback />}>` so a crash in PayrollPage doesn't whitescreen the whole app.

### 7. StatusBadge expansion
Already supports 22 variants. Two gaps:
- No `withDot` prop (spec asks for optional dot)
- No support for free-text label (it `capitalize`s the status key — bad for "On Leave" → renders "on leave")

### 8. StatCard ↔ MetricCard alignment
`StatCard` exists. Spec calls it `MetricCard` with an `icon` prop visible on the card. Current `StatCard` accepts `icon` but **never renders it** (line 30-44 of StatCard.tsx). Bug.

### 9. Typography sweep
Inconsistencies found:
- `text-2xl font-bold` (PageHeader, ClientMgmt empty state) vs `font-semibold` (spec)
- Card titles: mix of `text-base font-medium`, `text-sm font-semibold`, `text-lg font-semibold`
Pick one set, document in `docs/design-system.md`, sweep.

### 10. Forms
~30 forms use react-hook-form + zod (good). A handful use raw `useState` (e.g. some inline filter forms). Not a bug, but inconsistent error handling. Catalog before refactoring.

---

## Tier 3 — Nice-to-do

### 11. DataTable wrapper
High value but high risk. Tables differ enough (column actions, row expansion, bulk select on some) that a single wrapper would either be too rigid or too configurable. Recommend: do per-feature shared columns (e.g. `EmployeeRowActions`) instead of one mega-DataTable.

### 12. Design tokens file
`src/lib/design-tokens.ts` per spec — but `index.css` already holds HSL tokens and Tailwind reads them. A TS file would duplicate truth. **Skip unless you need tokens in JS (charts).**

### 13. Mobile responsive sweep
Tables overflow horizontally on 375px. Convert to card stack at `md:` breakpoint for: Employees, Payroll runs, Expenses, Assets, Leave. Significant work — schedule separately.

### 14. Dark mode page-by-page
Toggle works (`useThemeInit`). Spot-check needed for: chart colors, status badges (currently `/15` opacity reads OK both modes), hardcoded `bg-white` (search needed).

### 15. Accessibility
- Icon-only buttons in `Sidebar.tsx`, `TopBar.tsx`, table row actions need `aria-label`
- Run Lighthouse a11y audit (target ≥95)

### 16. Favicon + meta tags
`index.html` likely has default Lovable favicon. User has not provided a brand asset — **ask before changing**.

---

## Anti-patterns found (one-liners)

- `console.log` count: **1** (clean ✅)
- `TODO/FIXME` count: **4** (acceptable, low)
- Random spacing values (`p-3`, `p-7`, `mb-5`): a few in performance pages
- Emoji in UI strings: `↑` `↓` in `StatCard.tsx` line 39 → replace with Lucide `ArrowUp`/`ArrowDown`

---

## Recommended order of execution

If/when you decide to act:

1. **One PR**: Build `EmptyState`, `ConfirmDialog`, `LoadingSkeleton`, fix Sonner position, fix StatCard icon bug, fix StatCard `↑↓` arrows. ~1 hour. Zero risk.
2. **One PR**: Migrate the 17 inline empty-states to `<EmptyState>`. Pure search-replace. ~1 hour.
3. **One PR**: Per-route `ErrorBoundary`. ~30 min.
4. **One PR per module** (matches your Step 10 cadence): typography + spacing + mobile sweep for that module.
5. **Defer**: DataTable wrapper, design-tokens.ts file, full dark-mode audit until post-launch.

---

## Subjective consistency score

**Current: 7/10.** Solid foundation, semantic tokens in place, primitives mostly exist. Held back by:
- Inlined empty states everywhere (-1)
- StatCard icon bug + arrow emoji (-0.5)
- No per-route error boundary (-0.5)
- Mobile tables (-1)

**After Tier 1 fixes: realistic 8.5/10.**
