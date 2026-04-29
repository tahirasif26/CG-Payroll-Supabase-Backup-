import EmployeeDashboard from "@/pages/dashboards/EmployeeDashboard";

/**
 * Personal ESS dashboard for admin / HR users when they switch to "Me" scope.
 * Reuses EmployeeDashboard which is already driven by `useMyDashboard()`
 * (latest payslip, leave balance, my expenses, my assets, etc.).
 */
export default function AdminEssDashboard() {
  return <EmployeeDashboard />;
}
