import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, FileText, Package, Wrench, DollarSign, ShieldCheck, Cake,
  PartyPopper, FileCheck, ClipboardCheck, Calendar, Star, Pencil, Trash2, Play, Plus,
  Globe, CreditCard, FileWarning, HeartPulse, PiggyBank,
} from "lucide-react";

// ---------- Types ----------
type Category =
  | "document_expiry" | "asset_warranty" | "asset_service" | "advance_settlement"
  | "probation_end" | "birthday" | "work_anniversary" | "policy_ack"
  | "approval_pending" | "payroll_due" | "performance_assessment"
  | "visa_expiry" | "iqama_expiry" | "contract_expiry"
  | "medical_insurance" | "loan_instalment" | "leave_balance_lapse";

type Frequency = "once" | "daily" | "weekly" | "monthly";
type Priority = "info" | "warning" | "urgent";
type Recipient = "employee" | "manager" | "hr" | "admin" | "approver";

interface ReminderRule {
  id: string;
  client_id: string;
  category: Category;
  name: string;
  description: string | null;
  is_enabled: boolean;
  lead_days_before: number[];
  repeat_frequency: Frequency;
  recipients: string[];
  conditions: Record<string, unknown>;
  priority: Priority;
  last_run_at: string | null;
  created_at: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Bell; color: string }> = {
  document_expiry: { label: "Document Expiry", icon: FileText, color: "text-blue-600" },
  visa_expiry: { label: "Visa Expiry", icon: Globe, color: "text-red-600" },
  iqama_expiry: { label: "Iqama / Residence Permit", icon: CreditCard, color: "text-red-700" },
  contract_expiry: { label: "Contract End Date", icon: FileWarning, color: "text-orange-600" },
  medical_insurance: { label: "Medical Insurance", icon: HeartPulse, color: "text-pink-600" },
  loan_instalment: { label: "Loan Instalment Due", icon: PiggyBank, color: "text-emerald-600" },
  leave_balance_lapse: { label: "Leave Balance Lapse", icon: Calendar, color: "text-amber-700" },
  asset_warranty: { label: "Asset Warranty", icon: Package, color: "text-purple-600" },
  asset_service: { label: "Asset Service", icon: Wrench, color: "text-orange-600" },
  advance_settlement: { label: "Advance Settlement", icon: DollarSign, color: "text-green-600" },
  probation_end: { label: "Probation Ending", icon: ShieldCheck, color: "text-amber-600" },
  birthday: { label: "Birthday", icon: Cake, color: "text-pink-600" },
  work_anniversary: { label: "Work Anniversary", icon: PartyPopper, color: "text-indigo-600" },
  policy_ack: { label: "Policy Acknowledgement", icon: FileCheck, color: "text-cyan-600" },
  approval_pending: { label: "Pending Approvals", icon: ClipboardCheck, color: "text-rose-600" },
  payroll_due: { label: "Payroll Run Due", icon: Calendar, color: "text-emerald-600" },
  performance_assessment: { label: "Performance Assessment", icon: Star, color: "text-violet-600" },
};

const RECIPIENT_OPTIONS: { value: Recipient; label: string; helper?: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR / Admin" },
  { value: "admin", label: "Admin only" },
  { value: "approver", label: "Approver" },
];

