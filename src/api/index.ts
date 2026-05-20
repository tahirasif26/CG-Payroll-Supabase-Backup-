// ─── Barrel export for the cg-payroll API service layer ─────────────────────
// Components and hooks should import from "@/api" rather than reaching into
// subfolders.

export { apiClient, apiGet, apiPost, apiPatch, apiPut, apiDelete, apiGetWithMeta, onAuthEvent } from "./client";
export { tokenStorage } from "./token-storage";
export { ApiClientError, isApiClientError } from "./errors";
export type { ApiResponse, ApiError, ApiMeta, PaginationMeta, PaginationQuery, Paginated } from "./types";

// ─── Auth ────────────────────────────────────────────────────────────────────
export { authApi } from "./auth/auth.api";
export {
  authKeys,
  useLogin,
  useRegister,
  useLogout,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
  useChangePassword,
} from "./auth/auth.hooks";
export type {
  AppRole,
  AuthSession,
  AuthSessionUser,
  JwtRoleBinding,
  LoginRequest,
  RegisterRequest,
  LogoutRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
} from "./auth/auth.types";

// ─── Users ───────────────────────────────────────────────────────────────────
export { usersApi } from "./users/users.api";
export type { EffectiveFeatures } from "./users/users.api";
export {
  userKeys,
  useMe,
  useUpdateProfile,
  useMyEffectiveFeatures,
} from "./users/users.hooks";
export type {
  CurrentUser,
  CurrentUserProfile,
  CurrentUserRoleBinding,
  CurrentUserEmployee,
  UpdateProfileRequest,
} from "./users/users.types";

// ─── Tenants ─────────────────────────────────────────────────────────────────
export { tenantsApi } from "./tenants/tenants.api";
export {
  tenantKeys,
  tabAccessKeys,
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useTenantTabAccess,
  useSetTenantTabAccess,
  useMyTabs,
} from "./tenants/tenants.hooks";
export type {
  Tenant,
  ClientStatus,
  SubscriptionPlan,
  CreateTenantRequest,
  CreateTenantResponse,
  UpdateTenantRequest,
  TenantTabAccess,
  MyTabsResponse,
} from "./tenants/tenants.types";

// ─── Employees ───────────────────────────────────────────────────────────────
export { employeesApi } from "./employees/employees.api";
export {
  employeeKeys,
  useEmployees,
  useEmployee,
  useEmployeeProfile,
  useMyEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useUpdateEmployeeProfile,
  useArchiveEmployee,
} from "./employees/employees.hooks";
export type {
  Employee,
  EmployeeDirectoryItem,
  EmployeeWithRelations,
  EmployeeProfile,
  EmployeeStatus,
  ListEmployeesQuery,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ArchiveEmployeeRequest,
  EmployeeAddress,
  EmployeeBankDetails,
  EmployeeEmergencyContact,
  EmployeeEducation,
  EmployeeDocument,
  EmployeeCompensation,
  AddressInput,
  BankDetailsInput,
  EmergencyContactInput,
  EducationRowInput,
  DocumentRowInput,
  CompensationRowInput,
  UpdateEmployeeProfileRequest,
} from "./employees/employees.types";

// ─── Audit ───────────────────────────────────────────────────────────────────
export { auditApi } from "./audit/audit.api";
export { auditKeys, useAuditLogs } from "./audit/audit.hooks";
export type { AuditLogEntry, ListAuditQuery as ListAuditLogsQuery } from "./audit/audit.types";

