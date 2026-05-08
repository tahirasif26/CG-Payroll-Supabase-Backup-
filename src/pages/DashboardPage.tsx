import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { DashboardSkeleton } from "@/components/dashboards/DashboardSkeleton";
import SuperAdminDashboard from "@/pages/dashboards/SuperAdminDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import EmployeeDashboard from "@/pages/dashboards/EmployeeDashboard";
import AdminEssDashboard from "@/pages/dashboards/AdminEssDashboard";

export default function DashboardPage() {
  const { appRole, isSuperAdmin, loading } = useRole();
  const { scope } = useViewScope();

  if (loading) return <DashboardSkeleton />;
  if (isSuperAdmin) return <SuperAdminDashboard />;

  // Admin/HR: switch between people-wide and personal ESS dashboard via TopBar tabs
  if (appRole === "admin" || appRole === "hr") {
    if (scope === "me") return <AdminEssDashboard />;
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}
