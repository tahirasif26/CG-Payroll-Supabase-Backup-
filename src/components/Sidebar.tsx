import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import {
  navigationGroups,
  superAdminGroups,
  filterNavigation,
  resolveGroupLabel,
  type NavGroup,
} from "@/lib/navigation";

const COLLAPSE_KEY = "connecthr_sidebar_collapsed";

function isPathActive(pathname: string, target: string): boolean {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(target + "/");
}

function isGroupActive(pathname: string, g: NavGroup): boolean {
  if (g.basePath && isPathActive(pathname, g.basePath)) return true;
  return !!g.children?.some((c) => isPathActive(pathname, c.path));
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { appRole, profile, signOut, role, hasFeature, enabledModules, isSuperAdmin } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    if (!appRole) return [];
    const source = isSuperAdmin ? superAdminGroups : navigationGroups;
    return filterNavigation(source, appRole, hasFeature, enabledModules);
  }, [appRole, hasFeature, enabledModules, isSuperAdmin]);

  const handleNav = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const widthClass = collapsed ? "w-[80px]" : "w-[240px]";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50",
          "transition-[width] duration-300 ease-in-out",
          "hidden md:flex shrink-0",
          widthClass,
          mobileOpen && "!flex fixed inset-y-0 left-0 w-[240px] md:relative shadow-2xl",
        )}
      >
        {/* Logo */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-sidebar-border shrink-0">
          <button
            onClick={() => handleNav("/")}
            className={cn("flex items-center min-w-0", collapsed && "justify-center w-full")}
          >
            <span
              className="text-[18px] font-extrabold tracking-tighter text-sidebar-foreground"
              style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
            >
              {collapsed ? "C" : "Connect"}
            </span>
            <span
              className="text-[18px] font-extrabold tracking-tighter text-primary"
              style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
            >
              {collapsed ? "H" : "HR"}
            </span>
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded hover:bg-sidebar-accent"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modules (top-level only — sub-tabs render in header) */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3">
          <ul className="space-y-0.5">
            {groups.map((g) => {
              const Icon = g.icon;
              const groupLabel = appRole ? resolveGroupLabel(g, appRole) : g.label;

              const target = g.basePath ?? g.children?.[0]?.path;
              if (!target) return null;

              const active = g.basePath
                ? isPathActive(location.pathname, g.basePath)
                : !!g.children?.some((c) => isPathActive(location.pathname, c.path));

              return (
                <li key={g.key}>
                  <button
                    onClick={() => handleNav(target)}
                    title={collapsed ? groupLabel : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors relative",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-primary rounded-r-full" />
                    )}
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                    {!collapsed && <span className="flex-1 text-left truncate">{groupLabel}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <div className={cn("flex items-center gap-2 p-2 rounded-md", collapsed && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-background">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate text-sidebar-foreground">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/55 capitalize truncate">{role}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={signOut}
                className="text-[10px] text-sidebar-foreground/60 hover:text-destructive px-2 py-1 rounded"
                title="Sign out"
              >
                Sign out
              </button>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center justify-center gap-1 mt-1 py-1.5 rounded-md text-[11px] text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 rotate-90" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  return { collapsed, toggle: () => setCollapsed((c) => !c) };
}
