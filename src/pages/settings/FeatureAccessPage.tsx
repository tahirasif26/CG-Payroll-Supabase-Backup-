import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { FeatureSelectionTree } from "@/components/features/FeatureSelectionTree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { Search, Shield, Save, X } from "lucide-react";

interface EmployeeRow {
  id: string;
  emp_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  enabled_features: string[] | null;
}

export default function FeatureAccessPage() {
  const { clientId, enabledModules, enabledFeatures } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [draftFeatures, setDraftFeatures] = useState<string[]>([]);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-feature-access", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, emp_id, first_name, last_name, email, enabled_features")
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
    enabled: !!clientId,
  });

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [`${e.first_name ?? ""} ${e.last_name ?? ""}`, e.emp_id, e.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string; features: string[] | null }) => {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ enabled_features: payload.features })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Feature access updated" });
      qc.invalidateQueries({ queryKey: ["employees-feature-access", clientId] });
    },
    onError: (err: Error) =>
      toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const handleSelect = (emp: EmployeeRow) => {
    setSelected(emp);
    // If null, default selection = all client-available features (so admin can untick from there)
    setDraftFeatures(emp.enabled_features ?? enabledFeatures ?? []);
  };

  const handleSave = () => {
    if (!selected) return;
    // Persist exactly what the admin selected. Empty array = deny all.
    // Use "Reset to inherit" button to clear the override (NULL).
    saveMutation.mutate({ id: selected.id, features: draftFeatures });
  };

  const handleResetInherit = () => {
    if (!selected) return;
    saveMutation.mutate({ id: selected.id, features: null });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Access"
        description="Grant or revoke specific features per employee. Only features available to your company are shown."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Employee list */}
        <div className="border rounded-md overflow-hidden bg-card">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No employees found.</div>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  className={cn(
                    "w-full p-3 text-left hover:bg-muted transition-colors",
                    selected?.id === emp.id && "bg-muted"
                  )}
                >
                  <p className="text-sm font-medium">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.emp_id} · {emp.email}
                  </p>
                  {emp.enabled_features && emp.enabled_features.length > 0 && (
                    <p className="text-[11px] text-primary mt-1">
                      {emp.enabled_features.length} custom feature
                      {emp.enabled_features.length === 1 ? "" : "s"}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Feature tree */}
        <div className="border rounded-md p-5 bg-card">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div>
                  <h2 className="text-base font-semibold">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.emp_id} · {selected.email}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <FeatureSelectionTree
                availableModules={enabledModules}
                availableFeatures={enabledFeatures}
                selectedFeatures={draftFeatures}
                setSelectedFeatures={setDraftFeatures}
                title="Granted features"
                description="Check features to grant access. Uncheck to revoke. Saving with nothing checked will deny all features for this employee."
              />

              <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  {saveMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetInherit}
                  disabled={saveMutation.isPending}
                  className="ml-auto"
                >
                  Reset to inherit all
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Select an employee from the list to manage their feature access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