// ─── Notifications ───────────────────────────────────────────────────────────
export { notificationsApi } from "./notifications/notifications.api";
export {
  notificationKeys,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "./notifications/notifications.hooks";
export type {
  Notification,
  NotificationSeverity,
  ListNotificationsQuery,
  MarkReadRequest,
  MarkReadResponse,
  UnreadCountResponse,
} from "./notifications/notifications.types";

// ─── Invitations ─────────────────────────────────────────────────────────────
export { invitationsApi } from "./invitations/invitations.api";
export {
  invitationKeys,
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useRevokeInvitation,
  useAcceptInvitation,
} from "./invitations/invitations.hooks";
export type {
  Invitation,
  InvitationStatus,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
} from "./invitations/invitations.types";

// ─── Leave ───────────────────────────────────────────────────────────────────
export { leaveApi } from "./leave/leave.api";
export {
  leaveKeys,
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useLeaveBalances,
  useUpsertLeaveBalance,
  useLeaveRequests,
  useCreateLeaveRequest,
  useDecideLeaveRequest,
  useCancelLeaveRequest,
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "./leave/leave.hooks";
export type {
  LeaveAccrualType,
  LeaveRequestStatus,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  ListLeaveRequestsQuery,
  CreateLeaveTypeRequest,
  UpdateLeaveTypeRequest,
  UpsertBalanceRequest,
  CreateLeaveRequestRequest,
  DecideLeaveRequestRequest,
  CreateHolidayRequest,
  UpdateHolidayRequest,
  ListHolidaysQuery,
} from "./leave/leave.types";

// ─── Expenses ────────────────────────────────────────────────────────────────
export { expensesApi } from "./expenses/expenses.api";
export {
  expenseKeys,
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useSubmitExpense,
  useDecideExpense,
  useMarkExpensePaid,
  useDeleteExpense,
} from "./expenses/expenses.hooks";
export type {
  Expense,
  ExpenseStatus,
  ListExpensesQuery,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  DecideExpenseRequest,
} from "./expenses/expenses.types";

// ─── Advances ────────────────────────────────────────────────────────────────
export { advancesApi } from "./advances/advances.api";
export {
  advanceKeys,
  useAdvances,
  useAdvance,
  useCreateAdvance,
  useUpdateAdvance,
  useSubmitAdvance,
  useDecideAdvance,
  useSettleAdvance,
  useCancelAdvance,
} from "./advances/advances.hooks";
export type {
  Advance,
  AdvanceStatus,
  ListAdvancesQuery,
  CreateAdvanceRequest,
  UpdateAdvanceRequest,
  DecideAdvanceRequest,
  SettleAdvanceRequest,
} from "./advances/advances.types";

// ─── Loans ───────────────────────────────────────────────────────────────────
export { loansApi } from "./loans/loans.api";
export {
  loanKeys,
  useLoans,
  useLoan,
  useCreateLoan,
  useUpdateLoan,
  useDecideLoan,
  usePauseLoan,
  useResumeLoan,
  useAdjustLoan,
} from "./loans/loans.hooks";
export type {
  Loan,
  LoanStatus,
  LoanTxnType,
  LoanTransaction,
  ListLoansQuery,
  CreateLoanRequest,
  UpdateLoanRequest,
  DecideLoanRequest,
  PauseLoanRequest,
  AdjustLoanRequest,
} from "./loans/loans.types";

// ─── Assets ──────────────────────────────────────────────────────────────────
export { assetsApi } from "./assets/assets.api";
export {
  assetKeys,
  useAssets,
  useAsset,
  useCreateAsset,
  useUpdateAsset,
  useAssignAsset,
  useUnassignAsset,
  useDeleteAsset,
} from "./assets/assets.hooks";
export type {
  Asset,
  AssetStatus,
  AssetHistoryEntry,
  ListAssetsQuery,
  CreateAssetRequest,
  UpdateAssetRequest,
  AssignAssetRequest,
  UnassignAssetRequest,
} from "./assets/assets.types";

// ─── Approvals (Phase 5) ─────────────────────────────────────────────────────
export { approvalsApi } from "./approvals/approvals.api";
export {
  approvalKeys,
  useApprovalGroups,
  useCreateApprovalGroup,
  useUpdateApprovalGroup,
  useDeleteApprovalGroup,
  useApprovalPolicies,
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
  useApprovalDelegations,
  useCreateApprovalDelegation,
  useRevokeApprovalDelegation,
  useApprovalRequests,
  useApprovalRequest,
  useDecideApprovalRequest,
} from "./approvals/approvals.hooks";
export type {
  ApprovalGroup,
  ApprovalPolicy,
  ApprovalPolicyLevel,
  ApprovalDelegation,
  ApprovalModule,
  ApprovalType,
  ApprovalMode,
  RequestApprovalStatus,
  RequestApproval,
  RequestAssignment,
  RequestApprovalHistoryEntry,
  ListRequestApprovalsQuery,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyLevelInput,
  CreateDelegationRequest,
  DecideRequestRequest,
} from "./approvals/approvals.types";

// ─── Payroll (Phase 6) ───────────────────────────────────────────────────────
export { payrollApi } from "./payroll/payroll.api";
export {
  payrollKeys,
  usePayrollSetups,
  usePayrollSetup,
  useCreatePayrollSetup,
  useUpdatePayrollSetup,
  useActivatePayrollSetup,
  usePayrollRuns,
  usePayrollRun,
  useCreatePayrollRun,
  useCalculatePayrollRun,
  useSubmitPayrollRun,
  useFinalizeApprovePayrollRun,
  useCompletePayrollRun,
  useAddPayrollOneOff,
  useRemovePayrollOneOff,
  useMyPayslips,
} from "./payroll/payroll.hooks";
export type {
  PayFrequency,
  PayrollSetupStatus,
  PayrollComponentType,
  PayrollCalcType,
  PayrollRunStatus,
  PayrollSetup,
  PayrollSetupComponent,
  PayrollSetupTaxRule,
  PayrollRun,
  PayrollLine,
  PayrollOneOff,
  Payslip,
  CreatePayrollSetupRequest,
  UpdatePayrollSetupRequest,
  CreatePayrollRunRequest,
  ListPayrollRunsQuery,
  OneOffAdjustmentRequest,
  ComponentInput,
  TaxRuleInput,
} from "./payroll/payroll.types";

// ─── Performance (Phase 7) ───────────────────────────────────────────────────
export { performanceApi } from "./performance/performance.api";
export {
  performanceKeys,
  usePerformanceCycles,
  useCreatePerformanceCycle,
  useSetCycleStatus,
  useQuestionnaires,
  useUpsertQuestionnaire,
  usePerformanceAssessments,
  useCreateAssessment,
  useSubmitAssessment,
  useCalibrations,
  useUpsertCalibration,
} from "./performance/performance.hooks";
export type {
  PerformanceCycleStatus,
  AssessmentType,
  AssessmentStatus,
  PerformanceCycle,
  PerformanceQuestionnaire,
  PerformanceAssessment,
  PerformanceCalibration,
  CreateCycleRequest,
  UpsertQuestionnaireRequest,
  CreateAssessmentRequest,
  SubmitAssessmentRequest,
  UpsertCalibrationRequest,
} from "./performance/performance.types";

// ─── Separations (Phase 7) ───────────────────────────────────────────────────
export { separationsApi } from "./separations/separations.api";
export {
  separationKeys,
  useSeparations,
  useSeparation,
  usePreviewEosb,
  useCreateSeparation,
  useApproveSeparation,
  useProcessSeparation,
} from "./separations/separations.hooks";
export type {
  Separation,
  SeparationStatus,
  SeparationType,
  EosbPreview,
  EosbPreviewRequest,
  ListSeparationsQuery,
  CreateSeparationRequest,
} from "./separations/separations.types";
