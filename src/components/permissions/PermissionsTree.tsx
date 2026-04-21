import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Eye, Pencil, Ban, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AccessLevel,
  type FeatureDefinition,
  type ModuleInfo,
} from "@/hooks/queries/useFeatureAccess";

/**
 * Reusable, controlled module/feature permission tree.
 * Matches the screenshot: a card per module with a master switch + chevron,
 * and a list of features each with an access-level dropdown (Edit/View/Denied).
 */
interface PermissionsTreeProps {
  modules: ModuleInfo[];
  /** Effective levels (already merged with role defaults) — used to seed UI when no override. */
  effective: Map<string, AccessLevel>;
  /** Pending overrides keyed by feature_key. Empty/undefined = inherit `effective`. */
  pending: Map<string, AccessLevel>;
  onChange: (featureKey: string, level: AccessLevel) => void;
  /** Bulk-set every feature in a module to a level. */
  onModuleChange?: (moduleKey: string, level: AccessLevel) => void;
  /** Read-only mode. */
  disabled?: boolean;
}

const LEVEL_META: Record<AccessLevel, { label: string; icon: typeof Eye; tone: string }> = {
  edit: { label: "Access granted", icon: Pencil, tone: "text-emerald-600" },
  view: { label: "View only", icon: Eye, tone: "text-amber-600" },
  none: { label: "Access denied", icon: Ban, tone: "text-muted-foreground" },
};

export function PermissionsTree({
  modules,
  effective,
  pending,
  onChange,
  onModuleChange,
  disabled,
}: PermissionsTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const getLevel = (key: string): AccessLevel => pending.get(key) ?? effective.get(key) ?? "none";

  return (
    <div className="space-y-3">
      {modules.map((mod) => {
        const isOpen = expanded.has(mod.key);
        const counts = useModuleCounts(mod, getLevel);
        const moduleOn = counts.granted > 0;
        return (
          <div
            key={mod.key}
            className="rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-sm"
          >
            {/* Module header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <button
                type="button"
                onClick={() => toggle(mod.key)}
                className="flex-1 text-left flex items-center gap-2 min-w-0"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{mod.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {counts.granted} of {mod.features.length} features enabled
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                )}
              </button>
              <Switch
                checked={moduleOn}
                disabled={disabled || !onModuleChange}
                onCheckedChange={(v) => onModuleChange?.(mod.key, v ? "edit" : "none")}
                aria-label={`Toggle ${mod.label}`}
              />
            </div>

            {/* Feature rows */}
            {isOpen && (
              <div className="border-t bg-muted/20 divide-y">
                {mod.features.map((feat) => (
                  <FeatureRow
                    key={feat.feature_key}
                    feat={feat}
                    level={getLevel(feat.feature_key)}
                    onChange={(lvl) => onChange(feat.feature_key, lvl)}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeatureRow({
  feat,
  level,
  onChange,
  disabled,
}: {
  feat: FeatureDefinition;
  level: AccessLevel;
  onChange: (lvl: AccessLevel) => void;
  disabled?: boolean;
}) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0 pl-12">
        <Label className="text-sm font-medium">{feat.name}</Label>
        {feat.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{feat.description}</p>
        )}
      </div>
      <Select value={level} onValueChange={(v) => onChange(v as AccessLevel)} disabled={disabled}>
        <SelectTrigger className={cn("h-8 w-[170px] text-xs gap-1", meta.tone)}>
          <Icon className="h-3.5 w-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="edit">
            <span className="flex items-center gap-2"><Pencil className="h-3.5 w-3.5 text-emerald-600" />Access granted</span>
          </SelectItem>
          <SelectItem value="view">
            <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-amber-600" />View only</span>
          </SelectItem>
          <SelectItem value="none">
            <span className="flex items-center gap-2"><Ban className="h-3.5 w-3.5 text-muted-foreground" />Access denied</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function useModuleCounts(mod: ModuleInfo, getLevel: (k: string) => AccessLevel) {
  return useMemo(() => {
    let granted = 0;
    for (const f of mod.features) if (getLevel(f.feature_key) !== "none") granted++;
    return { granted };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, getLevel]);
}
