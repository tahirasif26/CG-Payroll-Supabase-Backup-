import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import {
  navigationModules,
  superAdminModules,
  filterModulesForUser,
  filterTabsForUser,
  resolveTabLabel,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function ModuleTabs() {
  const { appRole, hasFeature, enabledModules, isSuperAdmin } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const activeModule = useMemo(() => {
    if (!appRole) return null;
    const source = isSuperAdmin ? superAdminModules : navigationModules;
    const visible = filterModulesForUser(source, appRole, hasFeature, enabledModules);

    const matches = visible.filter((m) => {
      if (m.basePath === "/") return location.pathname === "/";
      return location.pathname === m.basePath || location.pathname.startsWith(m.basePath + "/");
    });
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.basePath.length - a.basePath.length)[0];
  }, [appRole, isSuperAdmin, hasFeature, enabledModules, location.pathname]);

  const tabs = useMemo(() => {
    if (!activeModule || !appRole) return [];
    return filterTabsForUser(activeModule.tabs, appRole, hasFeature);
  }, [activeModule, appRole, hasFeature]);

  if (tabs.length <= 1) return null;

  const isTabActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="border-b bg-card sticky top-14 z-20">
      <div className="flex items-center gap-1 px-4 md:px-6 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const active = isTabActive(t.path);
          const label = appRole ? resolveTabLabel(t, appRole) : t.label;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={cn(
                "relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
