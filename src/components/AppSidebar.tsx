import {
  LayoutDashboard, Users, DollarSign, Calendar, Gift, FileText,
  Receipt, CreditCard, Settings, Briefcase, PiggyBank, BarChart3,
  FileCheck, Monitor, GitBranch, FolderKanban, Clock, Building2,
  Layers, Tag, Shield, Coins
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useRole } from "@/contexts/RoleContext";
import { useClient } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";

const employerNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Org Chart", url: "/org-chart", icon: GitBranch },
  { title: "Payroll Runs", url: "/payroll", icon: DollarSign },
  { title: "Payslips", url: "/payslips", icon: FileCheck },
  { title: "Compensation", url: "/compensation", icon: BarChart3 },
];

const employerFinanceNav = [
  { title: "Deductions", url: "/deductions", icon: Receipt },
  { title: "Tax Config", url: "/tax", icon: FileText },
  { title: "Loans", url: "/loans", icon: PiggyBank },
  { title: "Expenses", url: "/expenses", icon: CreditCard },
  { title: "Cost Allocation", url: "/cost-allocation", icon: Briefcase },
];

const employerPeopleNav = [
  { title: "Leave Management", url: "/leave", icon: Calendar },
  { title: "Birthdays", url: "/birthdays", icon: Gift },
  { title: "Asset Management", url: "/assets", icon: Monitor },
];

const employerProjectNav = [
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Timesheets", url: "/timesheets", icon: Clock },
];

const employerSettingsNav = [
  { title: "Company Profile", url: "/settings/company", icon: Building2 },
  { title: "Compensation", url: "/settings/compensation", icon: BarChart3 },
  { title: "Job Titles", url: "/settings/job-titles", icon: Tag },
  { title: "Departments", url: "/settings/departments", icon: Building2 },
  { title: "Divisions", url: "/settings/divisions", icon: Layers },
  { title: "Projects", url: "/settings/projects", icon: FolderKanban },
  { title: "Expense Categories", url: "/settings/expense-categories", icon: Receipt },
  { title: "User Management", url: "/settings/users", icon: Shield },
  { title: "Currency", url: "/settings/currency", icon: Coins },
  { title: "GL Code Mapping", url: "/settings/gl-codes", icon: FileText },
];

const employeeNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Payslips", url: "/payslips", icon: FileCheck },
  { title: "My Compensation", url: "/compensation", icon: BarChart3 },
  { title: "My Leave", url: "/leave", icon: Calendar },
  { title: "My Loans", url: "/loans", icon: PiggyBank },
  { title: "My Expenses", url: "/expenses", icon: CreditCard },
  { title: "My Assets", url: "/assets", icon: Monitor },
  { title: "My Timesheets", url: "/timesheets", icon: Clock },
  { title: "Directory", url: "/org-chart", icon: Users },
];

type NavItem = { title: string; url: string; icon: any };

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { role, setRole } = useRole();
  const { client } = useClient();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-ey flex items-center justify-center">
            <span className="text-sm font-extrabold text-secondary">CG</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">CG Payroll HCM</h2>
            {client.companyName ? (
              <p className="text-[11px] text-sidebar-primary font-medium truncate max-w-[140px]">{client.companyName}</p>
            ) : (
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">People Platform</p>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {role === "employer" ? (
          <>
            <NavGroup label="Overview" items={employerNav} />
            <NavGroup label="Finance" items={employerFinanceNav} />
            <NavGroup label="People" items={employerPeopleNav} />
            <NavGroup label="Projects" items={employerProjectNav} />
            <NavGroup label="Settings" items={employerSettingsNav} />
          </>
        ) : (
          <NavGroup label="My Workspace" items={employeeNav} />
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex gap-2">
          <Button
            variant={role === "employer" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-xs ${role === "employer" ? "gradient-ey text-primary-foreground" : ""}`}
            onClick={() => setRole("employer")}
          >
            Employer
          </Button>
          <Button
            variant={role === "employee" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-xs ${role === "employee" ? "gradient-ey text-primary-foreground" : ""}`}
            onClick={() => setRole("employee")}
          >
            Employee
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
