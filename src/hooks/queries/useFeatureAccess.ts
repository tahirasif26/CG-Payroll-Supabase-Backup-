/**
 * Replaced by `useMyEffectiveFeatures()` from @/api which returns the
 * computed feature key list for the current user. The richer
 * feature_definitions / role_features admin matrix isn't yet on NestJS.
 */
import { useMyEffectiveFeatures } from "@/api";

export type AccessLevel = "none" | "view" | "edit";
export interface FeatureDefinition {
  feature_key: string;
  module: string;
  name: string;
  description: string | null;
}
export interface FeatureToggleRow {
  feature_key: string;
  is_enabled: boolean;
}
export interface FeaturePreset {
  id: string;
  name: string;
  features: string[];
}
export interface ModuleInfo {
  module: string;
  features: FeatureDefinition[];
}

export function groupByModule(defs: FeatureDefinition[]): ModuleInfo[] {
  const grouped: Record<string, FeatureDefinition[]> = {};
  for (const d of defs) (grouped[d.module] ??= []).push(d);
  return Object.entries(grouped).map(([module, features]) => ({ module, features }));
}

export function useFeatureDefinitions() { return { data: [] as FeatureDefinition[], isLoading: false }; }
export function useAllFeatureToggles() { return { data: [] as FeatureToggleRow[], isLoading: false }; }
export function useUserFeatureToggles(_userId: string | null) {
  return { data: [] as FeatureToggleRow[], isLoading: false };
}
export function useMyFeatures() {
  const q = useMyEffectiveFeatures();
  const features: FeatureToggleRow[] = (q.data?.keys ?? []).map((feature_key) => ({
    feature_key,
    is_enabled: true,
  }));
  return { ...q, data: features };
}
