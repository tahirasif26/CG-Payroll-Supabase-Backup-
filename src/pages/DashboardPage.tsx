import { Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { DashboardSkeleton } from "@/components/dashboards/DashboardSkeleton";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import SuperAdminDashboard from "@/pages/dashboards/SuperAdminDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import EmployeeDashboard from "@/pages/dashboards/EmployeeDashboard";
import AdminEssDashboard from "@/pages/dashboards/AdminEssDashboard";

export default function DashboardPage() {
  const { appRole, isSuperAdmin, loading } = useRole();
  const { scope } = useViewScope();
  const { status, isLoading: setupLoading } = useOnboardingStatus();

  if (loading) return <DashboardSkeleton />;
  if (isSuperAdmin) return <SuperAdminDashboard />;

  // First-login redirect: admin/HR land on the wizard until setup is complete,
  // unless they explicitly dismissed the banner (then the banner stays hidden
  // and they get the dashboard; they can resume from /onboarding any time).
  if (appRole === "admin" || appRole === "hr") {
    if (setupLoading) return <DashboardSkeleton />;
    if (status && !status.isComplete && !status.dismissedAt) {
      return <Navigate to="/onboarding" replace />;
    }
    if (scope === "me") return <AdminEssDashboard />;
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}
