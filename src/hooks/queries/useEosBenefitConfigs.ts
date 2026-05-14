import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "@/hooks/use-toast";

export interface EOSTier {
  fromYear: number;
  toYear: number | null;
  daysPerYear: number;
  fraction: number;
}

export interface EOSBenefitConfig {
  id: string;
  name: string;
  type: "gratuity" | "provident_fund" | "other";
  calculationBasis: "basic_salary" | "gross_salary";
  tiers: EOSTier[];
  appliesTo: string[];
  appliesToCountries?: string[];
  isActive: boolean;
  sortOrder?: number;
}

function fromRow(row: any): EOSBenefitConfig {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    calculationBasis: row.calculation_basis,
    tiers: Array.isArray(row.tiers) ? row.tiers : [],
    appliesTo: row.applies_to ?? [],
    appliesToCountries: row.applies_to_countries ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
  };
}

function toRow(c: Partial<EOSBenefitConfig>) {
  const out: Record<string, any> = {};
  if (c.name !== undefined) out.name = c.name;
  if (c.type !== undefined) out.type = c.type;
  if (c.calculationBasis !== undefined) out.calculation_basis = c.calculationBasis;
  if (c.tiers !== undefined) out.tiers = c.tiers;
  if (c.appliesTo !== undefined) out.applies_to = c.appliesTo;
  if (c.appliesToCountries !== undefined) out.applies_to_countries = c.appliesToCountries;
  if (c.isActive !== undefined) out.is_active = c.isActive;
  if (c.sortOrder !== undefined) out.sort_order = c.sortOrder;
  return out;
}

export function useEosBenefitConfigs() {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["eos_benefit_configs", clientId ?? "super"],
    enabled: !!clientId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eos_benefit_configs")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(fromRow);
    },
    staleTime: 30_000,
  });
}

export function useUpsertEosBenefitConfig() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (cfg: EOSBenefitConfig) => {
      if (!clientId) throw new Error("No client context");
      const isExisting = !!cfg.id && /^[0-9a-f-]{36}$/i.test(cfg.id);
      if (isExisting) {
        const { error } = await (supabase as any)
          .from("eos_benefit_configs")
          .update(toRow(cfg))
          .eq("id", cfg.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("eos_benefit_configs")
          .insert({ ...toRow(cfg), client_id: clientId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eos_benefit_configs"] });
      toast({ title: "Saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteEosBenefitConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("eos_benefit_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eos_benefit_configs"] });
      toast({ title: "Deleted" });
    },
  });
}

/** Pure calc helper — number-based, used for non-KSA/UAE custom configs. */
export function calculateEOSBenefit(
  config: EOSBenefitConfig,
  yearsOfService: number,
  monthlySalaryBasis: number,
): number {
  if (!config.isActive || yearsOfService <= 0) return 0;
  const dailySalary = monthlySalaryBasis / 30;
  let total = 0;
  for (const tier of config.tiers) {
    const from = tier.fromYear;
    const to = tier.toYear ?? Infinity;
    if (yearsOfService <= from) break;
    const yearsInTier = Math.min(yearsOfService, to) - from;
    if (yearsInTier <= 0) continue;
    total += dailySalary * tier.daysPerYear * tier.fraction * yearsInTier;
  }
  return Math.round(total);
}
