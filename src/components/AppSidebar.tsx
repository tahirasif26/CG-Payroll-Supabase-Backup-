import {
  LayoutDashboard, Users, DollarSign, Calendar, Gift, FileText,
  Receipt, CreditCard, Settings, Briefcase, PiggyBank, BarChart3
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Payroll Runs", url: "/payroll", icon: DollarSign },
  { title: "Compensation", url: "/compensation", icon: BarChart3 },
];

const financeNav = [
  { title: "Deductions", url: "/deductions", icon: Receipt },
  { title: "Tax Config", url: "/tax", icon: FileText },
  { title: "Loans", url: "/loans", icon: PiggyBank },
  { title: "Expenses", url: "/expenses", icon: CreditCard },
  { title: "Cost Allocation", url: "/cost-allocation", icon: Briefcase },
];

const peopleNav = [
  { title: "Leave Management", url: "/leave", icon: Calendar },
  { title: "Birthdays", url: "/birthdays", icon: Gift },
];

function NavGroup({ label, items }: { label: string; items: typeof mainNav }) {
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
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-ey flex items-center justify-center">
            <span className="text-sm font-extrabold text-secondary">CG</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">CG Payroll HCM</h2>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">People Platform</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <NavGroup label="Overview" items={mainNav} />
        <NavGroup label="Finance" items={financeNav} />
        <NavGroup label="People" items={peopleNav} />
      </SidebarContent>
    </Sidebar>
  );
}
