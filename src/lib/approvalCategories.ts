import type { PolicyCategory } from "@/hooks/queries/useApprovalMatrix";

export interface CategoryDef {
  key: PolicyCategory;
  label: string;
  unit: "money" | "days";
  /** Module key (matches `clients.enabled_modules` / sidebar). */
  module: string;
  /** Feature_key required on a role for an employee to be eligible to approve this category. */
  approveFeature: string;
}

export const CATEGORY_DEFS: CategoryDef[] = [
  { key: "expenses_travel", label: "Expenses — Travel", unit: "money", module: "expenses", approveFeature: "expenses.approve" },
  { key: "expenses_meals",  label: "Expenses — Meals",  unit: "money", module: "expenses", approveFeature: "expenses.approve" },
  { key: "expenses_other",  label: "Expenses — Other",  unit: "money", module: "expenses", approveFeature: "expenses.approve" },
  { key: "leave",           label: "Leave",             unit: "days",  module: "employees", approveFeature: "leave.approve" },
  { key: "loans",           label: "Loans",             unit: "money", module: "payroll",  approveFeature: "loans.approve" },
  { key: "advances",        label: "Advances",          unit: "money", module: "payroll",  approveFeature: "advances.approve" },
  { key: "assets",          label: "Assets",            unit: "money", module: "assets",   approveFeature: "assets.approve_requests" },
];

/** Returns true if the client has the module backing this category enabled. */
export function isCategoryEnabled(
  cat: PolicyCategory,
  enabledModules: string[] | null | undefined,
): boolean {
  const def = CATEGORY_DEFS.find((c) => c.key === cat);
  if (!def) return false;
  // No gating configured → treat all as enabled (mirrors useModuleEnabled).
  if (!enabledModules || enabledModules.length === 0) return true;
  return enabledModules.includes(def.module);
}

export function enabledCategoryDefs(
  enabledModules: string[] | null | undefined,
): CategoryDef[] {
  return CATEGORY_DEFS.filter((c) => isCategoryEnabled(c.key, enabledModules));
}

/** Map a routing category string (loose) to the module key it depends on. */
export function moduleForCategory(category: string): string | null {
  const def = CATEGORY_DEFS.find((c) => c.key === category);
  return def?.module ?? null;
}
