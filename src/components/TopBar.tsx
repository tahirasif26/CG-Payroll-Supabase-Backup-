import { HelpCircle, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onOpenMobileSidebar: () => void;
}

export function TopBar({ onOpenMobileSidebar }: TopBarProps) {
  const { profile, signOut, role, isSuperAdmin } = useRole();
  const { scope, setScope, hasPeopleAccess } = useViewScope();
  const navigate = useNavigate();

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {!isSuperAdmin && (
          <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setScope("me")}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                scope === "me"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Me
            </button>
            {hasPeopleAccess && (
              <button
                onClick={() => setScope("people")}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  scope === "people"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                People
              </button>
            )}
          </div>
        )}

        <div className="hidden md:flex relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employees, expenses, assets..."
            className="pl-9 h-9 w-full text-xs bg-muted/40 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
        {!isSuperAdmin && (
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => navigate("/account")}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center hover:opacity-90 transition-opacity ml-1 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-background">{initials}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/account")}>
              <User className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
