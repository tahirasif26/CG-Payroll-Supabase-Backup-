import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, Search, HelpCircle, LayoutDashboard, Users, Wallet, CalendarCheck, Receipt, Package, BarChart3, ShieldCheck, Briefcase, Clock } from "lucide-react";
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
    subtitle: "Overview",
    icon: LayoutDashboard,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    path: "/",
    exact: true,
    hasPending: false,
    subNav: [],
  },
  {
    label: "Employees",
    subtitle: "Directory",
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    path: "/employees",
    exact: false,
    hasPending: true,
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
    subtitle: "Salaries",
    icon: Wallet,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    path: "/payroll",
    exact: false,
    hasPending: true,
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
    label: "Attendance",
    subtitle: "Time Logs",
    icon: CalendarCheck,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50 dark:bg-orange-950/40",
    path: "/timesheets",
    exact: false,
    hasPending: false,
    matchPaths: ["/timesheets"],
    subNav: [
      { label: "Timesheets", path: "/timesheets" },
    ],
  },
  {
    label: "Expenses",
    subtitle: "Claims",
    icon: Receipt,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
    path: "/expenses",
    exact: false,
    hasPending: true,
    matchPaths: ["/expenses", "/advances", "/outstanding-advances", "/expense-analytics", "/mileage"],
    subNav: [
      { label: "Expenses", path: "/expenses" },
      { label: "Advances", path: "/advances" },
      { label: "Outstanding Advances", path: "/outstanding-advances" },
      { label: "Expense Analytics", path: "/expense-analytics" },
    ],
  },
  {
    label: "Assets",
    subtitle: "Inventory",
    icon: Package,
    iconColor: "text-amber-700",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    path: "/assets/dashboard",
    exact: false,
    hasPending: false,
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
    subtitle: "Reviews",
    icon: BarChart3,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-50 dark:bg-pink-950/40",
    path: "/performance/ratings",
    exact: false,
    hasPending: true,
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
    subtitle: "Configure",
    icon: Settings,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-100 dark:bg-slate-800/40",
    path: "/settings/company",
    exact: false,
    hasPending: false,
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
      {/* Top Utility Bar */}
      <header className="h-12 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-[18px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            <span className="text-[18px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
          </div>
          <div className="hidden lg:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID or department..."
              className="pl-9 h-8 w-[260px] text-xs bg-muted/40 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => navigate("/settings/company")}>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center hover:opacity-90 transition-opacity ml-1">
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

      {/* Primary Module Navigation - Icon Buttons */}
      {isAdmin && (
        <div className="border-b bg-card sticky top-12 z-20">
          <div className="px-4">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 justify-center">
              {primaryModules.map((mod) => {
                const active = isModuleActive(mod, location.pathname);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.label}
                    onClick={() => navigate(mod.path)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl transition-all whitespace-nowrap group min-w-fit",
                      active
                        ? "bg-primary/5 dark:bg-primary/10"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <div className="relative">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        active
                          ? "border-primary/30 " + mod.iconBg
                          : "border-border " + mod.iconBg
                      )}>
                        <Icon className={cn("h-4.5 w-4.5", mod.iconColor)} size={18} />
                      </div>
                      {mod.hasPending && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={cn(
                        "text-[13px] font-semibold leading-tight",
                        active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {mod.label}
                      </p>
                      <p className={cn(
                        "text-[11px] leading-tight",
                        active ? "text-primary" : "text-muted-foreground/70"
                      )}>
                        {mod.subtitle}
                      </p>
                    </div>
                    {active && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-12 bg-primary rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Sub-Navigation Bar */}
      {isAdmin && subNav.length > 0 && (
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-[6.75rem] z-10">
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