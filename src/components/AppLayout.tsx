import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, useSidebarCollapse } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ModuleTabs } from "@/components/ModuleTabs";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { useRole } from "@/contexts/RoleContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { appRole } = useRole();
  const location = useLocation();
  const { collapsed, toggle } = useSidebarCollapse();
  const [mobileOpen, setMobileOpen] = useState(false);

  // No role yet (still loading) — render content without nav chrome
  if (!appRole) return <>{children}</>;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggle}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <ModuleTabs />
        <OnboardingBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={location.pathname} className="page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
