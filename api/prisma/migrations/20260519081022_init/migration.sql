-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('super_admin', 'admin', 'hr', 'employee');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'suspended', 'trial');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'on_leave', 'separated', 'pending');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('info', 'warning', 'urgent');

-- CreateEnum
CREATE TYPE "LeaveAccrualType" AS ENUM ('none', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "ApprovalModule" AS ENUM ('leave', 'expense', 'advance', 'loan', 'asset', 'payroll');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('any_one', 'all_must', 'majority');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('sequential', 'parallel');

-- CreateEnum
CREATE TYPE "RequestApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'acted', 'skipped');

-- CreateEnum
CREATE TYPE "ApprovalHistoryAction" AS ENUM ('approve', 'reject', 'comment', 'delegate', 'cancel', 'system_advance');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('monthly', 'biweekly', 'weekly');

-- CreateEnum
CREATE TYPE "PayrollSetupStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "PayrollComponentType" AS ENUM ('earning', 'deduction');

-- CreateEnum
CREATE TYPE "PayrollCalcType" AS ENUM ('fixed', 'percentage', 'formula');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('draft', 'calculated', 'pending_approval', 'approved', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('draft', 'open', 'in_calibration', 'closed');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('self', 'peer', 'manager');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('pending', 'submitted');

-- CreateEnum
CREATE TYPE "SeparationStatus" AS ENUM ('pending', 'approved', 'processed', 'cancelled');

-- CreateEnum
CREATE TYPE "SeparationType" AS ENUM ('resignation', 'termination', 'end_of_contract', 'retirement');

-- CreateEnum
CREATE TYPE "ReminderCategory" AS ENUM ('document_expiry', 'asset_warranty', 'asset_service', 'advance_settlement', 'probation_end', 'birthday', 'work_anniversary', 'policy_ack', 'approval_pending', 'payroll_due', 'performance_assessment');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('once', 'daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('info', 'warning', 'urgent');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "LoanTxnType" AS ENUM ('disbursement', 'emi', 'prepayment', 'writeoff', 'pause', 'resume', 'adjustment');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('in_stock', 'assigned', 'in_repair', 'retired', 'lost');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_slug" TEXT NOT NULL,
    "company_email" TEXT NOT NULL,
    "company_phone" TEXT,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'trial',
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'starter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "primary_client_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" UUID,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "name" TEXT NOT NULL,
    "app_role" "AppRole" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "client_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_enabled_for_roles" "AppRole"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_toggles" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "feature_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "emp_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "personal_email" TEXT,
    "phone" TEXT,
    "personal_phone" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "marital_status" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "division" TEXT,
    "category" TEXT,
    "joining_date" DATE,
    "probation_end_date" DATE,
    "separation_date" DATE,
    "work_location_country" TEXT,
    "work_location_city" TEXT,
    "pay_currency" TEXT,
    "reports_to_id" UUID,
    "avatar_url" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_addresses" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_bank_details" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "bank_name" TEXT,
    "bank_country" TEXT,
    "swift_code" TEXT,
    "iban" TEXT,
    "bank_currency" TEXT,
    "beneficiary_name" TEXT,
    "bank_address" TEXT,
    "account_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_emergency_contacts" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT,
    "relation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_education" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "institution" TEXT,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "doc_type" TEXT,
    "doc_number" TEXT,
    "issue_date" DATE,
    "expiry_date" DATE,
    "file_url" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_compensation" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "component_name" TEXT NOT NULL,
    "component_type" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT,
    "effective_from" DATE,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "user_id" UUID,
    "user_email" TEXT,
    "user_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_label" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "category" TEXT NOT NULL,
    "link" TEXT,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'info',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "actor_user_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "emp_id" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "app_role" "AppRole" NOT NULL,
    "role_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_user_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "days_per_year" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "accrual_type" "LeaveAccrualType" NOT NULL DEFAULT 'yearly',
    "max_carryforward" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "gender_specific" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "used" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "carried_forward" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(6,2) NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "category" TEXT,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "expense_date" DATE NOT NULL,
    "description" TEXT,
    "receipt_url" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'draft',
    "project_code" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "amount_used" BIGINT NOT NULL DEFAULT 0,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'draft',
    "expected_spend_date" DATE,
    "settlement_due_date" DATE,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "principal" BIGINT NOT NULL,
    "remaining_balance" BIGINT NOT NULL,
    "interest_rate_bps" INTEGER NOT NULL DEFAULT 0,
    "monthly_deduction" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "paused_until" DATE,
    "pre_pause_emi" BIGINT,
    "status" "LoanStatus" NOT NULL DEFAULT 'draft',
    "reason" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_transactions" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" "LoanTxnType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "emi_at_time" BIGINT,
    "date" DATE NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "condition" TEXT,
    "location" TEXT,
    "assigned_to_id" UUID,
    "assigned_date" DATE,
    "status" "AssetStatus" NOT NULL DEFAULT 'in_stock',
    "purchase_date" DATE,
    "purchase_cost" BIGINT,
    "warranty_expiry" DATE,
    "service_due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_history" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "from_employee_id" UUID,
    "to_employee_id" UUID,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "performed_by_id" UUID,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_groups" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "approval_type" "ApprovalType" NOT NULL DEFAULT 'any_one',
    "max_limit_minor" BIGINT,
    "escalate_after_days" INTEGER,
    "escalate_to_group_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_group_members" (
    "group_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_group_members_pkey" PRIMARY KEY ("group_id","employee_id")
);

-- CreateTable
CREATE TABLE "approval_policies" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "module" "ApprovalModule" NOT NULL,
    "category" TEXT,
    "min_value_minor" BIGINT NOT NULL DEFAULT 0,
    "max_value_minor" BIGINT,
    "group_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policy_levels" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "level_order" INTEGER NOT NULL,
    "group_id" UUID NOT NULL,
    "mode" "ApprovalMode" NOT NULL DEFAULT 'sequential',
    "sla_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policy_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_delegations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "from_employee_id" UUID NOT NULL,
    "to_employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "fallback_employee_id" UUID,
    "reason" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_approvals" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "module" "ApprovalModule" NOT NULL,
    "entity_id" UUID NOT NULL,
    "policy_id" UUID,
    "requester_employee_id" UUID NOT NULL,
    "value_minor" BIGINT NOT NULL,
    "value_unit" TEXT NOT NULL DEFAULT 'AED',
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "current_group_id" UUID,
    "status" "RequestApprovalStatus" NOT NULL DEFAULT 'pending',
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_approval_history" (
    "id" UUID NOT NULL,
    "request_approval_id" UUID NOT NULL,
    "level_order" INTEGER NOT NULL,
    "action" "ApprovalHistoryAction" NOT NULL,
    "actor_user_id" UUID,
    "actor_employee_id" UUID,
    "on_behalf_of_employee_id" UUID,
    "group_id" UUID,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_assignments" (
    "id" UUID NOT NULL,
    "request_approval_id" UUID NOT NULL,
    "level_order" INTEGER NOT NULL,
    "group_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "via_delegation" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
    "acted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_setups" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "pay_frequency" "PayFrequency" NOT NULL DEFAULT 'monthly',
    "year_end_date" DATE,
    "status" "PayrollSetupStatus" NOT NULL DEFAULT 'draft',
    "options" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_setup_components" (
    "id" UUID NOT NULL,
    "payroll_setup_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PayrollComponentType" NOT NULL,
    "calculation_type" "PayrollCalcType" NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "formula" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_setup_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_setup_tax_rules" (
    "id" UUID NOT NULL,
    "payroll_setup_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "slab_name" TEXT NOT NULL,
    "income_from_minor" BIGINT NOT NULL,
    "income_to_minor" BIGINT,
    "rate_bps" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_setup_tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "payroll_setup_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'draft',
    "total_gross_minor" BIGINT NOT NULL DEFAULT 0,
    "total_deductions_minor" BIGINT NOT NULL DEFAULT 0,
    "total_net_minor" BIGINT NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "run_date" TIMESTAMP(3),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_by_user_id" UUID,
    "locked_at" TIMESTAMP(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_lines" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "basic_minor" BIGINT NOT NULL DEFAULT 0,
    "allowances_minor" BIGINT NOT NULL DEFAULT 0,
    "gross_minor" BIGINT NOT NULL DEFAULT 0,
    "tax_deduction_minor" BIGINT NOT NULL DEFAULT 0,
    "loan_deduction_minor" BIGINT NOT NULL DEFAULT 0,
    "statutory_deduction_minor" BIGINT NOT NULL DEFAULT 0,
    "other_deductions_minor" BIGINT NOT NULL DEFAULT 0,
    "total_deductions_minor" BIGINT NOT NULL DEFAULT 0,
    "expense_reimbursement_minor" BIGINT NOT NULL DEFAULT 0,
    "advance_given_minor" BIGINT NOT NULL DEFAULT 0,
    "one_off_benefits_minor" BIGINT NOT NULL DEFAULT 0,
    "one_off_deductions_minor" BIGINT NOT NULL DEFAULT 0,
    "separation_settlement_minor" BIGINT NOT NULL DEFAULT 0,
    "net_pay_minor" BIGINT NOT NULL DEFAULT 0,
    "pay_currency" TEXT NOT NULL,
    "exchange_rate" DECIMAL(20,8) NOT NULL DEFAULT 1,
    "net_in_reporting_currency_minor" BIGINT NOT NULL DEFAULT 0,
    "snapshot_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_one_off_adjustments" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "type" "PayrollComponentType" NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_one_off_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "payroll_line_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3),
    "viewed_by_employee_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_questionnaires" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "audience" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_assessments" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "responses" JSONB NOT NULL DEFAULT '{}',
    "rating" DECIMAL(4,2),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_calibrations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "original_rating" DECIMAL(4,2),
    "calibrated_rating" DECIMAL(4,2),
    "notes" TEXT,
    "calibrated_by_user_id" UUID,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "separations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "last_working_date" DATE NOT NULL,
    "reason" TEXT,
    "type" "SeparationType" NOT NULL,
    "notice_period_days" INTEGER NOT NULL DEFAULT 0,
    "notice_period_served" BOOLEAN NOT NULL DEFAULT true,
    "unpaid_salary_minor" BIGINT NOT NULL DEFAULT 0,
    "eosb_amount_minor" BIGINT NOT NULL DEFAULT 0,
    "eosb_breakdown" JSONB NOT NULL DEFAULT '{}',
    "leave_encashment_minor" BIGINT NOT NULL DEFAULT 0,
    "notice_period_pay_minor" BIGINT NOT NULL DEFAULT 0,
    "loan_deduction_minor" BIGINT NOT NULL DEFAULT 0,
    "total_settlement_minor" BIGINT NOT NULL DEFAULT 0,
    "status" "SeparationStatus" NOT NULL DEFAULT 'pending',
    "payroll_run_id" UUID,
    "approved_by_user_id" UUID,
    "processed_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "separations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_rules" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "category" "ReminderCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "lead_days_before" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "repeat_frequency" "ReminderFrequency" NOT NULL DEFAULT 'once',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" "ReminderPriority" NOT NULL DEFAULT 'info',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "last_run_at" TIMESTAMP(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_dispatches" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "notification_id" UUID,
    "lead_days_used" INTEGER NOT NULL,
    "dispatch_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_company_slug_key" ON "clients"("company_slug");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_primary_client_id_idx" ON "users"("primary_client_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "roles_app_role_idx" ON "roles"("app_role");

-- CreateIndex
CREATE UNIQUE INDEX "roles_client_id_name_key" ON "roles"("client_id", "name");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_client_id_idx" ON "user_roles"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_client_id_key" ON "user_roles"("user_id", "role_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_feature_key_key" ON "feature_definitions"("feature_key");

-- CreateIndex
CREATE INDEX "feature_definitions_module_idx" ON "feature_definitions"("module");

-- CreateIndex
CREATE INDEX "feature_toggles_client_id_idx" ON "feature_toggles"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_toggles_client_id_user_id_feature_key_key" ON "feature_toggles"("client_id", "user_id", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_client_id_idx" ON "employees"("client_id");

-- CreateIndex
CREATE INDEX "employees_user_id_idx" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_reports_to_id_idx" ON "employees"("reports_to_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_client_id_emp_id_key" ON "employees"("client_id", "emp_id");

-- CreateIndex
CREATE INDEX "employee_addresses_employee_id_idx" ON "employee_addresses"("employee_id");

-- CreateIndex
CREATE INDEX "employee_addresses_client_id_idx" ON "employee_addresses"("client_id");

-- CreateIndex
CREATE INDEX "employee_bank_details_employee_id_idx" ON "employee_bank_details"("employee_id");

-- CreateIndex
CREATE INDEX "employee_bank_details_client_id_idx" ON "employee_bank_details"("client_id");

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_employee_id_idx" ON "employee_emergency_contacts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_client_id_idx" ON "employee_emergency_contacts"("client_id");

-- CreateIndex
CREATE INDEX "employee_education_employee_id_idx" ON "employee_education"("employee_id");

-- CreateIndex
CREATE INDEX "employee_education_client_id_idx" ON "employee_education"("client_id");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_client_id_idx" ON "employee_documents"("client_id");

-- CreateIndex
CREATE INDEX "employee_documents_expiry_date_idx" ON "employee_documents"("expiry_date");

-- CreateIndex
CREATE INDEX "employee_compensation_employee_id_idx" ON "employee_compensation"("employee_id");

-- CreateIndex
CREATE INDEX "employee_compensation_client_id_idx" ON "employee_compensation"("client_id");

-- CreateIndex
CREATE INDEX "employee_compensation_effective_to_idx" ON "employee_compensation"("effective_to");

-- CreateIndex
CREATE INDEX "audit_logs_client_id_created_at_idx" ON "audit_logs"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_client_id_created_at_idx" ON "notifications"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_accepted_by_user_id_key" ON "invitations"("accepted_by_user_id");

-- CreateIndex
CREATE INDEX "invitations_client_id_idx" ON "invitations"("client_id");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_client_id_email_status_key" ON "invitations"("client_id", "email", "status");

-- CreateIndex
CREATE INDEX "leave_types_client_id_idx" ON "leave_types"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_client_id_code_key" ON "leave_types"("client_id", "code");

-- CreateIndex
CREATE INDEX "leave_balances_client_id_idx" ON "leave_balances"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_leave_type_id_year_key" ON "leave_balances"("employee_id", "leave_type_id", "year");

-- CreateIndex
CREATE INDEX "leave_requests_client_id_status_idx" ON "leave_requests"("client_id", "status");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_status_idx" ON "leave_requests"("employee_id", "status");

-- CreateIndex
CREATE INDEX "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "holidays_client_id_date_idx" ON "holidays"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_client_id_date_name_key" ON "holidays"("client_id", "date", "name");

-- CreateIndex
CREATE INDEX "expenses_client_id_status_idx" ON "expenses"("client_id", "status");

-- CreateIndex
CREATE INDEX "expenses_employee_id_status_idx" ON "expenses"("employee_id", "status");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "advances_client_id_status_idx" ON "advances"("client_id", "status");

-- CreateIndex
CREATE INDEX "advances_employee_id_status_idx" ON "advances"("employee_id", "status");

-- CreateIndex
CREATE INDEX "loans_client_id_status_idx" ON "loans"("client_id", "status");

-- CreateIndex
CREATE INDEX "loans_employee_id_status_idx" ON "loans"("employee_id", "status");

-- CreateIndex
CREATE INDEX "loan_transactions_loan_id_date_idx" ON "loan_transactions"("loan_id", "date");

-- CreateIndex
CREATE INDEX "assets_client_id_status_idx" ON "assets"("client_id", "status");

-- CreateIndex
CREATE INDEX "assets_assigned_to_id_idx" ON "assets"("assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_client_id_asset_tag_key" ON "assets"("client_id", "asset_tag");

-- CreateIndex
CREATE INDEX "asset_history_asset_id_date_idx" ON "asset_history"("asset_id", "date");

-- CreateIndex
CREATE INDEX "approval_groups_client_id_idx" ON "approval_groups"("client_id");

-- CreateIndex
CREATE INDEX "approval_group_members_employee_id_idx" ON "approval_group_members"("employee_id");

-- CreateIndex
CREATE INDEX "approval_policies_client_id_module_idx" ON "approval_policies"("client_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "approval_policy_levels_policy_id_level_order_key" ON "approval_policy_levels"("policy_id", "level_order");

-- CreateIndex
CREATE INDEX "approval_delegations_client_id_is_active_idx" ON "approval_delegations"("client_id", "is_active");

-- CreateIndex
CREATE INDEX "approval_delegations_from_employee_id_start_date_end_date_idx" ON "approval_delegations"("from_employee_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "request_approvals_client_id_status_idx" ON "request_approvals"("client_id", "status");

-- CreateIndex
CREATE INDEX "request_approvals_requester_employee_id_idx" ON "request_approvals"("requester_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_approvals_module_entity_id_key" ON "request_approvals"("module", "entity_id");

-- CreateIndex
CREATE INDEX "request_approval_history_request_approval_id_created_at_idx" ON "request_approval_history"("request_approval_id", "created_at");

-- CreateIndex
CREATE INDEX "request_assignments_request_approval_id_level_order_idx" ON "request_assignments"("request_approval_id", "level_order");

-- CreateIndex
CREATE INDEX "request_assignments_employee_id_status_idx" ON "request_assignments"("employee_id", "status");

-- CreateIndex
CREATE INDEX "payroll_setups_client_id_status_idx" ON "payroll_setups"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_setups_client_id_name_key" ON "payroll_setups"("client_id", "name");

-- CreateIndex
CREATE INDEX "payroll_setup_components_payroll_setup_id_order_index_idx" ON "payroll_setup_components"("payroll_setup_id", "order_index");

-- CreateIndex
CREATE INDEX "payroll_setup_tax_rules_payroll_setup_id_order_index_idx" ON "payroll_setup_tax_rules"("payroll_setup_id", "order_index");

-- CreateIndex
CREATE INDEX "payroll_runs_client_id_status_idx" ON "payroll_runs"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_client_id_payroll_setup_id_month_year_key" ON "payroll_runs"("client_id", "payroll_setup_id", "month", "year");

-- CreateIndex
CREATE INDEX "payroll_lines_client_id_payroll_run_id_idx" ON "payroll_lines"("client_id", "payroll_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_lines_payroll_run_id_employee_id_key" ON "payroll_lines"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_one_off_adjustments_payroll_run_id_employee_id_idx" ON "payroll_one_off_adjustments"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_line_id_key" ON "payslips"("payroll_line_id");

-- CreateIndex
CREATE INDEX "payslips_employee_id_idx" ON "payslips"("employee_id");

-- CreateIndex
CREATE INDEX "performance_cycles_client_id_status_idx" ON "performance_cycles"("client_id", "status");

-- CreateIndex
CREATE INDEX "performance_questionnaires_cycle_id_idx" ON "performance_questionnaires"("cycle_id");

-- CreateIndex
CREATE INDEX "performance_assessments_client_id_cycle_id_idx" ON "performance_assessments"("client_id", "cycle_id");

-- CreateIndex
CREATE INDEX "performance_assessments_employee_id_idx" ON "performance_assessments"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_assessments_cycle_id_employee_id_reviewer_id_ty_key" ON "performance_assessments"("cycle_id", "employee_id", "reviewer_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "performance_calibrations_cycle_id_employee_id_key" ON "performance_calibrations"("cycle_id", "employee_id");

-- CreateIndex
CREATE INDEX "separations_client_id_status_idx" ON "separations"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "separations_employee_id_key" ON "separations"("employee_id");

-- CreateIndex
CREATE INDEX "reminder_rules_client_id_is_enabled_idx" ON "reminder_rules"("client_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_rules_client_id_category_name_key" ON "reminder_rules"("client_id", "category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_dispatches_dispatch_key_key" ON "reminder_dispatches"("dispatch_key");

-- CreateIndex
CREATE INDEX "reminder_dispatches_client_id_sent_at_idx" ON "reminder_dispatches"("client_id", "sent_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primary_client_id_fkey" FOREIGN KEY ("primary_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_toggles" ADD CONSTRAINT "feature_toggles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_toggles" ADD CONSTRAINT "feature_toggles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_toggles" ADD CONSTRAINT "feature_toggles_feature_key_fkey" FOREIGN KEY ("feature_key") REFERENCES "feature_definitions"("feature_key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_addresses" ADD CONSTRAINT "employee_addresses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compensation" ADD CONSTRAINT "employee_compensation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_transactions" ADD CONSTRAINT "loan_transactions_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_groups" ADD CONSTRAINT "approval_groups_escalate_to_group_id_fkey" FOREIGN KEY ("escalate_to_group_id") REFERENCES "approval_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_group_members" ADD CONSTRAINT "approval_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "approval_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_group_members" ADD CONSTRAINT "approval_group_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "approval_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_levels" ADD CONSTRAINT "approval_policy_levels_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "approval_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_levels" ADD CONSTRAINT "approval_policy_levels_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "approval_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_fallback_employee_id_fkey" FOREIGN KEY ("fallback_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "approval_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_current_group_id_fkey" FOREIGN KEY ("current_group_id") REFERENCES "approval_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_requester_employee_id_fkey" FOREIGN KEY ("requester_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approval_history" ADD CONSTRAINT "request_approval_history_request_approval_id_fkey" FOREIGN KEY ("request_approval_id") REFERENCES "request_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approval_history" ADD CONSTRAINT "request_approval_history_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "approval_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_request_approval_id_fkey" FOREIGN KEY ("request_approval_id") REFERENCES "request_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "approval_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_setup_components" ADD CONSTRAINT "payroll_setup_components_payroll_setup_id_fkey" FOREIGN KEY ("payroll_setup_id") REFERENCES "payroll_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_setup_tax_rules" ADD CONSTRAINT "payroll_setup_tax_rules_payroll_setup_id_fkey" FOREIGN KEY ("payroll_setup_id") REFERENCES "payroll_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_setup_id_fkey" FOREIGN KEY ("payroll_setup_id") REFERENCES "payroll_setups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_one_off_adjustments" ADD CONSTRAINT "payroll_one_off_adjustments_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_one_off_adjustments" ADD CONSTRAINT "payroll_one_off_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_line_id_fkey" FOREIGN KEY ("payroll_line_id") REFERENCES "payroll_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_questionnaires" ADD CONSTRAINT "performance_questionnaires_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_calibrations" ADD CONSTRAINT "performance_calibrations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_calibrations" ADD CONSTRAINT "performance_calibrations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "separations" ADD CONSTRAINT "separations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_dispatches" ADD CONSTRAINT "reminder_dispatches_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "reminder_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
