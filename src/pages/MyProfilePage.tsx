import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useEmployeeProfile, useUpdateEmployeeProfile } from "@/hooks/queries/useEmployeeProfile";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useReporting } from "@/contexts/ReportingContext";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { getSignedUrl } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  User as UserIcon, Calendar as CalendarIcon, Heart, Globe, Flag, Mail, Phone,
  MapPin, Building2, CreditCard, GraduationCap, Users as UsersIcon, ShieldAlert,
  Pencil, Plus, Copy, Save, X, Briefcase, Clock, Package, FileText, Wallet, IdCard,
} from "lucide-react";
import { format, differenceInYears, differenceInDays } from "date-fns";

/* ───────── Helpers ───────── */

function Row({
  icon: Icon,
  label,
  children,
}: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function SectionShell({
  title,
  action,
  children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl shadow-none border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function copy(text: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text).then(() => toast({ title: "Copied" }));
}

/* ───────── Page ───────── */

export default function MyProfilePage() {
  const { user, profile } = useRole();
  const { toast } = useToast();
  const { data: cur, isLoading: loadingCur } = useCurrentEmployee();
  const empId = cur?.id;
  const { data: data, isLoading } = useEmployeeProfile(empId);
  const update = useUpdateEmployeeProfile();
  const { employees } = useEmployees();
  const { getManagerId, getManagerName } = useReporting();

  const employee = data?.employee as any | undefined;

  // Editable buffers
  const [editing, setEditing] = useState<null | "general" | "address" | "contact" | "emergency" | "education" | "bank">(null);

  const [bio, setBio] = useState({
    title: "", first_name: "", last_name: "", date_of_birth: "",
    gender: "", marital_status: "", religion: "", nationality: "",
  });
  const [address, setAddress] = useState({
    address_line1: "", address_line2: "", city: "", state: "", country: "", postal_code: "",
  });
  const [contact, setContact] = useState({ personal_email: "", personal_phone: "" });
  const [emergency, setEmergency] = useState({ name: "", relation: "", phone: "", email: "" });
  const [education, setEducation] = useState<{ id?: string; institution: string; degree: string; field_of_study: string; start_year: string }[]>([]);
  const [bank, setBank] = useState({
    bank_name: "", iban: "", swift_code: "", bank_currency: "", beneficiary_name: "", bank_country: "", bank_address: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!data) return;
    const e = data.employee as any;
    if (e) {
      setBio({
        title: e.title ?? "",
        first_name: e.first_name ?? "",
        last_name: e.last_name ?? "",
        date_of_birth: e.date_of_birth ?? "",
        gender: e.gender ?? "",
        marital_status: e.marital_status ?? "",
        religion: e.religion ?? "",
        nationality: e.nationality ?? "",
      });
      setContact({
        personal_email: e.personal_email ?? "",
        personal_phone: e.personal_phone ?? e.phone ?? "",
      });
      setAvatarUrl(e.avatar_url ?? undefined);
    }
    if (data.address) {
      setAddress({
        address_line1: data.address.address_line1 ?? "",
        address_line2: data.address.address_line2 ?? "",
        city: data.address.city ?? "",
        state: data.address.state ?? "",
        country: data.address.country ?? "",
        postal_code: data.address.postal_code ?? "",
      });
    }
    if (data.emergency) {
      setEmergency({
        name: data.emergency.name ?? "",
        relation: data.emergency.relation ?? "",
        phone: data.emergency.phone ?? "",
        email: data.emergency.email ?? "",
      });
    }
    if (data.bank) {
      setBank({
        bank_name: data.bank.bank_name ?? "",
        iban: data.bank.iban ?? "",
        swift_code: data.bank.swift_code ?? "",
        bank_currency: data.bank.bank_currency ?? "",
        beneficiary_name: data.bank.beneficiary_name ?? "",
        bank_country: data.bank.bank_country ?? "",
        bank_address: data.bank.bank_address ?? "",
      });
    }
    setEducation(
      (data.education ?? []).map((ed: any) => ({
        id: ed.id,
        institution: ed.institution ?? "",
        degree: ed.degree ?? "",
        field_of_study: ed.field_of_study ?? "",
        start_year: ed.start_year ? String(ed.start_year) : "",
      }))
    );
  }, [data]);

  const fullName = `${bio.first_name || ""} ${bio.last_name || ""}`.trim() || profile?.full_name || "—";
  const initials = (fullName || "U").split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const age = bio.date_of_birth ? differenceInYears(new Date(), new Date(bio.date_of_birth)) : null;
  const tenureDays = employee?.joining_date ? differenceInDays(new Date(), new Date(employee.joining_date)) : null;
  const tenureLabel = tenureDays !== null
    ? tenureDays >= 365 ? `${Math.floor(tenureDays / 365)} year${Math.floor(tenureDays / 365) === 1 ? "" : "s"} ${Math.floor((tenureDays % 365) / 30)} mo`
      : `${tenureDays} days`
    : "—";

  const managerName = empId ? (getManagerName(empId) || "—") : "—";
  const managerId = empId ? getManagerId(empId) : null;
  const managerEmp = managerId ? employees.find((e) => e.id === managerId) : null;
  const directReports = empId ? employees.filter((e) => getManagerId(e.id) === empId && e.status !== "separated") : [];

  const save = async (section: typeof editing) => {
    if (!empId) return;
    try {
      if (section === "general") {
        await update.mutateAsync({
          employeeId: empId,
          bio: {
            first_name: bio.first_name,
            last_name: bio.last_name,
            date_of_birth: bio.date_of_birth || null,
            gender: bio.gender || null,
            marital_status: bio.marital_status || null,
            religion: bio.religion || null,
            nationality: bio.nationality || null,
          },
        });
        // title is not in the dedicated bio block — patch via direct update if column exists
        await (supabase as any).from("employees").update({}).eq("id", empId);
      } else if (section === "address") {
        await update.mutateAsync({ employeeId: empId, address });
      } else if (section === "contact") {
        await update.mutateAsync({ employeeId: empId, contact });
      } else if (section === "emergency") {
        await update.mutateAsync({ employeeId: empId, emergency });
      } else if (section === "education") {
        await update.mutateAsync({
          employeeId: empId,
          education: education.map((e) => ({
            id: e.id, institution: e.institution, degree: e.degree, field_of_study: e.field_of_study,
            start_year: e.start_year ? Number(e.start_year) : null,
          })),
        });
      } else if (section === "bank") {
        await update.mutateAsync({ employeeId: empId, bank });
      }
      setEditing(null);
    } catch {
      /* toast handled in hook */
    }
  };

  if (loadingCur || isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Loading profile…</div>;
  }

  if (!empId || !employee) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No employee record linked to your account yet. Please contact your administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header strip ── */}
      <Card className="rounded-xl border shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 rounded-xl">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} className="rounded-xl object-cover" /> : null}
              <AvatarFallback className="rounded-xl text-xl font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
                <Badge variant="outline" className="capitalize text-[10px] py-0 px-2 border-emerald-500 text-emerald-700 dark:text-emerald-400">
                  {employee.status ?? "active"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{employee.designation || "—"}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <button className="flex items-center gap-1.5 hover:text-foreground" onClick={() => copy(employee.email ?? user?.email ?? "", toast)}>
                  <Mail className="h-3.5 w-3.5" />
                  {employee.email ?? user?.email}
                  <Copy className="h-3 w-3 opacity-60" />
                </button>
                {(employee.phone || employee.personal_phone) && (
                  <button className="flex items-center gap-1.5 hover:text-foreground" onClick={() => copy(employee.phone ?? employee.personal_phone, toast)}>
                    <Phone className="h-3.5 w-3.5" />
                    {employee.phone ?? employee.personal_phone}
                    <Copy className="h-3 w-3 opacity-60" />
                  </button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">People ID</p>
                  <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                    {employee.emp_id || "—"}
                    {employee.emp_id && (
                      <button onClick={() => copy(employee.emp_id, toast)}>
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Work Location</p>
                  <p className="text-sm font-medium mt-0.5">{[employee.work_location_city, employee.work_location_country].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Type of Hire</p>
                  <p className="text-sm font-medium mt-0.5 capitalize">{employee.category || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tenure</p>
                  <p className="text-sm font-medium mt-0.5">{tenureLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reports To</p>
                  <p className="text-sm font-medium mt-0.5">
                    {managerEmp ? `${managerEmp.firstName} ${managerEmp.lastName}` : managerName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="personal"><UserIcon className="h-3.5 w-3.5 mr-1.5" />Personal</TabsTrigger>
          <TabsTrigger value="work"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
          <TabsTrigger value="compensation"><Wallet className="h-3.5 w-3.5 mr-1.5" />Compensation</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1.5" />Documents</TabsTrigger>
          <TabsTrigger value="assets"><Package className="h-3.5 w-3.5 mr-1.5" />Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6 mt-4">
      {/* ── General Information ── */}
      <SectionShell
        title="General information"
        action={
          editing === "general" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("general")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("general")}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit information
            </Button>
          )
        }
      >
        <Row icon={UserIcon} label="Title">
          {editing === "general"
            ? <Input value={bio.title} onChange={(e) => setBio({ ...bio, title: e.target.value })} className="h-8 max-w-sm" placeholder="e.g. Mr / Ms" />
            : <span>{bio.title || "—"}</span>}
        </Row>
        <Row icon={UserIcon} label="Full name">
          {editing === "general" ? (
            <div className="flex gap-2 max-w-md">
              <Input value={bio.first_name} onChange={(e) => setBio({ ...bio, first_name: e.target.value })} className="h-8" placeholder="First name" />
              <Input value={bio.last_name} onChange={(e) => setBio({ ...bio, last_name: e.target.value })} className="h-8" placeholder="Last name" />
            </div>
          ) : <span className="font-medium">{fullName}</span>}
        </Row>
        <Row icon={CalendarIcon} label="Date of Birth">
          {editing === "general" ? (
            <Input type="date" value={bio.date_of_birth || ""} onChange={(e) => setBio({ ...bio, date_of_birth: e.target.value })} className="h-8 max-w-sm" />
          ) : (
            <span>
              {bio.date_of_birth ? `${format(new Date(bio.date_of_birth), "dd MMM yyyy")}` : "—"}
              {age !== null && <span className="text-muted-foreground ml-2">({age} years old)</span>}
            </span>
          )}
        </Row>
        <Row icon={UserIcon} label="Gender">
          {editing === "general"
            ? <Input value={bio.gender} onChange={(e) => setBio({ ...bio, gender: e.target.value })} className="h-8 max-w-sm" />
            : <span>{bio.gender || "—"}</span>}
        </Row>
        <Row icon={Heart} label="Marital Status">
          {editing === "general"
            ? <Input value={bio.marital_status} onChange={(e) => setBio({ ...bio, marital_status: e.target.value })} className="h-8 max-w-sm" />
            : <span>{bio.marital_status || "—"}</span>}
        </Row>
        <Row icon={Globe} label="Religion">
          {editing === "general"
            ? <Input value={bio.religion} onChange={(e) => setBio({ ...bio, religion: e.target.value })} className="h-8 max-w-sm" />
            : <span>{bio.religion || "—"}</span>}
        </Row>
        <Row icon={Flag} label="Nationality">
          {editing === "general"
            ? <Input value={bio.nationality} onChange={(e) => setBio({ ...bio, nationality: e.target.value })} className="h-8 max-w-sm" />
            : <span>{bio.nationality || "—"}</span>}
        </Row>
      </SectionShell>

      {/* ── Payment options (read-only summary) ── */}
      <SectionShell
        title="Payment options"
        action={
          editing === "bank" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("bank")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("bank")}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add / edit bank account
            </Button>
          )
        }
      >
        {editing === "bank" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-1.5"><Label className="text-xs">Bank name</Label><Input className="h-9" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Beneficiary name</Label><Input className="h-9" value={bank.beneficiary_name} onChange={(e) => setBank({ ...bank, beneficiary_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">IBAN / Account number</Label><Input className="h-9" value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">SWIFT</Label><Input className="h-9" value={bank.swift_code} onChange={(e) => setBank({ ...bank, swift_code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Currency</Label><Input className="h-9" value={bank.bank_currency} onChange={(e) => setBank({ ...bank, bank_currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bank country</Label><Input className="h-9" value={bank.bank_country} onChange={(e) => setBank({ ...bank, bank_country: e.target.value })} /></div>
          </div>
        ) : data?.bank ? (
          <div className="rounded-lg border mt-3">
            <div className="grid grid-cols-[1.4fr_2fr_1fr_auto] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <span>Bank</span><span>Account number</span><span>Currency</span><span></span>
            </div>
            <div className="grid grid-cols-[1.4fr_2fr_1fr_auto] gap-4 items-center px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{bank.bank_name || "—"}</span>
              </div>
              <span className="font-mono text-xs">
                {bank.iban ? `••••${bank.iban.slice(-4)}` : "—"}
                {bank.swift_code && <span className="text-muted-foreground"> / {bank.swift_code}</span>}
              </span>
              <span>{bank.bank_currency || "—"}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing("bank")}>Details</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">No bank account on file.</p>
        )}
      </SectionShell>

      {/* ── Residence address ── */}
      <SectionShell
        title="Residence address"
        action={
          editing === "address" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("address")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("address")}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit residence address
            </Button>
          )
        }
      >
        <Row icon={MapPin} label="Address Line 1">
          {editing === "address"
            ? <Input value={address.address_line1} onChange={(e) => setAddress({ ...address, address_line1: e.target.value })} className="h-8 max-w-xl" />
            : <span>{address.address_line1 || "—"}</span>}
        </Row>
        {(editing === "address" || address.address_line2) && (
          <Row icon={MapPin} label="Address Line 2">
            {editing === "address"
              ? <Input value={address.address_line2} onChange={(e) => setAddress({ ...address, address_line2: e.target.value })} className="h-8 max-w-xl" />
              : <span>{address.address_line2 || "—"}</span>}
          </Row>
        )}
        <Row icon={MapPin} label="Postal code">
          {editing === "address"
            ? <Input value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} className="h-8 max-w-sm" />
            : <span>{address.postal_code || "—"}</span>}
        </Row>
        <Row icon={Flag} label="Country">
          {editing === "address"
            ? <Input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className="h-8 max-w-sm" />
            : <span>{address.country || "—"}</span>}
        </Row>
        <Row icon={Building2} label="City">
          {editing === "address"
            ? <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="h-8 max-w-sm" />
            : <span>{address.city || "—"}</span>}
        </Row>
        <Row icon={Building2} label="State">
          {editing === "address"
            ? <Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className="h-8 max-w-sm" />
            : <span>{address.state || "—"}</span>}
        </Row>
        <Row icon={Clock} label="Timezone">
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone || "—"}</span>
        </Row>
      </SectionShell>

      {/* ── Contact details ── */}
      <SectionShell
        title="Contact details"
        action={
          editing === "contact" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("contact")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("contact")}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit contacts
            </Button>
          )
        }
      >
        <Row icon={Mail} label="Personal email">
          {editing === "contact"
            ? <Input value={contact.personal_email} onChange={(e) => setContact({ ...contact, personal_email: e.target.value })} className="h-8 max-w-md" />
            : (
              <span className="flex items-center gap-1.5">
                {contact.personal_email || "—"}
                {contact.personal_email && (
                  <button onClick={() => copy(contact.personal_email, toast)}>
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </span>
            )}
        </Row>
        <Row icon={Phone} label="Phone number">
          {editing === "contact"
            ? <Input value={contact.personal_phone} onChange={(e) => setContact({ ...contact, personal_phone: e.target.value })} className="h-8 max-w-md" />
            : (
              <span className="flex items-center gap-1.5">
                {contact.personal_phone || "—"}
                {contact.personal_phone && (
                  <button onClick={() => copy(contact.personal_phone, toast)}>
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </span>
            )}
        </Row>
      </SectionShell>

      {/* ── Education ── */}
      <SectionShell
        title="Education"
        action={
          editing === "education" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("education")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("education")}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add education
            </Button>
          )
        }
      >
        {education.length === 0 && editing !== "education" ? (
          <p className="text-sm text-muted-foreground py-2">No education records.</p>
        ) : (
          <div className="space-y-3 mt-2">
            {education.map((ed, i) => (
              <div key={ed.id ?? i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pb-3 border-b last:border-0">
                {editing === "education" ? (
                  <>
                    <div className="space-y-1"><Label className="text-[10px] uppercase">Institution</Label><Input className="h-8" value={ed.institution} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], institution: e.target.value }; setEducation(u); }} /></div>
                    <div className="space-y-1"><Label className="text-[10px] uppercase">Degree</Label><Input className="h-8" value={ed.degree} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], degree: e.target.value }; setEducation(u); }} /></div>
                    <div className="space-y-1"><Label className="text-[10px] uppercase">Field of study</Label><Input className="h-8" value={ed.field_of_study} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], field_of_study: e.target.value }; setEducation(u); }} /></div>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1"><Label className="text-[10px] uppercase">Year</Label><Input className="h-8" value={ed.start_year} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], start_year: e.target.value }; setEducation(u); }} /></div>
                      <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => setEducation(education.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center"><GraduationCap className="h-3.5 w-3.5" /></span>
                      <div>
                        <p className="text-sm font-medium">{ed.institution || "—"}</p>
                        <p className="text-xs text-muted-foreground">{[ed.degree, ed.field_of_study].filter(Boolean).join(" • ") || "—"}</p>
                      </div>
                    </div>
                    <div className="text-sm">{ed.start_year || "—"}</div>
                  </>
                )}
              </div>
            ))}
            {editing === "education" && (
              <Button size="sm" variant="outline" onClick={() => setEducation([...education, { institution: "", degree: "", field_of_study: "", start_year: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add education
              </Button>
            )}
          </div>
        )}
      </SectionShell>

      {/* ── Emergency contact ── */}
      <SectionShell
        title="Emergency contact"
        action={
          editing === "emergency" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save("emergency")}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing("emergency")}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit emergency contact
            </Button>
          )
        }
      >
        {editing === "emergency" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="space-y-1"><Label className="text-[10px] uppercase">Name</Label><Input className="h-9" value={emergency.name} onChange={(e) => setEmergency({ ...emergency, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase">Relation</Label><Input className="h-9" value={emergency.relation} onChange={(e) => setEmergency({ ...emergency, relation: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase">Phone</Label><Input className="h-9" value={emergency.phone} onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase">Email</Label><Input className="h-9" value={emergency.email} onChange={(e) => setEmergency({ ...emergency, email: e.target.value })} /></div>
          </div>
        ) : data?.emergency && (emergency.name || emergency.phone) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</p><p className="text-sm font-medium mt-0.5">{emergency.name || "—"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Relation</p><p className="text-sm font-medium mt-0.5">{emergency.relation || "—"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p><p className="text-sm font-medium mt-0.5">{emergency.phone || "—"}</p></div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-3">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No emergency contact found</p>
            <p className="text-xs text-muted-foreground mt-1">Please update emergency contact records for {fullName}.</p>
            <Button size="sm" className="mt-4" onClick={() => setEditing("emergency")}>Add emergency contact</Button>
          </div>
        )}
      </SectionShell>

      {/* ── Profile photo (kept for utility) ── */}
      <SectionShell title="Profile photo">
        <div className="flex items-center gap-4 mt-2">
          <Avatar className="h-14 w-14 rounded-lg">
            {avatarUrl ? <AvatarImage src={avatarUrl} className="rounded-lg object-cover" /> : null}
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <FileUpload
            bucket="avatars"
            pathPrefix={user?.id ?? "anonymous"}
            fileName="avatar"
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={2}
            currentUrl={avatarUrl}
            onUploaded={(_p, url) => {
              if (url && empId) {
                setAvatarUrl(url);
                void (supabase as any).from("employees").update({ avatar_url: url }).eq("id", empId);
                if (user) void supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
              }
            }}
            onRemoved={() => {
              setAvatarUrl(undefined);
              if (empId) void (supabase as any).from("employees").update({ avatar_url: null }).eq("id", empId);
              if (user) void supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
            }}
          />
        </div>
      </SectionShell>
        </TabsContent>

        <TabsContent value="work" className="space-y-6 mt-4">
          <SectionShell title="Employment details">
            <Row icon={IdCard} label="Employee ID"><span className="font-mono text-xs">{employee.emp_id || "—"}</span></Row>
            <Row icon={Briefcase} label="Designation"><span>{employee.designation || "—"}</span></Row>
            <Row icon={Building2} label="Department"><span>{employee.department || "—"}</span></Row>
            <Row icon={CalendarIcon} label="Joining date">
              <span>{employee.joining_date ? format(new Date(employee.joining_date), "dd MMM yyyy") : "—"}</span>
            </Row>
            <Row icon={Clock} label="Tenure"><span>{tenureLabel}</span></Row>
            <Row icon={MapPin} label="Work location">
              <span>{[employee.work_location_city, employee.work_location_country].filter(Boolean).join(", ") || "—"}</span>
            </Row>
            <Row icon={UserIcon} label="Type of hire"><span className="capitalize">{employee.category || "—"}</span></Row>
            <Row icon={UsersIcon} label="Reports to">
              <span>{managerEmp ? `${managerEmp.firstName} ${managerEmp.lastName}` : managerName}</span>
            </Row>
          </SectionShell>

          {directReports.length > 0 && (
            <SectionShell title={`Direct reports (${directReports.length})`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {directReports.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-primary/10 text-primary">{(r.firstName?.[0] ?? "") + (r.lastName?.[0] ?? "")}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.designation || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}
        </TabsContent>

        <TabsContent value="compensation" className="space-y-6 mt-4">
          <CompensationTab compensation={data?.compensation ?? []} baseSalary={data?.baseSalary ?? 0} currency={employee.pay_currency} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6 mt-4">
          <DocumentsTab employeeId={empId} />
        </TabsContent>

        <TabsContent value="assets" className="space-y-6 mt-4">
          <AssetsTab employeeId={empId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────── Sub-tabs ───────── */

function CompensationTab({ compensation, baseSalary, currency }: { compensation: any[]; baseSalary: number; currency?: string }) {
  const total = compensation.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const cur = currency || "";
  return (
    <SectionShell title="Compensation breakdown">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Base salary</p>
          <p className="text-lg font-semibold mt-1">{baseSalary.toLocaleString()} {cur}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total gross</p>
          <p className="text-lg font-semibold mt-1">{total.toLocaleString()} {cur}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Components</p>
          <p className="text-lg font-semibold mt-1">{compensation.length}</p>
        </div>
      </div>
      {compensation.length === 0 ? (
        <EmptyState icon={Wallet} title="No compensation set" description="Your compensation components have not been configured yet." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Type</TableHead><TableHead>Effective from</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {compensation.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.component_name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-[10px]">{c.component_type}</Badge></TableCell>
                <TableCell className="text-xs">{c.effective_from ? format(new Date(c.effective_from), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right font-mono">{Number(c.amount).toLocaleString()} {cur}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionShell>
  );
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { clientId } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ doc_type: "", doc_number: "", issue_date: "", expiry_date: "" });
  const [pendingFile, setPendingFile] = useState<{ path: string; url: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["my-documents", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({ doc_type: "", doc_number: "", issue_date: "", expiry_date: "" });
    setPendingFile(null);
  };

  const submit = async () => {
    if (!form.doc_type.trim()) {
      toast({ title: "Document type required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      employee_id: employeeId,
      client_id: clientId,
      doc_type: form.doc_type.trim(),
      doc_number: form.doc_number || null,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      file_url: pendingFile?.path || null,
      uploaded_by_self: true,
      status: "active",
    };
    const { error } = await (supabase as any).from("employee_documents").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to add document", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Document added" });
    setUploadOpen(false);
    resetForm();
    qc.invalidateQueries({ queryKey: ["my-documents", employeeId] });
  };

  const removeDoc = async (d: any) => {
    if (!confirm(`Delete document "${d.doc_type}"?`)) return;
    if (d.file_url && d.uploaded_by_self) {
      await supabase.storage.from("employee-documents").remove([d.file_url]);
    }
    const { error } = await (supabase as any).from("employee_documents").delete().eq("id", d.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    qc.invalidateQueries({ queryKey: ["my-documents", employeeId] });
  };

  const openFile = async (d: any) => {
    if (!d.file_url) return;
    if (d.file_url.startsWith("http")) { window.open(d.file_url, "_blank"); return; }
    const url = await getSignedUrl("employee-documents", d.file_url);
    if (url) window.open(url, "_blank");
    else toast({ title: "Could not open file", variant: "destructive" });
  };

  return (
    <SectionShell
      title={`Documents (${docs.length})`}
      action={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Upload document
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Upload a document or wait for HR to add one." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Issued</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {docs.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium capitalize">{d.doc_type}</TableCell>
                <TableCell className="font-mono text-xs">{d.doc_number || "—"}</TableCell>
                <TableCell className="text-xs">{d.issue_date ? format(new Date(d.issue_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-xs">{d.expiry_date ? format(new Date(d.expiry_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-right space-x-1">
                  {d.file_url && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openFile(d)}>View</Button>
                  )}
                  {d.uploaded_by_self && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeDoc(d)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Document type *</Label>
              <Input value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} placeholder="e.g. Passport, Visa, Certificate" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Document number</Label><Input value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <FileUpload
                bucket="employee-documents"
                pathPrefix={employeeId}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                maxSizeMB={10}
                privateBucket
                onUploaded={(path, url) => setPendingFile({ path, url })}
                onRemoved={() => setPendingFile(null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

function AssetsTab({ employeeId }: { employeeId: string }) {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["my-assets", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, asset_tag, name, status, serial_number, warranty_expiry, asset_categories(name), asset_conditions(name)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SectionShell title={`Assigned assets (${assets.length})`}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : assets.length === 0 ? (
        <EmptyState icon={Package} title="No assets assigned" description="Assets your manager assigns will appear here." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Serial #</TableHead><TableHead>Condition</TableHead><TableHead>Warranty</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {assets.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.asset_tag ?? a.id}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{a.asset_categories?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.serial_number ?? "—"}</TableCell>
                <TableCell>{a.asset_conditions?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">{a.warranty_expiry ? new Date(a.warranty_expiry).toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusBadge status={a.status ?? "assigned"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionShell>
  );
}
