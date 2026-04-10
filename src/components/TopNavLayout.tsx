import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, Search, HelpCircle, ChevronDown } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Primary module definitions with their sub-navigation
const primaryModules = [
  {
    label: "Dashboard",
    path: "/",
    exact: true,
    subNav: [],
  },
  {
    label: "Employees",
    path: "/employees",
    exact: false,
    matchPaths: ["/employees", "/org-chart", "/birthdays", "/leave"],
    subNav: [
      { label: "Directory", path: "/employees" },
      { label: "Org Chart", path: "/org-chart" },
      { label: "Imp Dates", path: "/birthdays" },
      { label: "Leave Management", path: "/leave" },
    ],
  },
  {
    label: "Payroll",
    path: "/payroll",
    exact: false,
    matchPaths: ["/payroll", "/payroll/setup", "/payslips", "/separations", "/loans", "/analytics"],
    subNav: [
      { label: "Payroll Setup", path: "/payroll/setup" },
      { label: "Payroll Runs", path: "/payroll" },
      { label: "Payslips", path: "/payslips" },
      { label: "End of Service", path: "/separations" },
      { label: "Loans", path: "/loans" },
      { label: "Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Expenses",
    path: "/expenses",
    exact: false,
    matchPaths: ["/expenses", "/advances", "/outstanding-advances", "/expense-analytics"],
    subNav: [
      { label: "Expenses", path: "/expenses" },
      { label: "Advances", path: "/advances" },
      { label: "Outstanding Advances", path: "/outstanding-advances" },
      { label: "Expense Analytics", path: "/expense-analytics" },
    ],
  },
  {
    label: "Assets",
    path: "/assets/dashboard",
    exact: false,
    matchPaths: ["/assets/dashboard", "/assets/inventory", "/assets/master-data", "/assets/store", "/assets/requests", "/assets/audits"],
    subNav: [
      { label: "Dashboard", path: "/assets/dashboard" },
      { label: "Inventory", path: "/assets/inventory" },
      { label: "Settings", path: "/assets/master-data" },
      { label: "Store", path: "/assets/store" },
      { label: "Requests", path: "/assets/requests" },
      { label: "Audits", path: "/assets/audits" },
    ],
  },
  {
    label: "Performance",
    path: "/performance/ratings",
    exact: false,
    matchPaths: ["/performance/ratings", "/performance/calibration", "/performance/self-assessment", "/performance/peer-assessment", "/performance/manager-assessment", "/performance/assessment-ratings", "/performance/questionnaire"],
    subNav: [
      { label: "Ratings Overview", path: "/performance/ratings" },
      { label: "Calibration", path: "/performance/calibration" },
      { label: "Self Assessment", path: "/performance/self-assessment" },
      { label: "Peer Assessment", path: "/performance/peer-assessment" },
      { label: "Manager Assessment", path: "/performance/manager-assessment" },
      { label: "Assessment Ratings", path: "/performance/assessment-ratings" },
      { label: "Questionnaire", path: "/performance/questionnaire" },
    ],
  },
  {
    label: "Settings",
    path: "/settings/company",
    exact: false,
    matchPaths: ["/settings/company", "/settings/company-structure", "/settings/projects", "/settings/expense-categories", "/settings/approval-matrix", "/settings/company-policies", "/settings/reminders"],
    subNav: [
      { label: "Company Profile", path: "/settings/company" },
      { label: "Company Structure", path: "/settings/company-structure" },
      { label: "Projects", path: "/settings/projects" },
      { label: "Expense Categories", path: "/settings/expense-categories" },
      { label: "Approval Matrix", path: "/settings/approval-matrix" },
      { label: "Company Policies", path: "/settings/company-policies" },
      { label: "Reminders", path: "/settings/reminders" },
    ],
  },
];

function isModuleActive(mod: typeof primaryModules[0], pathname: string): boolean {
  if (mod.exact) return pathname === mod.path;
  if (mod.matchPaths) return mod.matchPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
  return pathname.startsWith(mod.path);
}

export function TopNavLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, role } = useRole();

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const activeModule = primaryModules.find(m => isModuleActive(m, location.pathname));
  const subNav = activeModule?.subNav || [];

  const isAdmin = role === "employer" || role === "admin" || role === "hr";

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Primary Header */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-30">
        {/* Left: Logo + Primary Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-[20px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            <span className="text-[20px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
          </div>

          {isAdmin && (
            <nav className="hidden md:flex items-center gap-1">
              {primaryModules.map((mod) => {
                const active = isModuleActive(mod, location.pathname);
                return (
                  <button
                    key={mod.label}
                    onClick={() => navigate(mod.path)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      active
                        ? "text-primary font-semibold border-b-2 border-primary rounded-b-none"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {mod.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Search + Icons + Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID or department..."
              className="pl-9 h-8 w-[260px] text-xs bg-muted/40 border-0 focus-visible:ring-1"
            />
          </div>
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => navigate("/settings/company")}>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                <span className="text-xs font-semibold text-background">{initials}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <HelpCircle className="h-4 w-4" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sub-Navigation Bar */}
      {isAdmin && subNav.length > 0 && (
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-14 z-20">
          <div className="px-6">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
              {subNav.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                      active
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div key={location.pathname} className="page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}
