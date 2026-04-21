import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleInfo } from "@/hooks/queries/useFeatureAccess";

/**
 * Tile-based module picker used in the client wizard.
 * Selecting/deselecting toggles whole-module enablement for the tenant.
 */
interface ModulePickerProps {
  modules: ModuleInfo[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function ModulePicker({ modules, selected, onChange }: ModulePickerProps) {
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  if (!modules.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
        No modules defined yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {modules.map((mod) => {
        const isSelected = selected.includes(mod.key);
        return (
          <button
            key={mod.key}
            type="button"
            onClick={() => toggle(mod.key)}
            className={cn(
              "text-left rounded-lg border-2 p-3 transition-all flex items-start gap-3",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{mod.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {mod.features.length} {mod.features.length === 1 ? "feature" : "features"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
