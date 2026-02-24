import { useEffect } from "react";

const themeMap: Record<string, string> = {
  "orange": "22 97% 41%",
  "dark-green": "152 69% 30%",
  "dark-blue": "213 80% 35%",
  "maroon": "0 60% 30%",
  "bright-purple": "270 70% 45%",
};

export function useThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("cg-theme-color");
    if (saved && themeMap[saved]) {
      const hue = themeMap[saved];
      const root = document.documentElement;
      root.style.setProperty("--primary", hue);
      root.style.setProperty("--ring", hue);
      root.style.setProperty("--sidebar-primary", hue);
      root.style.setProperty("--sidebar-ring", hue);
      root.style.setProperty("--chart-1", hue);
    }
  }, []);
}
