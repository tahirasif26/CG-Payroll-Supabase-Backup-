import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import {
  useTabDefinitions,
  useClientTabAccess,
  useSetClientTabAccess,
} from "@/hooks/queries/useTabs";

export function ClientTabAccessEditor({ clientId }: { clientId: string }) {
  const { data: defs = [], isLoading: defsLoading } = useTabDefinitions();
  const { data: rows = [], isLoading: rowsLoading } = useClientTabAccess(clientId);
  const save = useSetClientTabAccess();

  const enabledFromServer = useMemo(
    () => new Set(rows.filter((r) => r.enabled).map((r) => r.tab_key)),
    [rows],
  );

  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setEnabled(new Set(enabledFromServer));
    setDirty(false);
  }, [enabledFromServer]);

  const grouped = useMemo(() => {
    const m: Record<string, typeof defs> = {};
    for (const d of defs) (m[d.module_key] ??= []).push(d);
    return m;
  }, [defs]);

  const toggleTab = (key: string, on: boolean) => {
    setEnabled((s) => {
      const n = new Set(s);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
    setDirty(true);
  };

  const toggleModule = (modKey: string, on: boolean) => {
    const keys = (grouped[modKey] ?? []).map((t) => t.tab_key);
    setEnabled((s) => {
      const n = new Set(s);
      if (on) keys.forEach((k) => n.add(k));
      else keys.forEach((k) => n.delete(k));
      return n;
    });
    setDirty(true);
  };

  const handleSave = () =>
    save.mutate({
      client_id: clientId,
      enabled_tab_keys: Array.from(enabled),
      all_tab_keys: defs.map((d) => d.tab_key),
    });

  if (defsLoading || rowsLoading) {
    return <Card className="p-4"><LoadingState rows={6} variant="page" /></Card>;
  }

  const moduleKeys = Object.keys(grouped).sort();

  return (
    <Card className="p-4 space-y-3">
      <div className="text-xs text-muted-foreground">
        Toggle which tabs this client can see. Disabled tabs are hidden from every user in the company.
      </div>
      {moduleKeys.map((modKey) => {
        const tabs = grouped[modKey] ?? [];
        const allOn = tabs.every((t) => enabled.has(t.tab_key));
        return (
          <div key={modKey} className="border rounded-md">
            <label className="flex items-center gap-2 p-2.5 bg-muted/20 cursor-pointer">
              <Checkbox checked={allOn} onCheckedChange={(v) => toggleModule(modKey, Boolean(v))} />
              <span className="text-sm font-semibold capitalize">{modKey}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {tabs.filter((t) => enabled.has(t.tab_key)).length}/{tabs.length}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2 pl-8">
              {tabs.map((t) => (
                <label key={t.tab_key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground py-1">
                  <Checkbox
                    checked={enabled.has(t.tab_key)}
                    onCheckedChange={(v) => toggleTab(t.tab_key, Boolean(v))}
                  />
                  <span>{t.label}</span>
                  {t.scope === "people_only" && (
                    <span className="text-[9px] uppercase text-muted-foreground">people-only</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={handleSave} disabled={!dirty || save.isPending}>
          {save.isPending ? "Saving…" : "Save Tab Access"}
        </Button>
      </div>
    </Card>
  );
}
