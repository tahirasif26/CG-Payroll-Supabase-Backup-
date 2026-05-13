# Unified Request & Approval Workflow

Overhaul Expenses, Advances, Loans, Leave, and Asset Requests to share one approval engine, Me/People views, hierarchy-aware visibility, and a strict authorization model where creators never see approve/reject buttons unless they are real approvers.

## 1. Database (single migration)

New normalized tables (multi-tenant, realtime-enabled):

- `request_approvals` — one row per request as it enters the workflow
  - `id, client_id, module ('expense'|'advance'|'loan'|'leave'|'asset'), entity_id, requester_employee_id, current_level, current_group_id, status ('pending'|'approved'|'rejected'|'paid'|'unpaid'|'delivered'), policy_id, value_amount, value_unit, created_at, updated_at`
- `request_approval_history` — append-only timeline
  - `id, request_approval_id, level_order, action ('submitted'|'approved'|'rejected'|'delegated'|'escalated'|'paid'|'delivered'|'reassigned'), actor_employee_id, actor_user_id, on_behalf_of_employee_id, group_id, comment, created_at`
- `request_assignments` — current pending assignees (resolved through delegation)
  - `id, request_approval_id, level_order, group_id, employee_id, status ('pending'|'acted'|'skipped'), acted_at`
- `payroll_payment_status` — link approved financial requests to payroll
  - `id, client_id, request_approval_id, module, payroll_run_id, paid_at, paid_by, amount`

Helper SQL:
- `fn_start_request_workflow(_module, _entity_id, _client_id, _requester_emp, _value)` → resolves policy + first level (uses existing `resolve_approval_group`/policy_levels), creates `request_approvals` + initial `request_assignments` + history row.
- `fn_act_on_request(_request_approval_id, _action, _comment)` → validates the caller is in `request_assignments` (or admin/super_admin), advances level or finalizes status, writes history, expands delegation chain via existing `get_active_approvers`.
- `fn_can_act_on_request(_user_id, _request_approval_id) returns boolean` (security definer) — used by RLS + UI.
- View `v_my_pending_approvals` for fast inbox queries.

RLS:
- Requester sees own row (`requester_employee_id` mapped to user).
- Admin/HR in client sees all.
- Approvers see rows where `fn_can_act_on_request(auth.uid(), id)` is true.
- Hierarchy/People view uses existing `is_admin_or_hr_in_client` + manager chain (already in `useActiveEmployees` patterns).

Realtime: add all four tables to `supabase_realtime`.

## 2. Backend orchestration (`src/lib/workflow/`)

- `startWorkflow({ module, entityId, value, requesterEmployeeId })` — calls `fn_start_request_workflow`, then notifies current assignees (reuses `routeApprovalRequest` notification logic, but driven from assignments table).
- `actOnRequest({ requestApprovalId, action, comment })` — RPC to `fn_act_on_request`; on terminal state, updates the source row (`expenses.status`, etc.) and, for financial modules approved, creates `payroll_payment_status` stub with `paid=false`.
- `markPaid({ requestApprovalId, payrollRunId })` — used by Payroll to mark Paid/Unpaid.
- Refactor `useCreateExpense / useCreateLeaveRequest / useCreateAdvance / useCreateLoan / asset request create` to call `startWorkflow` instead of the ad-hoc `routeApprovalRequest`.

Status vocabularies enforced server-side:
- expense/advance/loan: `pending → approved|rejected → paid|unpaid`
- leave: `pending → approved|rejected`
- asset: `pending → approved|rejected → delivered`

## 3. Authorization fix (creator must not see Approve/Reject)

New hook `useCanActOnRequest(requestApprovalId)` → checks `request_assignments` membership for current employee (admin/super_admin always true). Replaces the broad `useCanApprove(category)` checks on per-row action buttons in:
- `ExpensesPage`, `AdvancesPage`, `LoansPage`, `LeavePage`, `AssetRequestsPage`.

Action buttons render only when `canAct && row.status === 'pending' && requesterEmployeeId !== currentEmployeeId`. The category-level `useCanApprove` is still used to show the "People/Inbox" tab, but never to authorize a specific row.

## 4. Frontend: Me / People tabs & timeline

New shared component `src/components/requests/RequestListShell.tsx`:
- Header tabs: **Me** (always) | **People** (only if `useCanApprove(category)` or admin/HR or has hierarchy reports).
- Hierarchy filter (All my reports / Direct reports / Department) when in People.
- Row actions resolved through `useCanActOnRequest`.
- "Requested To" cell: current group/assignee names from `request_assignments` join.
- Side `ApprovalTimelineDrawer` showing `request_approval_history` with avatars, timestamps, comments, delegation/escalation badges, current step indicator.

Apply to: Expenses, Advances, Loans, Leave, Asset Requests pages. Each page keeps its module-specific columns; the shell handles tabs, visibility, actions, and drawer.

Status badges extended: add `paid`, `unpaid`, `delivered` variants in `StatusBadge`.

## 5. Payroll integration

In `PayrollPage` payroll-run detail:
- Pull approved-but-unpaid financial requests via `payroll_payment_status` where `paid_at IS NULL`.
- Allow including in run; on run approval, mark `paid_at`, write history `action='paid'`, and update the source row's status to `paid`.
- Manual "Mark Unpaid" available to admins.

## 6. Realtime sync

Single `useRequestsRealtime(clientId)` hook subscribes to `request_approvals`, `request_assignments`, `request_approval_history`, and the underlying module tables; invalidates the relevant React Query keys so Me/People views, timelines, and dashboards update instantly.

## 7. Files touched

New:
- `supabase/migrations/<ts>_request_workflow.sql`
- `src/lib/workflow/index.ts`, `src/lib/workflow/types.ts`
- `src/hooks/queries/useRequestWorkflow.ts`, `src/hooks/useCanActOnRequest.ts`, `src/hooks/useRequestsRealtime.ts`
- `src/components/requests/RequestListShell.tsx`, `src/components/requests/ApprovalTimelineDrawer.tsx`, `src/components/requests/RequestedToCell.tsx`

Edited:
- `src/hooks/queries/useExpenses.ts`, `useAdvances.ts`, `useLoans.ts`, `useLeave.ts`, asset request hook
- `src/pages/ExpensesPage.tsx`, `AdvancesPage.tsx`, `LoansPage.tsx`, `LeavePage.tsx`, `assets/AssetRequestsPage.tsx`
- `src/components/StatusBadge.tsx` (new variants)
- `src/pages/PayrollPage.tsx` (payment linkage UI)
- `src/lib/approvalRouting.ts` (delegate to new engine)

## Out of scope for this pass
- Visual redesign of dashboards beyond the shell + drawer.
- Mobile push notifications (in-app notifications already handled via existing `notify` lib).
- Migrating historical rows (existing requests stay as-is; new requests use the engine).
