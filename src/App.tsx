import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeInit } from "@/hooks/useThemeInit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleProvider } from "@/contexts/RoleContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { SeparationProvider } from "@/contexts/SeparationContext";
import { AssetProvider } from "@/contexts/AssetContext";
import { ReportingProvider } from "@/contexts/ReportingContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { DeductionProvider } from "@/contexts/DeductionContext";
import { PerformanceCycleProvider } from "@/contexts/PerformanceCycleContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { BLEAccessProvider } from "@/contexts/BLEAccessContext";
import { LeaveTypeProvider } from "@/contexts/LeaveTypeContext";
import { ApprovalProvider } from "@/contexts/ApprovalContext";
import { CardProvider } from "@/contexts/CardContext";
import { AdvanceProvider } from "@/contexts/AdvanceContext";
import { ReminderSettingsProvider } from "@/contexts/ReminderSettingsContext";
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

import GPSTrackingPage from "@/pages/GPSTrackingPage";
import RatingCalibrationPage from "@/pages/performance/RatingCalibrationPage";
import SelfAssessmentPage from "@/pages/performance/SelfAssessmentPage";
import PeerAssessmentPage from "@/pages/performance/PeerAssessmentPage";
import ManagerAssessmentPage from "@/pages/performance/ManagerAssessmentPage";
import RatingsOverviewPage from "@/pages/performance/RatingsOverviewPage";
import QuestionnaireSettingsPage from "@/pages/performance/QuestionnaireSettingsPage";
import AssessmentRatingsPage from "@/pages/performance/AssessmentRatingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useThemeInit();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <ClientProvider>
        <SeparationProvider>
        <AssetProvider>
        <ReportingProvider>
        <EmployeeProvider>
        <DeductionProvider>
        <PerformanceCycleProvider>
        <AuditProvider>
        <BLEAccessProvider>
        <LeaveTypeProvider>
        <ApprovalProvider>
        <CardProvider>
        <AdvanceProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/payslips" element={<PayslipsPage />} />
              <Route path="/compensation" element={<CompensationPage />} />
              <Route path="/deductions" element={<DeductionsPage />} />
              <Route path="/settings/deductions" element={<PayrollSettingsPage />} />
              <Route path="/settings/tax" element={<PayrollSettingsPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expense-analytics" element={<ExpenseAnalyticsPage />} />
              <Route path="/advances" element={<AdvancesPage />} />
              <Route path="/outstanding-advances" element={<OutstandingAdvancesPage />} />
              <Route path="/expenses/gps" element={<GPSTrackingPage />} />
              <Route path="/cost-allocation" element={<CostAllocationPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/birthdays" element={<BirthdaysPage />} />
              <Route path="/assets/inventory" element={<AssetInventoryPage />} />
              <Route path="/assets/master-data" element={<AssetMasterDataPage />} />
              <Route path="/assets/categories" element={<AssetMasterDataPage />} />
              <Route path="/assets/store" element={<AssetStorePage />} />
              <Route path="/assets/requests" element={<AssetRequestsPage />} />
              <Route path="/assets/audits" element={<AssetAuditsPage />} />
              
              <Route path="/assets/dashboard" element={<AssetDashboardPage />} />
              <Route path="/org-chart" element={<OrgChartPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/timesheets" element={<TimesheetsPage />} />
              <Route path="/settings/payroll" element={<PayrollSettingsPage />} />
              <Route path="/settings/compensation" element={<PayrollSettingsPage />} />
              <Route path="/settings/company-structure" element={<CompanyStructurePage />} />
              <Route path="/settings/job-titles" element={<CompanyStructurePage />} />
              <Route path="/settings/departments" element={<CompanyStructurePage />} />
              <Route path="/settings/divisions" element={<CompanyStructurePage />} />
              <Route path="/settings/expense-categories" element={<ExpenseCategoriesPage />} />
              <Route path="/settings/users" element={<ApprovalMatrixPage />} />
              <Route path="/settings/approval-matrix" element={<ApprovalMatrixPage />} />
              <Route path="/settings/currency" element={<CompanyProfilePage />} />
              <Route path="/settings/projects" element={<ProjectSettingsPage />} />
              <Route path="/settings/company" element={<CompanyProfilePage />} />
              <Route path="/settings/gl-codes" element={<CompanyProfilePage />} />
              <Route path="/settings/eos-benefits" element={<PayrollSettingsPage />} />
              <Route path="/settings/leave-types" element={<PayrollSettingsPage />} />
              <Route path="/separations" element={<SeparationsPage />} />
              <Route path="/analytics" element={<PayrollAnalyticsPage />} />
              <Route path="/id-cards" element={<IDCardsPage />} />
              <Route path="/access-management" element={<AccessManagementPage />} />
              <Route path="/performance/ratings" element={<RatingsOverviewPage />} />
              <Route path="/performance/calibration" element={<RatingCalibrationPage />} />
              <Route path="/performance/self-assessment" element={<SelfAssessmentPage />} />
              <Route path="/performance/peer-assessment" element={<PeerAssessmentPage />} />
              <Route path="/performance/manager-assessment" element={<ManagerAssessmentPage />} />
              <Route path="/performance/questionnaire" element={<QuestionnaireSettingsPage />} />
              <Route path="/performance/assessment-ratings" element={<AssessmentRatingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
        </AdvanceProvider>
        </CardProvider>
        </ApprovalProvider>
        </LeaveTypeProvider>
        </BLEAccessProvider>
        </AuditProvider>
        </PerformanceCycleProvider>
        </DeductionProvider>
        </EmployeeProvider>
        </ReportingProvider>
        </AssetProvider>
        </SeparationProvider>
        </ClientProvider>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
