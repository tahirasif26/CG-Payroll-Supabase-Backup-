import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

const themeMap: Record<string, string> = {
  "orange": "22 97% 41%",
  "dark-green": "152 69% 30%",
  "dark-blue": "213 80% 35%",
  "maroon": "0 60% 30%",
  "bright-purple": "270 70% 45%",
};

function apply(themeId: string) {
  const hue = themeMap[themeId];
  if (!hue) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", hue);
  root.style.setProperty("--ring", hue);
  root.style.setProperty("--sidebar-primary", hue);
  root.style.setProperty("--sidebar-ring", hue);
  root.style.setProperty("--chart-1", hue);
}

export function useThemeInit() {
  const { clientId } = useRole();

  useEffect(() => {
    // Apply cached theme immediately for instant paint
    const cached = localStorage.getItem("cg-theme-color");
    if (cached) apply(cached);

    if (!clientId) return;

    // Then fetch the company-wide theme set by the admin and apply
    (supabase as any)
      .from("clients")
      .select("theme_color")
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }: any) => {
        const themeId = data?.theme_color;
        if (themeId && themeMap[themeId]) {
          localStorage.setItem("cg-theme-color", themeId);
          apply(themeId);
        }
      });
  }, [clientId]);
}
