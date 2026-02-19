import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleProvider } from "@/contexts/RoleContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/payslips" element={<PayslipsPage />} />
              <Route path="/compensation" element={<CompensationPage />} />
              <Route path="/deductions" element={<DeductionsPage />} />
              <Route path="/tax" element={<TaxPage />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
