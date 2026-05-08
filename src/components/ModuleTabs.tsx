import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import {
  navigationGroups,
  superAdminGroups,
  filterNavigation,
  filterMeNavigation,
  resolveChildLabel,
  type NavGroup,
} from "@/lib/navigation";

function isPathActive(pathname: string, target: string): boolean {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(target + "/");
}

function isGroupActive(pathname: string, g: NavGroup): boolean {
  if (g.basePath && isPathActive(pathname, g.basePath)) return true;
  return !!g.children?.some((c) => isPathActive(pathname, c.path));
}

export function ModuleTabs() {
  const { appRole, hasFeature, enabledModules, isSuperAdmin, roleFeatures } = useRole();
  const { scope } = useViewScope();
  const location = useLocation();
  const navigate = useNavigate();

  const activeGroup = useMemo(() => {
    if (!appRole) return null;
    let groups: NavGroup[];
    if (isSuperAdmin) {
      groups = filterNavigation(superAdminGroups, appRole, hasFeature, enabledModules);
    } else {
      const useMeNav = appRole === "employee" || scope === "me";
      groups = useMeNav
        ? filterMeNavigation(hasFeature, enabledModules)
        : filterNavigation(navigationGroups, appRole, hasFeature, enabledModules, roleFeatures);
    }
    return groups.find((g) => isGroupActive(location.pathname, g)) ?? null;
  }, [appRole, hasFeature, enabledModules, isSuperAdmin, scope, location.pathname, roleFeatures]);

  if (!activeGroup || !activeGroup.children || activeGroup.children.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-card sticky top-14 z-20 shrink-0">
      <div className="flex gap-1 overflow-x-auto px-4 md:px-6 scrollbar-hide">
        {activeGroup.children.map((c) => {
          const active = isPathActive(location.pathname, c.path);
          const label = appRole ? resolveChildLabel(c, appRole) : c.label;
          return (
            <button
              key={c.path}
              onClick={() => navigate(c.path)}
              className={cn(
                "inline-flex items-center px-3 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
