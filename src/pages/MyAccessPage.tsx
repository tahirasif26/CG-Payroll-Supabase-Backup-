import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFeatureDefinitions, useMyFeatures } from "@/hooks/queries/useFeatureAccess";
import type { FeatureDefinition } from "@/hooks/queries/useFeatureAccess";

export default function MyAccessPage() {
  const { data: defs = [], isLoading: defsLoading } = useFeatureDefinitions();
  const { data: features = [], isLoading: feLoading } = useMyFeatures();

  const enabledMap = useMemo(() => {
    const m = new Map<string, boolean>();
    features.forEach((f) => m.set(f.feature_key, f.enabled));
    return m;
  }, [features]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureDefinition[]>();
    defs.forEach((d) => {
      if (!map.has(d.module)) map.set(d.module, []);
      map.get(d.module)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [defs]);

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Feature Access"
        description="These are the features available to your account. Contact your admin to request changes."
      />

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total enabled</span>
          <Badge variant="default" className="text-sm">
            {enabledCount} / {defs.length}
          </Badge>
        </CardContent>
      </Card>

      {(defsLoading || feLoading) && (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {grouped.map(([mod, list]) => {
          const moduleEnabled = list.filter((d) => enabledMap.get(d.feature_key)).length;
          return (
            <Card key={mod}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="capitalize font-semibold">{mod}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {moduleEnabled}/{list.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {list.map((def) => {
                    const on = enabledMap.get(def.feature_key) ?? false;
                    return (
                      <div
                        key={def.feature_key}
                        className="flex items-center gap-3 text-sm py-1"
                      >
                        {on ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={on ? "" : "text-muted-foreground"}>{def.name}</div>
                          {def.description && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {def.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
