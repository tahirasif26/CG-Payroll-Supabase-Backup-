import { useState, useRef, useEffect } from "react";
import { HelpCircle, LogOut, Menu, Search, Settings, User, Loader2 } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface SearchResult {
  type: string;
  label: string;
  sub: string;
  path: string;
}

export function TopBar({ onOpenMobileSidebar }: TopBarProps) {
  const { profile, signOut, role, isSuperAdmin, appRole, customRoleName, clientId } = useRole();
  const { scope, setScope } = useViewScope();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const displayRole =
    appRole === "super_admin" ? "Super Admin"
    : appRole === "admin" ? "Admin"
    : appRole === "employee" ? "Employee"
    : customRoleName ?? "Custom Role";

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["global-search", searchQuery, clientId],
    enabled: searchQuery.length >= 2 && !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const q = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      const { data: emps } = await supabase
        .from("employees")
        .select("id, first_name, last_name, emp_id, department")
        .eq("client_id", clientId!)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,emp_id.ilike.%${q}%`)
        .limit(4);

      (emps ?? []).forEach((e: any) => results.push({
        type: "Employee",
        label: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.emp_id,
        sub: `${e.emp_id}${e.department ? " · " + e.department : ""}`,
        path: "/employees",
      }));

      const { data: exps } = await supabase
        .from("expenses")
        .select("id, description, amount, status")
        .eq("client_id", clientId!)
        .ilike("description", `%${q}%`)
        .limit(3);

      (exps ?? []).forEach((e: any) => results.push({
        type: "Expense",
        label: e.description ?? "Expense",
        sub: `SAR ${e.amount ?? 0} · ${e.status}`,
        path: "/expenses",
      }));

      const { data: loans } = await supabase
        .from("loans")
        .select("id, reason, principal, status")
        .eq("client_id", clientId!)
        .ilike("reason", `%${q}%`)
        .limit(3);

      (loans ?? []).forEach((l: any) => results.push({
        type: "Loan",
        label: l.reason ?? "Loan",
        sub: `SAR ${l.principal ?? 0} · ${l.status}`,
        path: "/loans",
      }));

      const { data: assets } = await supabase
        .from("assets")
        .select("id, name, asset_tag, status")
        .eq("client_id", clientId!)
        .or(`name.ilike.%${q}%,asset_tag.ilike.%${q}%`)
        .limit(3);

      (assets ?? []).forEach((a: any) => results.push({
        type: "Asset",
        label: a.name ?? a.asset_tag,
        sub: `${a.asset_tag} · ${a.status}`,
        path: "/assets/inventory",
      }));

      return results;
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

        {appRole !== "employee" && (
          <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => { setScope("me"); navigate("/"); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                scope === "me"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Me
            </button>
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
          </div>
        )}

        <div ref={searchRef} className="hidden md:flex relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
          <Input
            placeholder="Search employees, expenses, assets..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
            }}
            className="pl-9 h-9 w-full text-xs bg-muted/40 border-0 focus-visible:ring-1"
          />

          {searchOpen && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {searching ? (
                <div className="px-3 py-4 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground">
                  No results for "{searchQuery}"
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigate(r.path);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full px-3 py-2 hover:bg-muted/50 transition-colors flex items-start gap-2 text-left"
                    >
                      <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{r.type}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
        {!isSuperAdmin && (
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => navigate("/account-settings")}
            aria-label="Account settings"
            title="Account settings"
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
              <p className="text-xs text-muted-foreground">{displayRole}</p>
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
