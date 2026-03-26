

## Company Policies Module

### Overview

Admin manages policies (add/edit/delete/upload) in **Settings → Company Policies**. Employees view policies as a **"Company Policies" tab** in the employee sidebar nav.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/contexts/PolicyContext.tsx` | **Create** — context with mock policies, CRUD operations, acknowledgment tracking |
| `src/pages/settings/CompanyPoliciesPage.tsx` | **Create** — admin page: add/edit/delete policies, upload documents, set categories, track acknowledgments |
| `src/pages/CompanyPoliciesPage.tsx` | **Create** — employee read-only view: searchable list with category filters, view/download, acknowledge button |
| `src/components/AppSidebar.tsx` | **Modify** — add "Company Policies" to `employerSettingsNav` and `employeeNav` |
| `src/App.tsx` | **Modify** — add `PolicyProvider`, routes for `/settings/company-policies` and `/company-policies` |

### Data Model

```text
PolicyDocument {
  id, title, description,
  category: "hr" | "finance" | "it" | "health-safety" | "general",
  fileName, fileUrl,
  version, effectiveDate, status: "active" | "archived",
  requiresAck, acknowledgments: string[]  // employee IDs
}
```

### How It Works

1. **Settings → Company Policies** (employer): Table listing all policies with Add/Edit/Delete actions. Upload dialog for PDF/docs with category, description, effective date fields. Acknowledgment status column showing "X/Y employees acknowledged"

2. **Employee Nav → Company Policies** (employee): Read-only card/list view with category filter tabs (All, HR, Finance, IT, etc.) and search. Each policy shows title, category badge, effective date, and View/Download + Acknowledge buttons. Pending acknowledgments highlighted

3. **Sidebar**: "Company Policies" with `FileText` icon added to both `employerSettingsNav` and `employeeNav`

