import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Palette, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/hooks/useAuth";

const themeOptions = [
  { id: "orange", label: "Orange", hue: "22 97% 41%", preview: "hsl(22, 97%, 41%)" },
  { id: "dark-green", label: "Dark Green", hue: "152 69% 30%", preview: "hsl(152, 69%, 30%)" },
  { id: "dark-blue", label: "Dark Blue", hue: "213 80% 35%", preview: "hsl(213, 80%, 35%)" },
  { id: "maroon", label: "Maroon", hue: "0 60% 30%", preview: "hsl(0, 60%, 30%)" },
  { id: "bright-purple", label: "Bright Purple", hue: "270 70% 45%", preview: "hsl(270, 70%, 45%)" },
];

function applyTheme(hue: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hue);
  root.style.setProperty("--ring", hue);
  root.style.setProperty("--sidebar-primary", hue);
  root.style.setProperty("--sidebar-ring", hue);
  root.style.setProperty("--chart-1", hue);
}

export default function VisualPreferencePage() {
  const { toast } = useToast();
  const { clientId } = useRole();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [selected, setSelected] = useState(() => localStorage.getItem("cg-theme-color") || "orange");
  const [saving, setSaving] = useState(false);

  // Load company-wide theme on mount
  useEffect(() => {
    if (!clientId) return;
    (supabase as any)
      .from("clients")
      .select("theme_color")
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.theme_color) {
          setSelected(data.theme_color);
          const t = themeOptions.find(o => o.id === data.theme_color);
          if (t) applyTheme(t.hue);
        }
      });
  }, [clientId]);

  useEffect(() => {
    const theme = themeOptions.find(t => t.id === selected);
    if (theme) applyTheme(theme.hue);
  }, [selected]);

  const handleSelect = async (id: string) => {
    if (!isAdmin) {
      toast({ title: "Admins only", description: "Only the company admin can change the theme.", variant: "destructive" });
      return;
    }
    setSelected(id);
    localStorage.setItem("cg-theme-color", id);
    const theme = themeOptions.find(t => t.id === id);
    if (theme) applyTheme(theme.hue);

    if (!clientId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("clients")
      .update({ theme_color: id })
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    if (theme) toast({ title: "Theme Updated", description: `Primary color set to ${theme.label} for everyone.` });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />Primary Color Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Choose a primary accent color for the entire application. This affects buttons, links, sidebar highlights, and charts.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                  selected === theme.id
                    ? "border-foreground shadow-md"
                    : "border-border hover:border-foreground/30"
                }`}
              >
                <div
                  className="h-10 w-10 rounded-full shadow-inner"
                  style={{ backgroundColor: theme.preview }}
                />
                <span className="text-xs font-medium">{theme.label}</span>
                {selected === theme.id && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
