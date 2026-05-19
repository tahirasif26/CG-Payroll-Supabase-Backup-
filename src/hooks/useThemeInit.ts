import { useEffect } from "react";

/**
 * Phase 4 shim — theme color was stored on `clients.theme_color` in Supabase.
 * The NestJS Client model doesn't yet have that column. We rely on the
 * localStorage cache only; admins can still pick a theme and the choice
 * persists per-browser. Restore client-wide theming by adding `themeColor`
 * to Prisma's Client model + exposing it through Tenants update.
 */
const themeMap: Record<string, string> = {
  orange: "22 97% 41%",
  "dark-green": "152 69% 30%",
  "dark-blue": "213 80% 35%",
  maroon: "0 60% 30%",
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
  useEffect(() => {
    const cached = localStorage.getItem("cg-theme-color");
    if (cached) apply(cached);
  }, []);
}
