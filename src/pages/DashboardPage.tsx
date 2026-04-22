import { useRole } from "@/contexts/RoleContext";
import { DashboardSkeleton } from "@/components/dashboards/DashboardSkeleton";
import SuperAdminDashboard from "@/pages/dashboards/SuperAdminDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import HRDashboard from "@/pages/dashboards/HRDashboard";
import EmployeeDashboard from "@/pages/dashboards/EmployeeDashboard";

export default function DashboardPage() {
  const { appRole, isSuperAdmin, loading } = useRole();

  if (loading) return <DashboardSkeleton />;
  if (isSuperAdmin) return <SuperAdminDashboard />;
  if (appRole === "admin") return <AdminDashboard />;
  if (appRole === "hr") return <HRDashboard />;
  return <EmployeeDashboard />;
}
