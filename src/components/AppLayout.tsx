import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, LogOut } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile, signOut } = useRole();

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:block">
                <span className="text-sm text-muted-foreground">Welcome,</span>
                <span className="ml-1.5 text-sm font-semibold text-foreground">{displayName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </button>
              <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Sign out">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-semibold text-secondary-foreground">{initials}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div key={location.pathname} className="page-transition">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