// ---------- Page ----------
export default function ReminderSettingsPage() {
  const { profile } = useRole();
  const clientId = profile?.client_id ?? null;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ReminderRule | null>(null);
  const [open, setOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["reminder-rules", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ReminderRule[]> => {
      const { data, error } = await supabase
        .from("reminder_rules")
        .select("*")
        .eq("client_id", clientId!)
        .order("category");
      if (error) throw error;
      return (data ?? []) as unknown as ReminderRule[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("reminder_rules").update({ is_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder-rules", clientId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-rules", clientId] });
      toast({ title: "Rule deleted" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (ruleId?: string) => {
      const { data, error } = await supabase.functions.invoke("process-reminders", {
        body: { client_id: clientId, ...(ruleId ? { rule_id: ruleId } : {}) },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const total = Object.values((data?.results ?? {}) as Record<string, number>)
        .reduce((a, b) => a + b, 0);
      toast({
        title: "Reminders processed",
        description: `${data?.processed ?? 0} rule(s) evaluated · ${total} notification(s) sent.`,
      });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const counts = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const r of rules) map[r.category] = (map[r.category] ?? 0) + (r.is_enabled ? 1 : 0);
    return map;
  }, [rules]);

  const handleEdit = (rule: ReminderRule) => { setEditing(rule); setOpen(true); };
  const handleNew = () => { setEditing(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminder Settings"
        description="Configure automated in-app reminders across the system."
      >
        <Button variant="outline" onClick={() => testMutation.mutate(undefined)} disabled={testMutation.isPending}>
          <Play className="h-4 w-4 mr-2" />
          {testMutation.isPending ? "Running..." : "Run all now"}
        </Button>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> New rule
        </Button>
      </PageHeader>

      {/* Category overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => {
          const Icon = meta.icon;
          const active = counts[key] ?? 0;
          return (
            <Card key={key} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">{meta.label}</p>
                  <p className="text-sm font-semibold">{active} active</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Rules table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" /> All rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={4} variant="list" />
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet. Click "New rule" to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Lead days</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const meta = CATEGORY_META[r.category];
                  const Icon = meta?.icon ?? Bell;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.is_enabled}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, enabled: v })}
                          />
                          <span>{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className={`h-3 w-3 ${meta?.color ?? ""}`} />
                          {meta?.label ?? r.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.lead_days_before.join(", ")}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{r.repeat_frequency}</TableCell>
                      <TableCell className="text-xs capitalize">{r.recipients.join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={r.priority === "urgent" ? "destructive" : r.priority === "warning" ? "default" : "secondary"}>
                          {r.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.last_run_at ? new Date(r.last_run_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => testMutation.mutate(r.id)} title="Test now">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => { if (confirm("Delete this rule?")) deleteMutation.mutate(r.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RuleEditor
        open={open}
        onOpenChange={setOpen}
        rule={editing}
        clientId={clientId}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["reminder-rules", clientId] }); }}
      />
    </div>
  );
}

// ---------- Editor Dialog ----------
function RuleEditor({
  open, onOpenChange, rule, clientId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: ReminderRule | null;
  clientId: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    category: "document_expiry" as Category,
    name: "",
    description: "",
    is_enabled: true,
    lead_days_input: "30, 7, 1",
    repeat_frequency: "once" as Frequency,
    recipients: ["employee", "hr"] as Recipient[],
    priority: "warning" as Priority,
  });

  useEffect(() => {
    if (rule) {
      setForm({
        category: rule.category,
        name: rule.name,
        description: rule.description ?? "",
        is_enabled: rule.is_enabled,
        lead_days_input: rule.lead_days_before.join(", "),
        repeat_frequency: rule.repeat_frequency,
        recipients: rule.recipients as Recipient[],
        priority: rule.priority,
      });
    } else {
      setForm({
        category: "document_expiry", name: "", description: "", is_enabled: true,
        lead_days_input: "30, 7, 1", repeat_frequency: "once",
        recipients: ["employee", "hr"], priority: "warning",
      });
    }
  }, [rule, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client");
      const lead_days = form.lead_days_input
        .split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (lead_days.length === 0) throw new Error("Provide at least one lead day");
      if (form.recipients.length === 0) throw new Error("Select at least one recipient");
      if (!form.name.trim()) throw new Error("Name is required");

      const payload = {
        client_id: clientId,
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_enabled: form.is_enabled,
        lead_days_before: lead_days,
        repeat_frequency: form.repeat_frequency,
        recipients: form.recipients,
        priority: form.priority,
      };
      if (rule) {
        const { error } = await supabase.from("reminder_rules").update(payload).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reminder_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: rule ? "Rule updated" : "Rule created" });
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const toggleRecipient = (r: Recipient) => {
    setForm(f => ({
      ...f,
      recipients: f.recipients.includes(r) ? f.recipients.filter(x => x !== r) : [...f.recipients, r],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit reminder rule" : "New reminder rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as Category }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rule name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Critical document expiry"
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <Label>Lead days (comma-separated)</Label>
            <Input
              value={form.lead_days_input}
              onChange={(e) => setForm(f => ({ ...f, lead_days_input: e.target.value }))}
              placeholder="30, 15, 7, 1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Send reminder when event is exactly this many days away. Use 0 for "today".
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={form.repeat_frequency} onValueChange={(v) => setForm(f => ({ ...f, repeat_frequency: v as Frequency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once per lead day</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Recipients</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {RECIPIENT_OPTIONS.map(o => (
                <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.recipients.includes(o.value)}
                    onCheckedChange={() => toggleRecipient(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_enabled}
              onCheckedChange={(v) => setForm(f => ({ ...f, is_enabled: v }))}
            />
            <Label className="cursor-pointer">Enabled</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
