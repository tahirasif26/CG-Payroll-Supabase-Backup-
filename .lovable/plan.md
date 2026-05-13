## Approval Matrix Management — Complete Overhaul

A scalable, multi-tenant approval system with dynamic module-based policies, delegation, and RBAC.

### 1. Database changes (migration)

**New / updated tables:**
- `approval_groups` — already exists; add `description`, `is_active`, `deleted_at` (soft delete).
- `approval_group_members` — already exists; **remove any max-member constraint** (none in DB; remove client-side cap).
- `approval_policies` — already exists; extend with `policy_type` ('range' | 'fixed'), `is_active`, `deleted_at`.
- `approval_policy_levels` — **new**: `policy_id`, `level_order`, `group_id`, `mode` ('sequential' | 'parallel'), `sla_hours`.
- `approval_ranges` — **new**: `policy_id`, `min_value`, `max_value`, `currency` — for Expense / Advance / Loan tiers.
- `approval_delegations` — already exists; add `fallback_employee_id`, `reason`, auto-expiry trigger.
- `workflow_logs` — **new**: append-only audit (`entity_type`, `entity_id`, `action`, `actor_user_id`, `from_state`, `to_state`, `metadata`, `created_at`).
- `role_permissions` — **new**: `role_id`, `permission_key` (granular feature flags per custom role).
- `module_permissions` — **new**: catalog of module → permission keys mapping.
- `tenant_module_configurations` — use existing `clients.enabled_modules` + new `clients.module_config jsonb` for per-module settings.

**Functions / triggers:**
- `resolve_approval_chain(_client_id, _category, _value)` → returns ordered list of `{level, group_id, mode}`.
- `get_active_approvers_with_delegation(_group_id)` → existing extended with fallback.
- `expire_delegations()` cron-callable function.
- `log_workflow_event()` trigger on approval state changes.
- RLS: admin/super_admin full access; custom roles gated by `role_permissions.permission_key IN ('approval.manage', 'approval.view')`.

**Realtime:** add `approval_groups`, `approval_policies`, `approval_policy_levels`, `approval_delegations`, `workflow_logs` to `supabase_realtime` publication.

### 2. Frontend — Approval Matrix page redesign

`src/pages/settings/ApprovalMatrixPage.tsx` becomes a 4-tab shell:

```text
┌─ Groups ─┬─ Policies ─┬─ Delegations ─┬─ Audit Log ─┐
```

**Groups tab** (`src/components/approvalMatrix/GroupsTab.tsx`)
- List: name, description, member count, status, actions.
- Create/Edit modal: name, description, **unlimited member multi-select** (remove cap).
- Member picker is filtered to: admins + employees with role permission `approval.member`.

**Policies tab** (`src/components/approvalMatrix/PoliciesTab.tsx`)
- Sub-tabs rendered **dynamically from `enabledModules`**:
  - `employees` → Leave Approvals (fixed, multi-level).
  - `expenses` → Expense Approvals (range), Advance Approvals (range).
  - `payroll` → Loan Approvals (range).
  - `assets` → Asset Request Approvals (fixed, multi-level).
- Range editor: rows of `min – max → group` with auto-fill of next `min`.
- Multi-level builder: ordered levels, each with group + sequential/parallel toggle + SLA hours. Visual chain renderer.

**Delegations tab** (`src/components/approvalMatrix/DelegationsTab.tsx`)
- From-employee, to-employee, fallback, start/end date, reason, status.
- Auto-expiry indicator; revoke action.

**Audit Log tab** (`src/components/approvalMatrix/AuditLogTab.tsx`)
- Filterable list of `workflow_logs` entries.

### 3. Backend services

- `src/lib/approvalRouting.ts` — extend `routeApprovalRequest` to walk multi-level chains, respect ranges, and write `workflow_logs`.
- `src/hooks/queries/useApprovalMatrix.ts` — extend with `usePolicyLevels`, `useApprovalRanges`, `useDelegations`, `useWorkflowLogs`. All subscribe to realtime.
- `src/hooks/useCanApprove.ts` — already category-aware; extend to consider delegation + level position.

### 4. RBAC

- `src/lib/feature-catalog.ts` — add granular keys: `approval.groups.manage`, `approval.policies.manage`, `approval.delegations.manage`, `approval.audit.view`, `approval.member`.
- Default mapping: `admin` → all; `employee` → none.
- Module Access (super-admin) and Role editor (admin) consume these keys.

### 5. Verification

- Admin: full access; can create unlimited-member groups; range/fixed editors render per enabled module.
- Employee with no custom role: Approval Matrix hidden.
- Custom role with `approval.policies.manage`: can edit policies, not groups.
- Delegation: configured today → from-user removed from approver list, to-user (or fallback if expired) appears, log entry written.
- Realtime: open two tabs; change in one reflects without refresh.

### Out of scope for this iteration

- Push/email notifications already use `notifyUser` / `routeApprovalRequest`; no new transport added.
- Existing approval-consuming pages (Expenses, Loans, Leave) are left wired to `routeApprovalRequest`; only its internals change.
