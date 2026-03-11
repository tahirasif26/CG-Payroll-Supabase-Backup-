import React from "react";
import {
  LayoutDashboard, Users, DollarSign, Calendar, Gift, FileText,
  Receipt, CreditCard, Settings, Briefcase, PiggyBank, BarChart3, Navigation,
  FileCheck, Monitor, GitBranch, FolderKanban, Clock, Building2,
  Layers, Tag, Shield, Coins, ChevronDown, Award, UserMinus,
  Target, ClipboardCheck, UserCheck, UsersRound, Star, ListChecks,
  CreditCard as IdCardIcon, DoorOpen, Activity, ClipboardList, PieChart
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
  { title: "Dashboard", url: "/assets/dashboard", icon: PieChart },
  { title: "Asset Inventory", url: "/assets/inventory", icon: Monitor },
  { title: "Asset Categories", url: "/assets/categories", icon: Layers },
  { title: "Asset Store", url: "/assets/store", icon: Tag },
  { title: "Asset Requests", url: "/assets/requests", icon: Shield },
  { title: "Asset Audits", url: "/assets/audits", icon: ClipboardList },
  { title: "Asset Logs", url: "/assets/logs", icon: Activity },
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
  { title: "Advances", url: "/advances", icon: Coins },
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

function ParentNavItem({ item }: { item: NavItem }) {
  const location = useLocation();
  const isActive = location.pathname === item.url;
  const prevActiveRef = React.useRef(isActive);
  const wasActive = prevActiveRef.current;

  React.useEffect(() => {
    prevActiveRef.current = isActive;
  }, [isActive]);

  const wipeClass = isActive ? 'nav-wipe-in text-primary-foreground font-semibold' : (wasActive ? 'nav-wipe-out' : '');

  return (
    <SidebarGroup className="py-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors font-semibold ${isActive ? 'hover:text-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'} ${wipeClass}`}
              activeClassName=""
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="text-[13.5px] tracking-tight" style={{ lineHeight: '1.5' }}>{item.title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavItems({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <ParentNavItem key={item.title} item={item} />
      ))}
    </>
  );
}

function CollapsibleNavGroup({ label, icon: Icon, items }: { label: string; icon: any; items: NavItem[] }) {
  const location = useLocation();
  const isActive = items.some(item => location.pathname === item.url);
  const prevActiveRef = React.useRef(isActive);
  const wasActive = prevActiveRef.current;
  
  React.useEffect(() => {
    prevActiveRef.current = isActive;
  }, [isActive]);

  const wipeClass = isActive ? 'nav-wipe-in text-primary-foreground font-semibold' : (wasActive ? 'nav-wipe-out' : '');
  
  return (
    <SidebarGroup className="py-0">
      <Collapsible defaultOpen={isActive}>
        <CollapsibleTrigger className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md group ${isActive ? '' : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'} ${wipeClass}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[13.5px] font-semibold tracking-tight" style={{ lineHeight: '1.5' }}>{label}</span>
          </div>
          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="pl-6 mt-1 space-y-0">
              {items.map((item) => (
                <SidebarMenuItem key={item.title} className="py-0">
                  <SidebarMenuButton asChild className="h-auto min-h-0">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-1 px-2 py-[2px] rounded-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors font-medium"
                      activeClassName="!text-primary font-bold"
                    >
                      <span className="text-[12px] tracking-tight" style={{ lineHeight: '1.4' }}>{item.title}</span>
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
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <div>
          <div className="flex items-center">
            <span className="text-[24px] font-extrabold tracking-tighter text-sidebar-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            <span className="text-[24px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
          </div>
          <p className="text-[9px] text-sidebar-foreground/45 tracking-wide font-medium -mt-1">powered by Consultify Global</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 overflow-y-auto scrollbar-hide">
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
      <SidebarFooter className="p-3">
        <div className="flex gap-1.5">
          <Button
            variant={role === "employer" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-[11px] h-7 font-bold ${role === "employer" ? "gradient-ey text-primary-foreground" : ""}`}
            onClick={() => setRole("employer")}
          >
            Employer
          </Button>
          <Button
            variant={role === "employee" ? "default" : "outline"}
            size="sm"
            className={`flex-1 text-[11px] h-7 font-bold ${role === "employee" ? "gradient-ey text-primary-foreground" : ""}`}
            onClick={() => setRole("employee")}
          >
            Employee
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
