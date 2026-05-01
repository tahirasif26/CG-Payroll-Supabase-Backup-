import { useRole } from "@/contexts/RoleContext";

/**
 * Returns true if the tenant has the given module enabled (or has no module
 * gating at all). Used to suppress global context queries for modules the
 * tenant doesn't use — keeps initial network load light.
 *
 * Super admins bypass module gating.
 */
export function useModuleEnabled(moduleKey: string): boolean {
  const { enabledModules, isSuperAdmin } = useRole();
  if (isSuperAdmin) return true;
  if (!enabledModules || enabledModules.length === 0) return true; // no gate
  return enabledModules.includes(moduleKey);
}
