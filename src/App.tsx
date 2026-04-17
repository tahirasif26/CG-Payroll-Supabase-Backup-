import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeInit } from "@/hooks/useThemeInit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import IDCardsPage from "@/pages/IDCardsPage";
import AccessManagementPage from "@/pages/AccessManagementPage";
import DashboardPage from "@/pages/DashboardPage";
import EmployeesPage from "@/pages/EmployeesPage";
import PayrollPage from "@/pages/PayrollPage";
import CompensationPage from "@/pages/CompensationPage";
import DeductionsPage from "@/pages/DeductionsPage";
import TaxPage from "@/pages/TaxPage";
import LoansPage from "@/pages/LoansPage";
import ExpensesPage from "@/pages/ExpensesPage";
import ExpenseAnalyticsPage from "@/pages/ExpenseAnalyticsPage";
import CostAllocationPage from "@/pages/CostAllocationPage";
import LeavePage from "@/pages/LeavePage";
import BirthdaysPage from "@/pages/BirthdaysPage";
import PayslipsPage from "@/pages/PayslipsPage";
import AssetInventoryPage from "@/pages/assets/AssetInventoryPage";
import AssetMasterDataPage from "@/pages/assets/AssetMasterDataPage";
import AssetStorePage from "@/pages/assets/AssetStorePage";
import AssetRequestsPage from "@/pages/assets/AssetRequestsPage";
import AssetAuditsPage from "@/pages/assets/AssetAuditsPage";
import AssetDashboardPage from "@/pages/assets/AssetDashboardPage";
import OrgChartPage from "@/pages/OrgChartPage";
import ProjectsPage from "@/pages/ProjectsPage";
import TimesheetsPage from "@/pages/TimesheetsPage";
import PayrollSettingsPage from "@/pages/settings/PayrollSettingsPage";
import CompanyStructurePage from "@/pages/settings/CompanyStructurePage";
import ExpenseCategoriesPage from "@/pages/settings/ExpenseCategoriesPage";
import UserManagementPage from "@/pages/settings/UserManagementPage";
import ApprovalMatrixPage from "@/pages/settings/ApprovalMatrixPage";
import CurrencySettingsPage from "@/pages/settings/CurrencySettingsPage";
import ProjectSettingsPage from "@/pages/settings/ProjectSettingsPage";
import CompanyProfilePage from "@/pages/settings/CompanyProfilePage";
import GLCodeMappingPage from "@/pages/settings/GLCodeMappingPage";
import EOSBenefitsPage from "@/pages/settings/EOSBenefitsPage";
import LeaveTypesPage from "@/pages/settings/LeaveTypesPage";
import SeparationsPage from "@/pages/SeparationsPage";
import PayrollAnalyticsPage from "@/pages/PayrollAnalyticsPage";
import AdvancesPage from "@/pages/AdvancesPage";
import OutstandingAdvancesPage from "@/pages/OutstandingAdvancesPage";
import ReminderSettingsPage from "@/pages/settings/ReminderSettingsPage";
import CompanyPoliciesSettingsPage from "@/pages/settings/CompanyPoliciesPage";
import CompanyPoliciesPage from "@/pages/CompanyPoliciesPage";
import GPSTrackingPage from "@/pages/GPSTrackingPage";
import RatingCalibrationPage from "@/pages/performance/RatingCalibrationPage";
import SelfAssessmentPage from "@/pages/performance/SelfAssessmentPage";
import PeerAssessmentPage from "@/pages/performance/PeerAssessmentPage";
import ManagerAssessmentPage from "@/pages/performance/ManagerAssessmentPage";
import RatingsOverviewPage from "@/pages/performance/RatingsOverviewPage";
import QuestionnaireSettingsPage from "@/pages/performance/QuestionnaireSettingsPage";
import AssessmentRatingsPage from "@/pages/performance/AssessmentRatingsPage";
import NotFound from "./pages/NotFound";
import ClientManagementPage from "@/pages/ClientManagementPage";
import PayrollSetupPage from "@/pages/PayrollSetupPage";
import PayrollSetupEditorPage from "@/pages/PayrollSetupEditorPage";
import PayrollSetupViewPage from "@/pages/PayrollSetupViewPage";

const queryClient = new QueryClient();

function RouteRedirector() {
  const { isSuperAdmin } = useRole();
  return <Navigate to={isSuperAdmin ? "/manage/clients" : "/"} replace />;
}

function AppRoutes() {
  const { session, loading } = useRole();

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
      <Routes>
        <Route path="/auth" element={<RouteRedirector />} />

        {/* Super-admin only */}
        <Route path="/manage/clients" element={
          <ProtectedRoute requiredRole="super_admin"><ClientManagementPage /></ProtectedRoute>
        } />

        {/* Open to all logged-in users (page-level filtering) */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/payslips" element={<PayslipsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/birthdays" element={<BirthdaysPage />} />
        <Route path="/org-chart" element={<OrgChartPage />} />
        <Route path="/company-policies" element={<CompanyPoliciesPage />} />
        <Route path="/assets/store" element={<AssetStorePage />} />
        <Route path="/timesheets" element={<TimesheetsPage />} />

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
          <ProtectedRoute requiredRole="admin"><ApprovalMatrixPage /></ProtectedRoute>
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
