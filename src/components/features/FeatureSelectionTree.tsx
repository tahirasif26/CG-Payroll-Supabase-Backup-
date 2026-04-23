import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULE_CATALOG } from "@/lib/feature-catalog";

interface FeatureSelectionTreeProps {
  /** Modules available to grant. null = all modules available. */
  availableModules: string[] | null;
  /** Features available to grant. null = all features within available modules. */
  availableFeatures: string[] | null;
  selectedFeatures: string[];
  setSelectedFeatures: (feats: string[]) => void;
  title?: string;
  description?: string;
}

export function FeatureSelectionTree({
  availableModules,
  availableFeatures,
  selectedFeatures,
  setSelectedFeatures,
  title = "Feature Access",
  description = "Select which features this user can access.",
}: FeatureSelectionTreeProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const visibleCatalog = MODULE_CATALOG
    .filter((m) => availableModules === null || availableModules.includes(m.key))
    .map((m) => ({
      ...m,
      features: m.features.filter(
        (f) => availableFeatures === null || availableFeatures.includes(f.key)
      ),
    }))
    .filter((m) => m.features.length > 0);

  const toggleExpanded = (key: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFeature = (featureKey: string, enabled: boolean) => {
    if (enabled) setSelectedFeatures([...new Set([...selectedFeatures, featureKey])]);
    else setSelectedFeatures(selectedFeatures.filter((f) => f !== featureKey));
  };

  const toggleAllInModule = (moduleKey: string, enabled: boolean) => {
    const keys = visibleCatalog.find((m) => m.key === moduleKey)?.features.map((f) => f.key) ?? [];
    if (enabled) setSelectedFeatures([...new Set([...selectedFeatures, ...keys])]);
    else setSelectedFeatures(selectedFeatures.filter((f) => !keys.includes(f)));
  };

  const moduleState = (moduleKey: string) => {
    const features = visibleCatalog.find((m) => m.key === moduleKey)?.features ?? [];
    if (features.length === 0) return { checked: false, indeterminate: false };
    const selected = features.filter((f) => selectedFeatures.includes(f.key)).length;
    return {
      checked: selected === features.length,
      indeterminate: selected > 0 && selected < features.length,
    };
  };

  if (visibleCatalog.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
        No features are available to grant. Your company has no modules enabled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="rounded-md border divide-y">
        {visibleCatalog.map((m) => {
          const { checked, indeterminate } = moduleState(m.key);
          const isExpanded = expandedModules.has(m.key);
          const selectedCount = m.features.filter((f) => selectedFeatures.includes(f.key)).length;

          return (
            <div key={m.key}>
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(m.key)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <Checkbox
                  checked={indeterminate ? "indeterminate" : checked}
                  onCheckedChange={(v) => toggleAllInModule(m.key, Boolean(v))}
                  className="mr-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCount} of {m.features.length} features enabled
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-muted/30 px-3 pb-3 pt-1 space-y-2 pl-12">
                  {m.features.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2"
                    >
                      <Checkbox
                        checked={selectedFeatures.includes(f.key)}
                        onCheckedChange={(v) => toggleFeature(f.key, Boolean(v))}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{f.label}</p>
                        {f.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedFeatures.length} feature{selectedFeatures.length === 1 ? "" : "s"} enabled.
      </p>
    </div>
  );
}
