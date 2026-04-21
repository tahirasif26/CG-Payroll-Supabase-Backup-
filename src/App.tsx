import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeInit } from "@/hooks/useThemeInit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { SeparationProvider } from "@/contexts/SeparationContext";
import { AssetProvider } from "@/contexts/AssetContext";
import { ReportingProvider } from "@/contexts/ReportingContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { DeductionProvider } from "@/contexts/DeductionContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { BLEAccessProvider } from "@/contexts/BLEAccessContext";
import { LeaveTypeProvider } from "@/contexts/LeaveTypeContext";
import { ApprovalProvider } from "@/contexts/ApprovalContext";
import { CardProvider } from "@/contexts/CardContext";
import { AdvanceProvider } from "@/contexts/AdvanceContext";
import { ReminderSettingsProvider } from "@/contexts/ReminderSettingsContext";
import { PolicyProvider } from "@/contexts/PolicyContext";
import { EmployeeTypeProvider } from "@/contexts/EmployeeTypeContext";
import { PayrollSetupProvider } from "@/contexts/PayrollSetupContext";

// Eager-loaded (auth-critical, very small)
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes — drastically reduces initial bundle size
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const IDCardsPage = lazy(() => import("@/pages/IDCardsPage"));
const AccessManagementPage = lazy(() => import("@/pages/AccessManagementPage"));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage"));
const PayrollPage = lazy(() => import("@/pages/PayrollPage"));
const CompensationPage = lazy(() => import("@/pages/CompensationPage"));
const DeductionsPage = lazy(() => import("@/pages/DeductionsPage"));
const TaxPage = lazy(() => import("@/pages/TaxPage"));
const LoansPage = lazy(() => import("@/pages/LoansPage"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const ExpenseAnalyticsPage = lazy(() => import("@/pages/ExpenseAnalyticsPage"));
const CostAllocationPage = lazy(() => import("@/pages/CostAllocationPage"));
const LeavePage = lazy(() => import("@/pages/LeavePage"));
const BirthdaysPage = lazy(() => import("@/pages/BirthdaysPage"));
const PayslipsPage = lazy(() => import("@/pages/PayslipsPage"));
const AssetInventoryPage = lazy(() => import("@/pages/assets/AssetInventoryPage"));
const AssetMasterDataPage = lazy(() => import("@/pages/assets/AssetMasterDataPage"));
const AssetStorePage = lazy(() => import("@/pages/assets/AssetStorePage"));
const AssetRequestsPage = lazy(() => import("@/pages/assets/AssetRequestsPage"));
const AssetAuditsPage = lazy(() => import("@/pages/assets/AssetAuditsPage"));
const AssetDashboardPage = lazy(() => import("@/pages/assets/AssetDashboardPage"));
const OrgChartPage = lazy(() => import("@/pages/OrgChartPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const TimesheetsPage = lazy(() => import("@/pages/TimesheetsPage"));
const PayrollSettingsPage = lazy(() => import("@/pages/settings/PayrollSettingsPage"));
const CompanyStructurePage = lazy(() => import("@/pages/settings/CompanyStructurePage"));
const ExpenseCategoriesPage = lazy(() => import("@/pages/settings/ExpenseCategoriesPage"));
const ApprovalMatrixPage = lazy(() => import("@/pages/settings/ApprovalMatrixPage"));
const ProjectSettingsPage = lazy(() => import("@/pages/settings/ProjectSettingsPage"));
const CompanyProfilePage = lazy(() => import("@/pages/settings/CompanyProfilePage"));
const SeparationsPage = lazy(() => import("@/pages/SeparationsPage"));
const PayrollAnalyticsPage = lazy(() => import("@/pages/PayrollAnalyticsPage"));
const AdvancesPage = lazy(() => import("@/pages/AdvancesPage"));
const OutstandingAdvancesPage = lazy(() => import("@/pages/OutstandingAdvancesPage"));
const ReminderSettingsPage = lazy(() => import("@/pages/settings/ReminderSettingsPage"));
const CompanyPoliciesSettingsPage = lazy(() => import("@/pages/settings/CompanyPoliciesPage"));
const CompanyPoliciesPage = lazy(() => import("@/pages/CompanyPoliciesPage"));
const GPSTrackingPage = lazy(() => import("@/pages/GPSTrackingPage"));
const RatingCalibrationPage = lazy(() => import("@/pages/performance/RatingCalibrationPage"));
const SelfAssessmentPage = lazy(() => import("@/pages/performance/SelfAssessmentPage"));
const PeerAssessmentPage = lazy(() => import("@/pages/performance/PeerAssessmentPage"));
const ManagerAssessmentPage = lazy(() => import("@/pages/performance/ManagerAssessmentPage"));
const RatingsOverviewPage = lazy(() => import("@/pages/performance/RatingsOverviewPage"));
const QuestionnaireSettingsPage = lazy(() => import("@/pages/performance/QuestionnaireSettingsPage"));
const AssessmentRatingsPage = lazy(() => import("@/pages/performance/AssessmentRatingsPage"));
const ClientManagementPage = lazy(() => import("@/pages/ClientManagementPage"));
const PayrollSetupPage = lazy(() => import("@/pages/PayrollSetupPage"));
const PayrollSetupEditorPage = lazy(() => import("@/pages/PayrollSetupEditorPage"));
const PayrollSetupViewPage = lazy(() => import("@/pages/PayrollSetupViewPage"));
const FeatureAccessPage = lazy(() => import("@/pages/settings/FeatureAccessPage"));
const MyAccessPage = lazy(() => import("@/pages/MyAccessPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function RouteRedirector() {
  const { isSuperAdmin } = useRole();
  return <Navigate to={isSuperAdmin ? "/manage/clients" : "/"} replace />;
}

function AppRoutes() {
  const { session, loading } = useRole();

  // CRITICAL: Detect invite/recovery URLs BEFORE auth check.
  // The URL hash (#access_token=...&type=invite|recovery) MUST land on
  // ResetPasswordPage so the user can set a password — regardless of session state.
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const isInviteOrRecovery =
    hash.includes("type=invite") ||
    hash.includes("type=recovery") ||
    hash.includes("access_token");
  const isOnResetPasswordRoute =
    typeof window !== "undefined" && window.location.pathname === "/reset-password";

  if (isInviteOrRecovery || isOnResetPasswordRoute) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<ResetPasswordPage />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center">
            <span className="text-[28px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            <span className="text-[28px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
          </div>
          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <ChunkErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        <RouteErrorBoundary>
        <Routes>
          <Route path="/auth" element={<RouteRedirector />} />

          {/* Super-admin only */}
          <Route path="/manage/clients" element={
            <ProtectedRoute requiredRole="super_admin"><ClientManagementPage /></ProtectedRoute>
          } />

          {/* Open to all logged-in client users (admin/hr/employee) — super_admin redirected */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/payslips" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="payroll.view_own_payslip"><PayslipsPage /></ProtectedRoute>} />
          <Route path="/leave" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="leave.view_balance"><LeavePage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="expenses.view_own"><ExpensesPage /></ProtectedRoute>} />
          <Route path="/birthdays" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="employees.view_birthdays"><BirthdaysPage /></ProtectedRoute>} />
          <Route path="/org-chart" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="employees.view_org_chart"><OrgChartPage /></ProtectedRoute>} />
          <Route path="/company-policies" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="policies.view"><CompanyPoliciesPage /></ProtectedRoute>} />
          <Route path="/assets/store" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="assets.request_new"><AssetStorePage /></ProtectedRoute>} />
          <Route path="/timesheets" element={<ProtectedRoute requiredRole={["admin","hr","employee"]} requiredFeature="timesheets.submit"><TimesheetsPage /></ProtectedRoute>} />
          <Route path="/my-access" element={<ProtectedRoute requiredRole={["admin","hr","employee"]}><MyAccessPage /></ProtectedRoute>} />
          <Route path="/onboarding" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><OnboardingPage /></ProtectedRoute>
          } />
          <Route path="/settings/feature-access" element={
            <ProtectedRoute requiredRole={["super_admin","admin","hr"]}><FeatureAccessPage /></ProtectedRoute>
          } />

          {/* Employees — admin/hr */}
          <Route path="/employees" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><EmployeesPage /></ProtectedRoute>
          } />

          {/* Payroll — admin/hr */}
          <Route path="/payroll/setup" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSetupPage /></ProtectedRoute>
          } />
          <Route path="/payroll/setup/new" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSetupEditorPage /></ProtectedRoute>
          } />
          <Route path="/payroll/setup/:id/view" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSetupViewPage /></ProtectedRoute>
          } />
          <Route path="/payroll/setup/:id" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSetupEditorPage /></ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollPage /></ProtectedRoute>
          } />
          <Route path="/compensation" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompensationPage /></ProtectedRoute>
          } />
          <Route path="/deductions" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><DeductionsPage /></ProtectedRoute>
          } />
          <Route path="/loans" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><LoansPage /></ProtectedRoute>
          } />
          <Route path="/expense-analytics" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ExpenseAnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/advances" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AdvancesPage /></ProtectedRoute>
          } />
          <Route path="/outstanding-advances" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><OutstandingAdvancesPage /></ProtectedRoute>
          } />
          <Route path="/expenses/gps" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><GPSTrackingPage /></ProtectedRoute>
          } />
          <Route path="/cost-allocation" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CostAllocationPage /></ProtectedRoute>
          } />

          {/* Settings (admin/hr) */}
          <Route path="/settings/deductions" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/tax" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/payroll" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/compensation" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/company-structure" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyStructurePage /></ProtectedRoute>
          } />
          <Route path="/settings/job-titles" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyStructurePage /></ProtectedRoute>
          } />
          <Route path="/settings/departments" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyStructurePage /></ProtectedRoute>
          } />
          <Route path="/settings/divisions" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyStructurePage /></ProtectedRoute>
          } />
          <Route path="/settings/expense-categories" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ExpenseCategoriesPage /></ProtectedRoute>
          } />
          {/* Admin only — user mgmt + approval matrix */}
          <Route path="/settings/users" element={
            <ProtectedRoute requiredRole={["super_admin","admin"]}><ApprovalMatrixPage /></ProtectedRoute>
          } />
          <Route path="/settings/approval-matrix" element={
            <ProtectedRoute requiredRole="admin"><ApprovalMatrixPage /></ProtectedRoute>
          } />
          <Route path="/settings/currency" element={<Navigate to="/settings/company" replace />} />
          <Route path="/settings/projects" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ProjectSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/company" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyProfilePage /></ProtectedRoute>
          } />
          <Route path="/settings/gl-codes" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyProfilePage /></ProtectedRoute>
          } />
          <Route path="/settings/reminders" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ReminderSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/company-policies" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><CompanyPoliciesSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/eos-benefits" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/leave-types" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollSettingsPage /></ProtectedRoute>
          } />

          {/* Assets */}
          <Route path="/assets/inventory" element={
            <ProtectedRoute requiredRole={["admin", "hr"]} requiredFeature="assets.view_inventory"><AssetInventoryPage /></ProtectedRoute>
          } />
          <Route path="/assets/master-data" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AssetMasterDataPage /></ProtectedRoute>
          } />
          <Route path="/assets/categories" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AssetMasterDataPage /></ProtectedRoute>
          } />
          <Route path="/assets/requests" element={
            <ProtectedRoute requiredRole={["admin", "hr"]} requiredFeature="assets.approve_requests"><AssetRequestsPage /></ProtectedRoute>
          } />
          <Route path="/assets/audits" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AssetAuditsPage /></ProtectedRoute>
          } />
          <Route path="/assets/dashboard" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AssetDashboardPage /></ProtectedRoute>
          } />

          {/* Other admin/hr */}
          <Route path="/projects" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ProjectsPage /></ProtectedRoute>
          } />
          <Route path="/separations" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><SeparationsPage /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><PayrollAnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/id-cards" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><IDCardsPage /></ProtectedRoute>
          } />
          <Route path="/access-management" element={
            <ProtectedRoute requiredRole="admin"><AccessManagementPage /></ProtectedRoute>
          } />

          {/* Performance */}
          <Route path="/performance/ratings" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><RatingsOverviewPage /></ProtectedRoute>
          } />
          <Route path="/performance/calibration" element={
            <ProtectedRoute requiredRole="admin"><RatingCalibrationPage /></ProtectedRoute>
          } />
          <Route path="/performance/self-assessment" element={
            <ProtectedRoute requiredFeature="performance.self_assessment"><SelfAssessmentPage /></ProtectedRoute>
          } />
          <Route path="/performance/peer-assessment" element={
            <ProtectedRoute requiredFeature="performance.peer_assessment"><PeerAssessmentPage /></ProtectedRoute>
          } />
          <Route path="/performance/manager-assessment" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><ManagerAssessmentPage /></ProtectedRoute>
          } />
          <Route path="/performance/questionnaire" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><QuestionnaireSettingsPage /></ProtectedRoute>
          } />
          <Route path="/performance/assessment-ratings" element={
            <ProtectedRoute requiredRole={["admin", "hr"]}><AssessmentRatingsPage /></ProtectedRoute>
          } />

          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </RouteErrorBoundary>
      </Suspense>
      </ChunkErrorBoundary>
    </AppLayout>
  );
}

const App = () => {
  useThemeInit();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <ClientProvider>
          <SeparationProvider>
          <EmployeeProvider>
          <AssetProvider>
          <ReportingProvider>
          <DeductionProvider>
          <AuditProvider>
          <BLEAccessProvider>
          <LeaveTypeProvider>
          <ApprovalProvider>
          <CardProvider>
          <AdvanceProvider>
          <ReminderSettingsProvider>
          <PolicyProvider>
          <EmployeeTypeProvider>
          <PayrollSetupProvider>
            <AppRoutes />
          </PayrollSetupProvider>
          </EmployeeTypeProvider>
          </PolicyProvider>
          </ReminderSettingsProvider>
          </AdvanceProvider>
          </CardProvider>
          </ApprovalProvider>
          </LeaveTypeProvider>
          </BLEAccessProvider>
          </AuditProvider>
          </DeductionProvider>
          </ReportingProvider>
          </AssetProvider>
          </EmployeeProvider>
          </SeparationProvider>
          </ClientProvider>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
