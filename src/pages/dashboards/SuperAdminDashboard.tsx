import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Clock, Users, Plus, ExternalLink, Activity, Database, FileCode2, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/hooks/queries/useClients";
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";
import { ActivityFeed } from "@/components/dashboards/ActivityFeed";
import { AddClientWizard } from "@/components/clients/AddClientWizard";
import { useRole } from "@/contexts/RoleContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const SUPABASE_PROJECT_REF = "bmxjlxtudqnvichpidoj";
const PLAN_STYLES: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
  enterprise: "bg-purple-50 text-purple-700 border-purple-200",
};
const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  active: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  trial: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  suspended: { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default function SuperAdminDashboard() {
  const { profile } = useRole();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: clients, isLoading } = useClients();

  const stats = useMemo(() => {
    const all = clients ?? [];
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      trial: all.filter((c) => c.status === "trial").length,
      users: all.reduce((s, c) => s + (c.user_count ?? 0), 0),
    };
  }, [clients]);

  const recent = (clients ?? []).slice(0, 5);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Operate the platform — manage all client tenants from one place.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4" /> Add New Client
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Clients" value={stats.total} icon={Building2} accent="purple" loading={isLoading} onClick={() => navigate("/manage/clients")} />
        <MetricCard label="Active Clients" value={stats.active} icon={CheckCircle2} accent="teal" loading={isLoading} />
        <MetricCard label="Trial Clients" value={stats.trial} icon={Clock} accent="amber" loading={isLoading} />
        <MetricCard label="Total Users" value={stats.users} icon={Users} accent="blue" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DashboardSection
            title="Recently Added Clients"
            description="The latest tenants provisioned on the platform"
            viewAllHref="/manage/clients"
          >
            <Card>
              <CardContent className="p-2">
                {isLoading ? (
                  <div className="space-y-2 p-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : recent.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No clients yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {recent.map((c) => {
                      const sStyle = STATUS_STYLES[c.status];
                      return (
                        <li key={c.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/30 rounded-md">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                            {c.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{c.company_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] capitalize", PLAN_STYLES[c.subscription_plan])}>{c.subscription_plan}</Badge>
                          <Badge variant="outline" className={cn("text-[10px] gap-1.5", sStyle?.bg)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", sStyle?.dot)} />
                            {c.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => navigate("/manage/clients")}>
                            View <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Recent Activity" description="Platform-wide audit log">
            <ActivityFeed emptyMessage="Activity logging will appear here once enabled." />
          </DashboardSection>
        </div>

        <div className="space-y-4">
          <DashboardSection title="Quick Actions">
            <Card>
              <CardContent className="p-2 space-y-1">
                <button onClick={() => setWizardOpen(true)} className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4 text-orange-600" /> Add new client
                </button>
                <button onClick={() => navigate("/manage/clients")} className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-purple-600" /> View all clients
                </button>
                <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions`} target="_blank" rel="noreferrer"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <FileCode2 className="h-4 w-4 text-blue-600" /> Edge function logs <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </a>
                <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/users`} target="_blank" rel="noreferrer"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-teal-600" /> Auth users <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </a>
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="System Health">
            <Card>
              <CardContent className="p-3 space-y-2">
                <SystemRow icon={Activity} label="Active sessions" />
                <SystemRow icon={FileCode2} label="Function calls today" />
                <SystemRow icon={Database} label="Storage used" />
              </CardContent>
            </Card>
          </DashboardSection>
        </div>
      </div>

      <AddClientWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

function SystemRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">—</span>
        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Soon</Badge>
      </div>
    </div>
  );
}
