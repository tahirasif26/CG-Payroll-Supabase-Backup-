import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { navigationConfig, filterNavigationForUser, resolveLabel, type NavItem } from "@/lib/navigation";

const COLLAPSE_KEY = "connecthr_sidebar_collapsed";

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.path === "/") return pathname === "/";
  if (pathname === item.path) return true;
  if (pathname.startsWith(item.path + "/")) return true;
  return item.children?.some((c) => pathname === c.path || pathname.startsWith(c.path + "/")) ?? false;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { appRole, isSuperAdmin, profile, signOut, role, hasFeature } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const sections = useMemo(() => {
    if (!appRole) return [];
    return filterNavigationForUser(navigationConfig, appRole, hasFeature);
  }, [appRole, hasFeature]);

  // Track which expandable parents are open
  const [openParents, setOpenParents] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((s) => s.items.forEach((it) => {
      if (it.children && isItemActive(location.pathname, it)) initial.add(it.path);
    }));
    return initial;
  });

  // Auto-open parent of current route when route changes
  useEffect(() => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      sections.forEach((s) => s.items.forEach((it) => {
        if (it.children && isItemActive(location.pathname, it)) next.add(it.path);
      }));
      return next;
    });
  }, [location.pathname, sections]);

  const toggleParent = (path: string) =>
    setOpenParents((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const handleNav = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const widthClass = collapsed ? "w-[64px]" : "w-[252px]";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 ease-out z-50",
          // Desktop: in-flow, fixed width
          "hidden md:flex shrink-0",
          widthClass,
          // Mobile: slide-over drawer
          mobileOpen && "!flex fixed inset-y-0 left-0 w-[260px] md:relative shadow-2xl",
        )}
      >
        {/* Logo + mobile close */}
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
            {!collapsed && (
              <span
                className="text-[18px] font-extrabold tracking-tighter text-primary"
                style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
              >
                HR
              </span>
            )}
            {collapsed && (
              <span
                className="text-[18px] font-extrabold tracking-tighter text-primary"
                style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
              >
                H
              </span>
            )}
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded hover:bg-sidebar-accent"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3 space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(location.pathname, item);
                  const hasChildren = !!item.children?.length;
                  const open = openParents.has(item.path);

                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          if (hasChildren && !collapsed) {
                            toggleParent(item.path);
                            // Also navigate to first child or self
                            if (!active) handleNav(item.path);
                          } else {
                            handleNav(item.path);
                          }
                        }}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors relative group",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-primary rounded-r-full" />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {hasChildren && (
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform shrink-0 opacity-60",
                                  open && "rotate-180"
                                )}
                              />
                            )}
                          </>
                        )}
                      </button>

                      {/* Children */}
                      {hasChildren && open && !collapsed && (
                        <ul className="mt-0.5 ml-5 pl-3 border-l border-sidebar-border space-y-0.5">
                          {item.children!.map((child) => {
                            const childActive =
                              location.pathname === child.path ||
                              location.pathname.startsWith(child.path + "/");
                            return (
                              <li key={child.path}>
                                <button
                                  onClick={() => handleNav(child.path)}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-[12.5px] transition-colors",
                                    childActive
                                      ? "text-primary font-semibold bg-primary/5"
                                      : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                  )}
                                >
                                  {child.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: profile + collapse */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-md",
              collapsed && "justify-center"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-background">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate text-sidebar-foreground">
                  {displayName}
                </p>
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

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center justify-center gap-1 mt-1 py-1.5 rounded-md text-[11px] text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" /> Collapse
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
