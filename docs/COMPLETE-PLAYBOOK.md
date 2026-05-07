# HRConnect — Complete Operator Playbook

> The single source of truth for setting up and running HRConnect end-to-end.
> Written for the team that operates the platform — not for end users.
> Read top-to-bottom for a new client onboarding. Use the table of contents to jump back to a specific step.

---

## Table of Contents

1. [Roles & Permissions Model](#1-roles--permissions-model)
2. [Phase 1 — Super Admin: Create the Client](#2-phase-1--super-admin-create-the-client)
3. [Phase 2 — Admin First Login & Company Profile](#3-phase-2--admin-first-login--company-profile)
4. [Phase 3 — Company Structure](#4-phase-3--company-structure)
5. [Phase 4 — Approval Matrix & Feature Access](#5-phase-4--approval-matrix--feature-access)
6. [Phase 5 — Payroll Setup (the engine)](#6-phase-5--payroll-setup-the-engine)
7. [Phase 6 — Leave, Expense & Asset Configuration](#7-phase-6--leave-expense--asset-configuration)
8. [Phase 7 — Add Employees](#8-phase-7--add-employees)
9. [Phase 8 — Run the First Payroll](#9-phase-8--run-the-first-payroll)
10. [Phase 9 — Day-to-Day Operations](#10-phase-9--day-to-day-operations)
11. [Phase 10 — Separations & End of Service](#11-phase-10--separations--end-of-service)
12. [Troubleshooting](#12-troubleshooting)
13. [Quick Reference Checklist](#13-quick-reference-checklist)

---

## 1. Roles & Permissions Model

HRConnect is **multi-tenant**. Every record belongs to a `client_id` and is isolated by Row-Level Security.

| Role | Scope | Typical user |
|---|---|---|
| `super_admin` | All clients. Sees `/manage/clients`. | Your internal team. |
| `admin` | One client. Full access inside that client. | Customer's HR/Finance lead. |
| `hr` | One client. Same as admin minus client-level destructive actions. | HR officers. |
| `employee` | One client. Self-service only (own payslip, own leave, own expenses). | Every employee. |

Two extra control layers sit on top of roles:

- **Approval Matrix** — who can approve what (HR, payroll, expenses up to $X).
- **Feature Access toggles** — turn modules on/off per role at `Settings → Feature Access`.

Rule: roles say *what you are*; the approval matrix and feature toggles say *what you can do*.

---

## 2. Phase 1 — Super Admin: Create the Client

**Who:** super_admin. **Where:** `/manage/clients`.

1. Click **+ New Client**.
2. Fill the wizard:
   - **Company name** — legal name. Becomes the tenant.
   - **Country & timezone** — drives date defaults and (later) localized payroll rules.
   - **Base currency** — the *reporting* currency. Employees can be paid in others (multi-currency).
   - **Subscription plan** — controls feature gates.
   - **Admin email** — the first human who will run this client.
3. Submit. The `create-client` edge function:
   - Inserts the `clients` row.
   - Seeds default departments, leave types, expense categories, asset master data.
   - Sends an invite email to the admin via the `invite-employee` edge function.

✅ **Done when:** the client appears in the list with status `active` and you see "Invite sent" against the admin email.

> ⚠ If the admin says they didn't get the email: check spam → if still missing, super_admin can resend from the client row's actions menu. See [Troubleshooting → Invitation email not received](#invitation-email-not-received).

---

## 3. Phase 2 — Admin First Login & Company Profile

**Who:** the new admin. **Where:** the link in their invite email.

1. Click the invite link → lands on `/reset-password` with a recovery token in the URL hash. They set a password.
2. Login redirects to `/` (the dashboard). The **Onboarding Banner** appears at the top, listing the 6-step setup wizard.
3. Open `Settings → Company Profile`:
   - Upload **logo** (used on payslips, ID cards, greeting cards).
   - Confirm **legal address, tax registration number, contact email**.
   - Confirm **base currency** matches what the company books in. *Changing this later is destructive — get it right now.*
4. Open `Settings → GL Code Mapping` (same page, second tab):
   - Map each payslip component (Basic, HRA, GOSI, Tax, etc.) to the GL codes used in the customer's accounting system. This drives the journal export later.

✅ **Done when:** Company Profile shows green check on the onboarding banner.

---

## 4. Phase 3 — Company Structure

**Who:** admin/hr. **Where:** `Settings → Company Structure`.

Four tabs in this page, build them in this order:

1. **Departments** — Sales, Engineering, HR, Finance… Supports parent/child for nested orgs.
2. **Designations** — Manager, Senior Engineer, Associate. Optionally tied to a department and a level (1–10).
3. **Divisions / Locations** — physical or legal entity splits. Drives work-location reporting.
4. **Employee Types** — Full-time, Part-time, Intern, Contractor. *These don't drive payroll math anymore* — payroll lives in Payroll Setup (Phase 5). Employee Types are now just a classification label used for filtering and reports.

> 💡 Order matters: Designations reference Departments, so create departments first.

✅ **Done when:** at least one of each exists and you can see them in the dropdowns when adding an employee.

---

## 5. Phase 4 — Approval Matrix & Feature Access

### 5a. Approval Matrix

**Where:** `Settings → Approval Matrix`.

The approval matrix replaces simple user management. For each user with admin/hr role, define:

- **Approval role** — e.g., "Finance Manager", "Department Head".
- **Can approve HR requests** — leave, separations, document changes.
- **Can approve payroll** — required for someone to sign off on a payroll run.
- **Expense approval limit** — max amount they can approve in base currency. Above this, escalates to next approver.

Wire each employee to an approver in their employee profile (`reports_to`) — that's the chain.

### 5b. Feature Access

**Where:** `Settings → Feature Access`.

Grid of features × roles. Toggle on/off per role. Common adjustments:

- Turn **off** `expenses.view_own` for employees on a payroll-only plan.
- Turn **off** `assets.request_new` if the client doesn't use the asset store.
- Turn **on** `employees.view_birthdays` for everyone if the client wants a friendly culture.

Toggles are enforced in the route guard (`ProtectedRoute requiredFeature=...`) and in the sidebar (hidden items don't render).

✅ **Done when:** you can log in as an `employee` test account and see only the modules that role should see.

---

## 6. Phase 5 — Payroll Setup (the engine)

**Where:** `Payroll → Payroll Setup` (`/payroll/setup`).

This is the most important configuration in the app. **All payroll math comes from here.** You can have multiple Payroll Setups (e.g., one for KSA staff, one for UAE staff, one for Interns).

### Build a Payroll Setup

Click **+ New Payroll Setup** → opens the editor with these tabs:

1. **Pay Schedule** — frequency (monthly is default), pay date rule (e.g., 25th, or last working day), cutoff day, period naming.
2. **Salary Rules** — how Basic, HRA, Transport, Other allowances are split. You can use percentages of CTC or fixed amounts.
3. **Payslip Components** — what shows up on the payslip and in what order. Mark each as Earning / Deduction / Reimbursement / Statutory.
4. **Auto Deductions** — GOSI, social insurance, pension, employer/employee splits with caps.
5. **Tax Rules** — KSA / UAE / custom slabs. Currently slab-based; the engine supports tiered.
6. **Loan & Advance** — default EMI months, interest rules, what happens on EMI pause.
7. **Overtime** — multipliers (weekday 1.25, weekend 1.5, holiday 2.0), cap per month.
8. **Leave Encashment** — which leave types are encashable, formula (basic only vs gross), accrual rate.
9. **Final Settlement / EOSB** — KSA gratuity (½ month/year for first 5, full month after) or UAE rules. The calculator is in `src/lib/eosb/`.
10. **Retirement Policies** — retirement age, post-retirement benefits.
11. **Approval Workflow** — who must approve a payroll run before it locks.
12. **Payroll Options** — round to nearest, payslip language, WPS bank format.

### Assign employees to a setup

After creating the setup, link employees to it via their profile (`payroll_setup_id`). Bulk reassignment lives in the setup editor's **Employees** action.

> 💡 Most clients only need 1–2 setups. Don't over-fragment — every setup is a maintenance burden.

✅ **Done when:** at least one Payroll Setup is published and at least one employee is assigned to it.

---

## 7. Phase 6 — Leave, Expense & Asset Configuration

### 7a. Leave Types — `Settings → Leave Types`

Default seed includes Annual, Sick, Maternity, Paternity, Unpaid. For each:

- **Default days/year** — used for new employees' allocation.
- **Paid?** — drives payroll deduction logic for unpaid days.
- **Carry forward** — and carry-forward cap.
- **Requires document upload** — e.g., medical certificate for sick > 3 days.

Per-employee overrides happen in the employee profile → Leave tab.

### 7b. Expense Categories — `Settings → Expense Categories`

Pre-seeded with Travel, Meals, Office Supplies, Software, Other. Add/disable as needed. Each category maps to a GL code (used in the export).

### 7c. Asset Master Data — `Assets → Master Data`

Three tabs: Categories (Laptop, Monitor, Phone…), Locations (Riyadh HQ, Jeddah Branch…), Conditions (New, Good, Fair, Damaged). These power the Asset Inventory and Asset Store dropdowns.

### 7d. Reminder Settings — `Settings → Reminders`

When does the system nudge employees?
- Document expiry: default 30 days before.
- Advance settlement: default 14 days before due.
- Payslip release notification: on approval.

✅ **Done when:** an employee can submit a leave request, an expense, and an asset request without seeing "no options available".

---

## 8. Phase 7 — Add Employees

**Where:** `Employees → + Add Employee` opens the 6-step wizard (`AddEmployeeWizard`).

### Wizard tabs

1. **Personal** — name, DOB, gender, marital status, nationality, religion, personal email/phone, emergency contact, address.
2. **Work** — emp ID (auto-generated, editable), department, designation, division, joining date, probation end, work location country/city, reports-to, employee type.
3. **Compensation** — pick a Payroll Setup (Phase 5), enter CTC. The setup's Salary Rules auto-split into Basic/HRA/etc. Override if needed. Add custom allowances/deductions.
4. **Time Off** — leave allocations per leave type. Pre-filled from Leave Type defaults; override for senior staff.
5. **Documents** — upload passport, visa, contract, certificates. Each can have an expiry date → triggers reminders.
6. **Education** — degrees, institutions, years.

### Send-invite toggle

At the bottom of the wizard there's a **Send login invite** toggle (default ON). When on:
- Submit calls the `invite-employee` edge function.
- Supabase admin API creates an auth user and emails the invite link.
- The employee lands on `/reset-password`, sets a password, and gets `employee` role automatically.

If the employee shouldn't have system access yet (e.g., contractor without portal access), turn the toggle OFF — you can invite later from the employee row's actions menu.

### Bulk import

Not yet a CSV importer. For >20 employees, the practical pattern is:
- Add 2–3 manually to validate the data shape.
- Then add the rest using the wizard (it remembers your last department/designation selection).
- A CSV importer is on the roadmap.

✅ **Done when:** every employee shows status `active` in the Employee Directory and at least one has accepted their invite (verifiable via "Has logged in" filter).

---

## 9. Phase 8 — Run the First Payroll

**Where:** `Payroll → Payroll` (`/payroll`).

The flow is **two steps: Generate → Approve.** This separation exists so you can review numbers before they hit payslips.

### Step 1 — Generate Payroll Run

1. Click **+ Generate Payroll**.
2. Select:
   - **Period** (e.g., April 2026).
   - **Payroll Setup** — runs one setup at a time. Run multiple if you have multiple setups.
   - **Employees** — defaults to all active employees on this setup; deselect any to exclude (e.g., new hire mid-month who should be paid pro-rata next month).
3. Click **Generate**. The calculator (`src/lib/payroll/calculator.ts`) runs:
   - Pulls compensation per employee from their setup.
   - Adds approved overtime, allowances, reimbursements (expenses approved this period).
   - Subtracts: tax, GOSI, loans/advances EMIs due, unpaid leave days, custom deductions.
   - Produces a per-employee payslip preview.

### Step 2 — Review

You land on the run detail page showing every payslip. Click any row → opens the payslip preview drawer with full breakdown. Common things to check:

- New hires — pro-ration looks right (joining-date based).
- Separations — final settlement included? See [Phase 10](#11-phase-10--separations--end-of-service).
- Loans — EMI deducted? If an employee has paused EMI, it should skip this period.
- Advances — settled advances reduce the cash payout.

If something is wrong: edit the underlying data (compensation, leave, expense, advance) and **regenerate** the run. Generation is idempotent until approval.

### Step 3 — Approve

Click **Approve Payroll Run**. The `approve-payroll-run` edge function:
- Locks every payslip in the run (no more edits).
- Marks linked advances as `settled`.
- Marks linked expenses as `paid`.
- Triggers payslip notifications to employees (if `payroll.notify_on_approval` is on).
- Generates payslip PDFs lazily on first download via `generate-payslip-pdf`.

### Step 4 — Bank file (WPS)

For KSA/UAE clients on WPS:
1. On the approved run, click **Generate WPS File** → calls `generate-wps-file` edge function.
2. Downloads a `.csv` or `.txt` in the bank's required format (configured in Payroll Setup → Payroll Options).
3. Upload to the bank's portal. Salaries credit to employees.

✅ **Done when:** the run shows `approved`, employees can see their payslip at `/payslips`, and (if applicable) the WPS file is uploaded to the bank.

---

## 10. Phase 9 — Day-to-Day Operations

The recurring rhythm once a client is live:

### Daily / on-demand
- **Approve expenses** — `/expenses` shows the approver's queue. Each line shows amount + receipt + category. Approval respects the Approval Matrix expense limit.
- **Approve advances** — `/advances`. Approvers see purpose, requested amount, expected spend date.
- **Approve leave** — `/leave` shows pending. Approvers see balance impact before clicking approve.
- **Asset requests** — `/assets/requests`. Approve → assigns the asset, generates QR label, marks employee as holder in `asset_history`.

### Weekly
- Review **Outstanding Advances** (`/outstanding-advances`) — anyone overdue on settlement gets a reminder via the cron-driven reminder system.
- Review **Document Expiry** dashboard cards — passports/visas expiring in 30 days.

### Monthly
- Run payroll (Phase 8).
- Run **Cost Allocation** (`/cost-allocation`) — split each employee's cost across projects for the month. Drives the cost-per-project report.
- Review **Payroll Analytics** (`/analytics`) — compare two completed runs side-by-side: total payroll, headcount delta, component-by-component variance, top movers.
- Review **Expense Analytics** (`/expense-analytics`) — spend by category, by department, by employee.

### Quarterly / annually
- Run **Performance Cycles** — create a cycle in `/performance/*`, set the questionnaire, open Self → Peer → Manager assessments → Calibration → Publish ratings.
- **Birthdays / anniversaries** — `/birthdays` lists upcoming. The greeting card system (`/cards`, currently admin-only) can auto-send.
- **Company policies** (`/company-policies`) — upload new versions; employees with `policies.requires_ack` enforced get a banner until they acknowledge.

---

## 11. Phase 10 — Separations & End of Service

**Where:** `/separations`. Two tabs: **Active Employees** and **Separations**.

### Initiating a separation

1. **Active Employees** tab → find the employee → **Initiate Separation**.
2. Fill the dialog:
   - Last working date.
   - Reason — Resignation, Termination, End of Contract, Retirement.
   - Notice period status — served / waived / paid in lieu.
   - Final settlement date — usually last working date or payroll cutoff after it.
3. Submit → moves the row to the **Separations** tab with status `pending`.

### Final settlement

The Separations row shows a computed **EOSB amount** using the country rules in `src/lib/eosb/`:
- **KSA**: ½ month basic per year for first 5 years, full month basic per year after. Pro-rated for partial years.
- **UAE**: 21 days basic per year for first 5 years, 30 days after, capped at 2 years' wages. Resignation reductions apply (1/3, 2/3, full based on years served).

The settlement also includes: leave encashment (per Payroll Setup), pending expenses, outstanding advance recovery, loan early-settlement (if any).

### Approval & payment

1. Click the row → review the calculation.
2. Look at the **Blockers** section — if any (unreturned assets, pending expense receipts, unsigned exit form), resolve before approval.
3. Approve → the next payroll run automatically includes this final settlement as a one-off line.
4. After approval payroll runs, the employee status flips to `inactive` (joining_date kept; separation_date set).

> 💡 Inactive employees disappear from operational views (org chart, dropdowns) but stay in payroll/audit history forever.

---

## 12. Troubleshooting

### Invitation email not received
1. Check spam folder.
2. Verify `email_confirm` is on in Supabase auth settings.
3. Resend from the user's row → Actions → "Resend invite".
4. If still failing: check `supabase/functions/invite-employee` logs for SMTP errors. Custom SMTP may need a rebind.

### Employee can log in but sees "Access Denied"
- Their `client_id` doesn't match any record they're trying to access. Check `user_roles` table — they should have one row per (user_id, role) for the client.
- If they were re-invited to a different client, they may have multiple `user_roles` rows. The app picks the most recent on login; ask them to log out and back in.

### Payslip not generating
- Confirm the employee is on a Payroll Setup (`employees.payroll_setup_id` is not null).
- Confirm they have at least one `employee_compensation` row with `effective_from <= period end`.
- Confirm they were `active` for at least part of the period.
- Regenerate the run.

### WPS file rejected by bank
- Bank format mismatch. Open Payroll Setup → Payroll Options → confirm bank format selection matches what the bank specified (SARIE, AAOIFI, etc.).
- IBAN missing or malformed in `employee_bank_details`. The export will skip rows without valid IBAN — check the warning banner above the download button.

### Expense approval not flowing to next approver
- The submitter's `reports_to` is null. Set it in their employee profile.
- The amount exceeds every approver's limit in the chain. Add a higher-limit approver or escalate manually.

### Dashboard slow to load
- Step 9 (performance) covered the main causes. If it regresses: open DevTools Network tab on `/`, look for queries >500ms — usually a missing index or a query without `client_id` filter.

### "Something went wrong" page (RouteErrorBoundary)
- Click **Try again**. If it persists, click **Reload app**.
- The error message at the bottom of the panel is the one the developer needs — screenshot it before reloading.

---

## 13. Quick Reference Checklist

Print this and tick through it for every new client.

### Day 1 — Provision
- [ ] Super admin creates client at `/manage/clients`
- [ ] Admin invite email sent
- [ ] Admin sets password and logs in

### Day 1 — Company foundation
- [ ] Company Profile completed (logo, address, tax)
- [ ] Base currency confirmed
- [ ] GL Code Mapping done
- [ ] Departments created
- [ ] Designations created
- [ ] Divisions / Locations created
- [ ] Employee Types reviewed

### Day 2 — Access control
- [ ] Approval Matrix configured (at least one approver per role)
- [ ] Feature Access toggles reviewed for each role
- [ ] Test login as `employee` role works as expected

### Day 2–3 — Payroll engine
- [ ] At least one Payroll Setup published
- [ ] All 12 setup tabs reviewed (don't skip Tax, EOSB, WPS format)
- [ ] Bank format selected matches the customer's bank

### Day 3 — Module config
- [ ] Leave Types reviewed/customized
- [ ] Expense Categories reviewed (and GL-mapped)
- [ ] Asset Master Data populated (Categories, Locations, Conditions)
- [ ] Reminder Settings reviewed

### Day 4 — Employees
- [ ] First test employee added through full wizard
- [ ] Test employee accepted invite
- [ ] Bulk add remaining employees
- [ ] Each employee has `payroll_setup_id`, `reports_to`, IBAN

### Day 5 — Dry-run payroll
- [ ] Generate payroll for prior month (test data only)
- [ ] Review every payslip
- [ ] Verify GL totals match expectation
- [ ] Generate WPS file → validate format with bank (don't upload)

### Day 6 — Go live
- [ ] Generate current-month payroll
- [ ] Approve
- [ ] Upload WPS to bank
- [ ] Confirm employees can see payslips at `/payslips`
- [ ] Hand off to the customer's day-to-day operator

### Ongoing rhythm
- [ ] Monthly: payroll + cost allocation + analytics review
- [ ] Weekly: approve queue clear (expenses, advances, leave, assets)
- [ ] Quarterly: performance cycle
- [ ] Annually: leave carry-forward, salary revisions, EOSB audit

---

**Last updated:** 2026-04-21
**Owner:** Operations
**Questions / corrections:** edit this file directly — it's the source of truth.
