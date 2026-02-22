import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import CostAllocationPage from "@/pages/CostAllocationPage";
import LeavePage from "@/pages/LeavePage";
import BirthdaysPage from "@/pages/BirthdaysPage";
import PayslipsPage from "@/pages/PayslipsPage";
import AssetsPage from "@/pages/AssetsPage";
import OrgChartPage from "@/pages/OrgChartPage";
import ProjectsPage from "@/pages/ProjectsPage";
import TimesheetsPage from "@/pages/TimesheetsPage";
import CompensationSettingsPage from "@/pages/settings/CompensationSettingsPage";
import JobTitlesPage from "@/pages/settings/JobTitlesPage";
import DepartmentsPage from "@/pages/settings/DepartmentsPage";
import DivisionsPage from "@/pages/settings/DivisionsPage";
import ExpenseCategoriesPage from "@/pages/settings/ExpenseCategoriesPage";
import UserManagementPage from "@/pages/settings/UserManagementPage";
import CurrencySettingsPage from "@/pages/settings/CurrencySettingsPage";
import ProjectSettingsPage from "@/pages/settings/ProjectSettingsPage";
import CompanySettingsPage from "@/pages/settings/CompanySettingsPage";
import GLCodeMappingPage from "@/pages/settings/GLCodeMappingPage";
import EOSBenefitsPage from "@/pages/settings/EOSBenefitsPage";
import LeaveTypesPage from "@/pages/settings/LeaveTypesPage";
import SeparationsPage from "@/pages/SeparationsPage";
import RatingCalibrationPage from "@/pages/performance/RatingCalibrationPage";
import SelfAssessmentPage from "@/pages/performance/SelfAssessmentPage";
import PeerAssessmentPage from "@/pages/performance/PeerAssessmentPage";
import ManagerAssessmentPage from "@/pages/performance/ManagerAssessmentPage";
import RatingsOverviewPage from "@/pages/performance/RatingsOverviewPage";
import QuestionnaireSettingsPage from "@/pages/performance/QuestionnaireSettingsPage";
import AssessmentRatingsPage from "@/pages/performance/AssessmentRatingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/payslips" element={<PayslipsPage />} />
              <Route path="/compensation" element={<CompensationPage />} />
              <Route path="/deductions" element={<DeductionsPage />} />
              <Route path="/settings/deductions" element={<DeductionsPage />} />
              <Route path="/tax" element={<TaxPage />} />
              <Route path="/settings/tax" element={<TaxPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/cost-allocation" element={<CostAllocationPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/birthdays" element={<BirthdaysPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/org-chart" element={<OrgChartPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/timesheets" element={<TimesheetsPage />} />
              <Route path="/settings/compensation" element={<CompensationSettingsPage />} />
              <Route path="/settings/job-titles" element={<JobTitlesPage />} />
              <Route path="/settings/departments" element={<DepartmentsPage />} />
              <Route path="/settings/divisions" element={<DivisionsPage />} />
              <Route path="/settings/expense-categories" element={<ExpenseCategoriesPage />} />
              <Route path="/settings/users" element={<UserManagementPage />} />
              <Route path="/settings/currency" element={<CurrencySettingsPage />} />
              <Route path="/settings/projects" element={<ProjectSettingsPage />} />
              <Route path="/settings/company" element={<CompanySettingsPage />} />
              <Route path="/settings/gl-codes" element={<GLCodeMappingPage />} />
              <Route path="/settings/eos-benefits" element={<EOSBenefitsPage />} />
              <Route path="/settings/leave-types" element={<LeaveTypesPage />} />
              <Route path="/separations" element={<SeparationsPage />} />
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

export default App;
