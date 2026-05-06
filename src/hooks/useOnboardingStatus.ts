import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export type OnboardingStepKey =
  | "company_profile"
  | "org_structure"
  | "payroll_setup"
  | "expense_setup";

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  route: string; // wizard sub-route
  appRoute: string; // direct app route to manage
  done: boolean;
  detected: boolean; // auto-detected from data
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  isDismissed: boolean;
  shouldShowBanner: boolean;
  clientId: string | null;
}

const STEP_DEFS: Omit<OnboardingStep, "done" | "detected">[] = [
  {
    key: "company_profile",
    title: "Company Profile",
    description: "Logo, address, currency, timezone",
    route: "company-profile",
    appRoute: "/settings/company",
  },
  {
    key: "org_structure",
    title: "Org Structure",
    description: "Departments, designations & categories",
    route: "org-structure",
    appRoute: "/settings/company-structure",
  },
  {
    key: "payroll_setup",
    title: "Payroll Setup",
    description: "Pay schedule, salary rules & tax",
    route: "payroll-setup",
    appRoute: "/payroll/setup",
  },
  {
    key: "expense_setup",
    title: "Expense Setup",
    description: "Expense categories & GL codes",
    route: "expense-setup",
    appRoute: "/settings/expense-categories",
  },
];

export function useOnboardingStatus() {
  const { clientId, appRole, isSuperAdmin } = useRole();

  const enabled = !!clientId && (appRole === "admin" || appRole === "hr") && !isSuperAdmin;

  const query = useQuery({
    queryKey: ["onboarding-status", clientId],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<OnboardingStatus> => {
      if (!clientId) {
        return {
          steps: [],
          completedCount: 0,
          totalCount: 0,
          isComplete: true,
          isDismissed: true,
          shouldShowBanner: false,
          clientId: null,
        };
      }

      const [
        clientRes,
        deptRes,
        designationRes,
        payrollSetupRes,
        expenseCatsRes,
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("setup_completed_steps, setup_completed_at, setup_dismissed_at, country, base_currency, company_phone")
          .eq("id", clientId)
          .maybeSingle(),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("designations").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("payroll_setups" as never).select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("expense_categories").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      ]);

      const client = clientRes.data;
      const explicitDone = new Set<string>(client?.setup_completed_steps ?? []);
      const dismissedAt = client?.setup_dismissed_at;

      const detect = {
        company_profile: !!(client?.country && client?.base_currency),
        org_structure: (deptRes.count ?? 0) > 0 && (designationRes.count ?? 0) > 0,
        payroll_setup: (payrollSetupRes.count ?? 0) > 0,
        expense_setup: (expenseCatsRes.count ?? 0) > 0,
      };

      const steps: OnboardingStep[] = STEP_DEFS.map((def) => {
        const detected = detect[def.key as keyof typeof detect] ?? false;
        return {
          ...def,
          detected,
          done: detected || explicitDone.has(def.key),
        };
      });

      const completedCount = steps.filter((s) => s.done).length;
      const isComplete = completedCount === steps.length;
      const isDismissed = !!dismissedAt;

      return {
        steps,
        completedCount,
        totalCount: steps.length,
        isComplete,
        isDismissed,
        shouldShowBanner: !isComplete && !isDismissed,
        clientId,
      };
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
