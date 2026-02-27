import {
  LayoutDashboard, Users, DollarSign, Calendar, Gift, FileText,
  Receipt, CreditCard, Settings, Briefcase, PiggyBank, BarChart3,
  FileCheck, Monitor, GitBranch, FolderKanban, Clock, Building2,
  Layers, Tag, Shield, Coins, ChevronDown, Award, UserMinus,
  Target, ClipboardCheck, UserCheck, UsersRound, Star, ListChecks,
  CreditCard as IdCardIcon, DoorOpen
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRole } from "@/contexts/RoleContext";
import { useClient } from "@/contexts/ClientContext";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const employerNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const employeesSubNav = [
  { title: "Directory", url: "/employees", icon: Users },
  { title: "Org Chart", url: "/org-chart", icon: GitBranch },
  { title: "Imp Dates", url: "/birthdays", icon: Gift },
  { title: "Leave Management", url: "/leave", icon: Calendar },
];

const assetTrackingNav = [
  { title: "Asset Management", url: "/assets", icon: Monitor },
];

const accessManagementNav = [
  { title: "ID Cards", url: "/id-cards", icon: IdCardIcon },
  { title: "Door & Lock Mgmt", url: "/access-management", icon: DoorOpen },
];

const payrollSubNav = [
  { title: "Payroll Runs", url: "/payroll", icon: DollarSign },
  { title: "Payslips", url: "/payslips", icon: FileCheck },
  { title: "End of Service", url: "/separations", icon: UserMinus },
  { title: "Loans", url: "/loans", icon: PiggyBank },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const expenseTrackingNav = [
  { title: "Expenses", url: "/expenses", icon: CreditCard },
  { title: "Expense Analytics", url: "/expense-analytics", icon: BarChart3 },
];

const employerFinanceNav = [
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Cost Allocation", url: "/cost-allocation", icon: Briefcase },
];

const upcomingFeaturesNav = [
  { title: "Timesheets", url: "/timesheets", icon: Clock },
];

const performanceNav = [
  { title: "Ratings Overview", url: "/performance/ratings", icon: Star },
  { title: "Rating Calibration", url: "/performance/calibration", icon: Target },
  { title: "Self Assessment", url: "/performance/self-assessment", icon: ClipboardCheck },
  { title: "Peer Assessment", url: "/performance/peer-assessment", icon: UsersRound },
  { title: "Manager Assessment", url: "/performance/manager-assessment", icon: UserCheck },
  { title: "Assessment Ratings", url: "/performance/assessment-ratings", icon: Award },
  { title: "Questionnaire Settings", url: "/performance/questionnaire", icon: ListChecks },
];

const employerSettingsNav = [
  { title: "Company Profile", url: "/settings/company", icon: Building2 },
  { title: "Payroll Settings", url: "/settings/payroll", icon: DollarSign },
  
  { title: "Company Structure", url: "/settings/company-structure", icon: Building2 },
  { title: "Projects", url: "/settings/projects", icon: FolderKanban },
  { title: "Expense Categories", url: "/settings/expense-categories", icon: Receipt },
  { title: "Approval Matrix", url: "/settings/approval-matrix", icon: Shield },
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

function NavItems({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  activeClassName="!bg-sidebar-primary !text-sidebar-primary-foreground font-semibold"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function CollapsibleNavGroup({ label, icon: Icon, items }: { label: string; icon: any; items: NavItem[] }) {
  const location = useLocation();
  const isActive = items.some(item => location.pathname === item.url);
  
  return (
    <SidebarGroup className="py-1">
      <Collapsible defaultOpen={isActive}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group">
          <div className="flex items-center gap-3">
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">{label}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
        </CollapsibleTrigger>
        <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu className="pl-4 mt-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="!bg-sidebar-primary !text-sidebar-primary-foreground font-semibold"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { role, setRole } = useRole();
  const { client } = useClient();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-extrabold text-sidebar-primary-foreground">CG</span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-bold text-sidebar-foreground tracking-tight">CG Payroll HCM</h2>
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
            <NavItems items={employerNav} />
            <CollapsibleNavGroup label="Employees" icon={Users} items={employeesSubNav} />
            <CollapsibleNavGroup label="Payroll" icon={DollarSign} items={payrollSubNav} />
            <CollapsibleNavGroup label="Expense Tracking" icon={CreditCard} items={expenseTrackingNav} />
            <CollapsibleNavGroup label="Asset Tracking" icon={Monitor} items={assetTrackingNav} />
            <CollapsibleNavGroup label="Access Management" icon={Shield} items={accessManagementNav} />
            <CollapsibleNavGroup label="Performance" icon={Target} items={performanceNav} />
            <CollapsibleNavGroup label="Projects" icon={FolderKanban} items={employerFinanceNav} />
            <CollapsibleNavGroup label="Upcoming Features" icon={Clock} items={upcomingFeaturesNav} />
            <CollapsibleNavGroup label="Settings" icon={Settings} items={employerSettingsNav} />
          </>
        ) : (
          <NavItems items={employeeNav} />
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2 border-t border-sidebar-border">
        <div className="flex gap-2 group-data-[collapsible=icon]:flex-col">
          <Button
            variant={role === "employer" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-xs ${role === "employer" ? "gradient-ey text-sidebar-primary-foreground" : "border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
            onClick={() => setRole("employer")}
          >
            <span className="group-data-[collapsible=icon]:hidden">Employer</span>
            <span className="hidden group-data-[collapsible=icon]:inline">E</span>
          </Button>
          <Button
            variant={role === "employee" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-xs ${role === "employee" ? "gradient-ey text-sidebar-primary-foreground" : "border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
            onClick={() => setRole("employee")}
          >
            <span className="group-data-[collapsible=icon]:hidden">Employee</span>
            <span className="hidden group-data-[collapsible=icon]:inline">U</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
