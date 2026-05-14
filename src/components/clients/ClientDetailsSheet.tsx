import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Mail, Phone, Globe, Clock, DollarSign, CalendarDays, Users, Activity, Send, CheckCircle2, Loader2, LayoutGrid } from "lucide-react";
import { useClientUsers, type ClientStat } from "@/hooks/queries/useClients";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientTabAccessEditor } from "./ClientTabAccessEditor";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  hr: "bg-teal-50 text-teal-700 border-teal-200",
  employee: "bg-slate-50 text-slate-700 border-slate-200",
};

interface Props {
  client: ClientStat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsSheet({ client, open, onOpenChange }: Props) {
  const { data: users, isLoading: usersLoading } = useClientUsers(client?.id ?? null);
  const { toast } = useToast();
  const [resendingId, setResendingId] = useState<string | null>(null);

  if (!client) return null;

  const handleResend = async (userId: string, displayName: string) => {
    setResendingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invite", {
        body: { user_id: userId, client_id: client.id },
      });
      // Treat "already verified" as informational, not an error
      const payload = (data as any) ?? {};
      const errMsg = (error as any)?.message || payload?.error;
      const isAlreadyVerified = payload?.verified === true ||
        (typeof errMsg === "string" && errMsg.toLowerCase().includes("already verified"));

      if (isAlreadyVerified) {
        toast({
          title: "Already verified",
          description: `${displayName} has already signed in — no invite needed.`,
        });
        return;
      }
      if (error) throw error;
      if (payload?.error) throw new Error(payload.error);
      toast({
        title: "Invite resent",
        description: `A fresh login link was sent to ${displayName}.`,
      });
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      if (msg.toLowerCase().includes("already verified")) {
        toast({
          title: "Already verified",
          description: `${displayName} has already signed in — no invite needed.`,
        });
        return;
      }
      toast({
        title: "Could not resend invite",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
              {client.company_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <SheetTitle className="text-lg">{client.company_name}</SheetTitle>
              <p className="text-xs text-muted-foreground font-mono">{client.id}</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({client.user_count})</TabsTrigger>
            <TabsTrigger value="tabs"><LayoutGrid className="h-3.5 w-3.5 mr-1" /> Tabs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 pt-4">
            <InfoRow icon={Mail} label="Email" value={client.company_email ?? "—"} />
            <InfoRow icon={Phone} label="Phone" value={client.company_phone ?? "—"} />
            <InfoRow icon={Globe} label="Country" value={client.country ?? "—"} />
            <InfoRow icon={Clock} label="Timezone" value={client.timezone} />
            <InfoRow icon={DollarSign} label="Base Currency" value={client.base_currency} />
            <InfoRow icon={CalendarDays} label="Created" value={new Date(client.created_at).toLocaleDateString()} />
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Plan</p>
                <p className="text-sm font-bold capitalize mt-1">{client.subscription_plan}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
                <p className="text-sm font-bold capitalize mt-1">{client.status}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="pt-4">
            {usersLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No users yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {(u.full_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name ?? "Unnamed"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {u.last_login_at ? `Active ${formatDistanceToNow(new Date(u.last_login_at), { addSuffix: true })}` : "Never logged in"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.role && (
                        <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_COLORS[u.role] ?? ""}`}>
                          {u.role.replace("_", " ")}
                        </Badge>
                      )}
                      {u.last_login_at ? (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-[11px]"
                          title="Resend invite email"
                          disabled={resendingId === u.id}
                          onClick={() => handleResend(u.id, u.full_name ?? "user")}
                        >
                          {resendingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Activity logging will appear here once enabled.</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
