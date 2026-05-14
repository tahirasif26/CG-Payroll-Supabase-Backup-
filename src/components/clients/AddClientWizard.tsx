import { useMemo, useState } from "react";
import { z } from "zod";
import { Building2, User, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, Crown, Rocket, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateClient, type CreateClientInput } from "@/hooks/queries/useClients";
import { useTabDefinitions } from "@/hooks/queries/useTabs";
import { MODULE_CATALOG } from "@/lib/feature-catalog";

import { COUNTRIES, TIMEZONES, CURRENCIES } from "@/lib/countries";

const PLANS = [
  { id: "starter", name: "Starter", icon: Sparkles, desc: "Up to 25 employees, core HR + payroll", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  { id: "pro", name: "Pro", icon: Rocket, desc: "Up to 250 employees, all modules + analytics", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { id: "enterprise", name: "Enterprise", icon: Crown, desc: "Unlimited, dedicated support + custom integrations", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
] as const;

const step1Schema = z.object({
  company_name: z.string().trim().min(2, "Company name is required"),
  company_email: z.string().trim().email("Valid email required"),
  company_phone: z.string().trim().optional(),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  base_currency: z.string().min(1, "Currency is required"),
});

const step2Schema = z.object({
  admin_full_name: z.string().trim().min(2, "Admin name is required"),
  admin_email: z.string().trim().email("Valid email required"),
  subscription_plan: z.enum(["starter", "pro", "enterprise"]),
  status: z.enum(["trial", "active"]),
});

type FormState = z.infer<typeof step1Schema> & z.infer<typeof step2Schema> & {
  enabled_modules: string[];
  enabled_features: string[];
  enabled_tab_keys: string[];
};

const initialForm: FormState = {
  company_name: "",
  company_email: "",
  company_phone: "",
  country: "Saudi Arabia",
  timezone: "Asia/Riyadh",
  base_currency: "SAR",
  admin_full_name: "",
  admin_email: "",
  subscription_plan: "starter",
  status: "trial",
  enabled_modules: [],
  enabled_features: [],
  enabled_tab_keys: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createClient = useCreateClient();
  const { data: tabDefs = [] } = useTabDefinitions();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const tabsByModule = useMemo(() => {
    const m: Record<string, typeof tabDefs> = {};
    for (const t of tabDefs) (m[t.module_key] ??= []).push(t);
    return m;
  }, [tabDefs]);

  const toggleExpanded = (key: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (moduleKey: string, enabled: boolean) => {
    const features = MODULE_CATALOG.find((m) => m.key === moduleKey)?.features ?? [];
    const featureKeys = features.map((f) => f.key);
    const tabKeys = (tabsByModule[moduleKey] ?? []).map((t) => t.tab_key);
    if (enabled) {
      setForm((f) => ({
        ...f,
        enabled_modules: Array.from(new Set([...f.enabled_modules, moduleKey])),
        enabled_features: Array.from(new Set([...f.enabled_features, ...featureKeys])),
        enabled_tab_keys: Array.from(new Set([...f.enabled_tab_keys, ...tabKeys])),
      }));
    } else {
      setForm((f) => ({
        ...f,
        enabled_modules: f.enabled_modules.filter((m) => m !== moduleKey),
        enabled_features: f.enabled_features.filter((k) => !featureKeys.includes(k)),
        enabled_tab_keys: f.enabled_tab_keys.filter((k) => !tabKeys.includes(k)),
      }));
    }
  };

  const toggleTab = (tabKey: string, moduleKey: string, enabled: boolean) => {
    setForm((f) => ({
      ...f,
      enabled_tab_keys: enabled
        ? Array.from(new Set([...f.enabled_tab_keys, tabKey]))
        : f.enabled_tab_keys.filter((k) => k !== tabKey),
      enabled_modules:
        enabled && !f.enabled_modules.includes(moduleKey)
          ? [...f.enabled_modules, moduleKey]
          : f.enabled_modules,
    }));
  };

  const toggleFeature = (featureKey: string, moduleKey: string, enabled: boolean) => {
    if (enabled) {
      setForm((f) => ({
        ...f,
        enabled_features: Array.from(new Set([...f.enabled_features, featureKey])),
        enabled_modules: f.enabled_modules.includes(moduleKey)
          ? f.enabled_modules
          : [...f.enabled_modules, moduleKey],
      }));
    } else {
      setForm((f) => ({
        ...f,
        enabled_features: f.enabled_features.filter((k) => k !== featureKey),
      }));
    }
  };

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleCountryChange = (countryName: string) => {
    const c = COUNTRIES.find((x) => x.name === countryName);
    update({ country: countryName, ...(c ? { timezone: c.tz, base_currency: c.currency } : {}) });
  };

  const validateStep = (s: number): boolean => {
    const schema = s === 1 ? step1Schema : step2Schema;
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => { if (validateStep(step)) setStep(step + 1); };
  const handleBack = () => { setErrors({}); setStep(step - 1); };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    try {
      const payload = {
        ...form,
        enabled_modules: form.enabled_modules,
        enabled_features: form.enabled_features,
        enabled_tab_keys: form.enabled_tab_keys,
      } as unknown as CreateClientInput;
      await createClient.mutateAsync(payload);
      onOpenChange(false);
      setStep(1);
      setForm(initialForm);
    } catch {
      /* toast handled in hook */
    }
  };

  const reset = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setStep(1);
      setForm(initialForm);
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Client</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                step === s ? "bg-primary text-primary-foreground border-primary" :
                step > s ? "bg-primary/10 text-primary border-primary" : "bg-muted text-muted-foreground border-border"
              )}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={cn("h-0.5 w-8", step > s ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" /> Company Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name *" error={errors.company_name}>
                <Input value={form.company_name} onChange={(e) => update({ company_name: e.target.value })} placeholder="Acme Corp" />
              </Field>
              <Field label="Company Email *" error={errors.company_email}>
                <Input type="email" value={form.company_email} onChange={(e) => update({ company_email: e.target.value })} placeholder="contact@acme.com" />
              </Field>
              <Field label="Phone" error={errors.company_phone}>
                <Input value={form.company_phone} onChange={(e) => update({ company_phone: e.target.value })} placeholder="+966 50 000 0000" />
              </Field>
              <Field label="Country *" error={errors.country}>
                <Select value={form.country} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Timezone *" error={errors.timezone}>
                <Select value={form.timezone} onValueChange={(v) => update({ timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Base Currency *" error={errors.base_currency}>
                <Select value={form.base_currency} onValueChange={(v) => update({ base_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <User className="h-4 w-4" /> Admin Account & Plan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Admin Full Name *" error={errors.admin_full_name}>
                <Input value={form.admin_full_name} onChange={(e) => update({ admin_full_name: e.target.value })} placeholder="Jane Doe" />
              </Field>
              <Field label="Admin Email *" error={errors.admin_email}>
                <Input type="email" value={form.admin_email} onChange={(e) => update({ admin_email: e.target.value })} placeholder="jane@acme.com" />
              </Field>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subscription Plan</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map((p) => {
                  const Icon = p.icon;
                  const selected = form.subscription_plan === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => update({ subscription_plan: p.id })}
                      className={cn(
                        "text-left rounded-lg border-2 p-3 transition-all",
                        selected ? `${p.bg} border-current ${p.color} ring-2 ring-current/20` : "border-border hover:border-muted-foreground/40"
                      )}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-4 w-4", selected ? p.color : "text-muted-foreground")} />
                        <span className="font-semibold text-sm">{p.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Initial Status</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["trial", "active"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update({ status: s })}
                    className={cn(
                      "rounded-lg border-2 p-3 text-sm font-medium capitalize transition-all",
                      form.status === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground/40"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="h-4 w-4" /> Modules & Features
            </div>
            <p className="text-xs text-muted-foreground">
              Check a module to enable it. Expand to grant or deny specific features within it.
            </p>

            <div className="space-y-2">
              {MODULE_CATALOG.map((m) => {
                const isEnabled = form.enabled_modules.includes(m.key);
                const isExpanded = expandedModules.has(m.key);
                const total = m.features.length;
                const selected = m.features.filter((f) => form.enabled_features.includes(f.key)).length;

                return (
                  <div key={m.key} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-start gap-2 p-3 bg-muted/20">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(m.key)}
                        className="p-1 hover:bg-muted rounded mt-0.5"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(v) => toggleModule(m.key, Boolean(v))}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">{m.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {isEnabled
                            ? selected === total
                              ? `All ${total} features enabled`
                              : `${selected} of ${total} features enabled`
                            : `${total} features available`}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-background border-t border-border">
                        {(tabsByModule[m.key] ?? []).length > 0 && (
                          <div className="px-4 py-2 pl-12 bg-muted/10 border-b border-border">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Tabs (visible in nav)</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(tabsByModule[m.key] ?? []).map((t) => {
                                const checked = form.enabled_tab_keys.includes(t.tab_key);
                                return (
                                  <label key={t.tab_key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => toggleTab(t.tab_key, m.key, Boolean(v))}
                                    />
                                    <span>{t.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="divide-y divide-border">
                          {m.features.map((f) => {
                            const checked = form.enabled_features.includes(f.key);
                            return (
                              <label
                                key={f.key}
                                className="flex items-start gap-3 px-4 py-2.5 pl-12 hover:bg-muted/30 cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleFeature(f.key, m.key, Boolean(v))}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-foreground">{f.label}</div>
                                  {f.description && (
                                    <div className="text-xs text-muted-foreground">{f.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
              {form.enabled_modules.length === 0
                ? "No modules selected — the client will see an empty workspace."
                : `${form.enabled_modules.length} module${form.enabled_modules.length === 1 ? "" : "s"}, ${form.enabled_features.length} feature${form.enabled_features.length === 1 ? "" : "s"} enabled.`}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> Review & Confirm
            </div>
            <ReviewSection title="Company">
              <ReviewRow k="Name" v={form.company_name} />
              <ReviewRow k="Email" v={form.company_email} />
              {form.company_phone && <ReviewRow k="Phone" v={form.company_phone} />}
              <ReviewRow k="Country" v={form.country} />
              <ReviewRow k="Timezone" v={form.timezone} />
              <ReviewRow k="Currency" v={form.base_currency} />
            </ReviewSection>
            <ReviewSection title="Admin & Plan">
              <ReviewRow k="Admin Name" v={form.admin_full_name} />
              <ReviewRow k="Admin Email" v={form.admin_email} />
              <ReviewRow k="Plan" v={form.subscription_plan} className="capitalize" />
              <ReviewRow k="Status" v={form.status} className="capitalize" />
            </ReviewSection>
            <ReviewSection title="Modules & Features">
              <ReviewRow
                k="Modules"
                v={form.enabled_modules.length === 0 ? "None" : `${form.enabled_modules.length} selected`}
              />
              <ReviewRow
                k="Features"
                v={form.enabled_features.length === 0 ? "None" : `${form.enabled_features.length} selected`}
              />
            </ReviewSection>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
              An invitation email will be sent to <strong>{form.admin_email}</strong> to set their password and access the platform.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1 || createClient.isPending}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createClient.isPending}>
              {createClient.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Client & Send Invitation"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-medium", className)}>{v}</span>
    </div>
  );
}
