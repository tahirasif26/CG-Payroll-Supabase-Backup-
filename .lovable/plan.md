

## Move Reminder Settings to a Separate Settings Tab

### What Changes

Move the document expiry reminder settings out of each employee's Documents tab into a new standalone "Reminder Settings" entry in the Settings sidebar — making it a single global configuration for all employees.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/contexts/ReminderSettingsContext.tsx` | **Create** — context holding `reminderDays`, `autoRemind`, `reminderFrequency` with defaults (30, true, "7") |
| `src/pages/settings/ReminderSettingsPage.tsx` | **Create** — full settings page with Card UI: numeric input for days, auto-remind switch, frequency selector, Save button with toast |
| `src/components/AppSidebar.tsx` | **Modify** — add `{ title: "Reminder Settings", url: "/settings/reminders", icon: Bell }` to `employerSettingsNav` |
| `src/App.tsx` | **Modify** — add `ReminderSettingsProvider` wrapper + route `<Route path="/settings/reminders" element={<ReminderSettingsPage />} />` |
| `src/pages/EmployeesPage.tsx` | **Modify** — remove lines 839-891 (local reminder state + collapsible settings card), import `useReminderSettings` from context for `getDocExpiryStatus` computation |

### How It Works

1. **Context** provides `reminderDays`, `autoRemind`, `reminderFrequency` globally via `useReminderSettings()` hook
2. **ReminderSettingsPage** renders a dedicated settings page at `/settings/reminders` with the same inputs currently in the employee DocumentsTab collapsible card, plus a Save button
3. **Sidebar** shows "Reminder Settings" as its own item under Settings
4. **EmployeesPage** DocumentsTab reads `reminderDays` from context to compute expiry statuses — all other document functionality (badges, list, version history) stays unchanged

