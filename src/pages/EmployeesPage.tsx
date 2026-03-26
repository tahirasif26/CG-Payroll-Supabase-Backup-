import { useState, useMemo } from "react";
import { useAudit } from "@/contexts/AuditContext";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees as importedEmployees, leaveRequests, loans, payrollRuns } from "@/data/mockData";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useAssets } from "@/contexts/AssetContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload, User, Briefcase, DollarSign, Calendar, Monitor, ChevronLeft, Edit2, Save, X, GraduationCap, Heart, Phone, MapPin, Building, CreditCard, ArrowUpDown, Search, Filter, UserMinus, ClipboardList, RefreshCw, History, Settings, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/types/hcm";
import { compensationSettings, availableCurrencies } from "@/data/settingsData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { eosBenefitConfigs, calculateEOSBenefit } from "@/pages/settings/EOSBenefitsPage";
import { useSeparations } from "@/contexts/SeparationContext";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { useReporting } from "@/contexts/ReportingContext";
import { useReminderSettings } from "@/contexts/ReminderSettingsContext";

interface EmployeeDocVersion {
  name: string;
  uploadedDate: string;
  expiryDate?: string;
}

interface EmployeeDoc {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  expiryDate?: string;
  version: number;
  previousVersions: EmployeeDocVersion[];
}

type DocExpiryStatus = "active" | "expiring-soon" | "expired" | "no-expiry";

function getDocExpiryStatus(expiryDate?: string, reminderDays: number = 30): DocExpiryStatus {
  if (!expiryDate) return "no-expiry";
  const expiry = parseISO(expiryDate);
  if (isPast(expiry)) return "expired";
  if (differenceInDays(expiry, new Date()) <= reminderDays) return "expiring-soon";
  return "active";
}

const initialEmployeeDocs: Record<string, EmployeeDoc[]> = {
  "1": [
    { id: "d1", name: "National ID", type: "Identity", uploadedDate: "2021-03-15", expiryDate: "2025-06-01", version: 1, previousVersions: [] },
    { id: "d2", name: "Employment Contract", type: "Contract", uploadedDate: "2021-03-15", version: 1, previousVersions: [] },
    { id: "d3", name: "Work Permit", type: "Certificate", uploadedDate: "2023-01-10", expiryDate: "2024-12-31", version: 2, previousVersions: [{ name: "Work Permit", uploadedDate: "2021-03-15", expiryDate: "2022-12-31" }] },
  ],
  "2": [
    { id: "d4", name: "National ID", type: "Identity", uploadedDate: "2019-06-01", expiryDate: "2029-06-01", version: 1, previousVersions: [] },
    { id: "d5", name: "Tax Certificate", type: "Tax", uploadedDate: "2024-01-10", expiryDate: "2025-12-31", version: 1, previousVersions: [] },
  ],
};

// Extended employee data (mock - in production this would come from DB)
interface ExtendedEmployeeData {
  gender: string;
  maritalStatus: string;
  religion: string;
  nationality: string;
  bankName: string;
  bankCountry: string;
  swiftCode: string;
  bankAddress: string;
  iban: string;
  bankCurrency: string;
  beneficiaryName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  personalPhone: string;
  personalEmail: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  emergencyEmail: string;
  education: { degree: string; institution: string; year: string; field: string }[];
  dependants: { name: string; relation: string; dateOfBirth: string }[];
  reportsTo: string;
  workEmail: string;
  workLocationCity: string;
  workLocationCountry: string;
  division: string;
  compensationHistory: { effectiveDate: string; components: { name: string; amount: number }[]; reason: string }[];
}

const extendedData: Record<string, ExtendedEmployeeData> = {
  "1": {
    gender: "Female", maritalStatus: "Single", religion: "Islam", nationality: "Saudi",
    bankName: "Al Rajhi Bank", bankCountry: "Saudi Arabia", swiftCode: "RJHISARI", bankAddress: "Riyadh Main Branch", iban: "SA0380000000608010167519", bankCurrency: "SAR", beneficiaryName: "Aisha Rahman",
    addressLine1: "123 King Fahd Road", addressLine2: "Apt 4B", city: "Riyadh", state: "Riyadh Province", country: "Saudi Arabia", postalCode: "11564",
    personalPhone: "+966 50 123 4567", personalEmail: "aisha.personal@gmail.com",
    emergencyName: "Ahmed Rahman", emergencyRelation: "Father", emergencyPhone: "+966 50 999 8888", emergencyEmail: "ahmed.rahman@gmail.com",
    education: [{ degree: "Bachelor of Accounting", institution: "King Saud University", year: "2016", field: "Accounting" }],
    dependants: [],
    reportsTo: "Layla Qasim", workEmail: "aisha.rahman@cg.com", workLocationCity: "Riyadh", workLocationCountry: "Saudi Arabia", division: "Assurance",
    compensationHistory: [
      { effectiveDate: "2024-01-01", components: [{ name: "Basic Salary", amount: 10800 }, { name: "Housing Allowance", amount: 4500 }, { name: "Travel Allowance", amount: 900 }, { name: "Medical Allowance", amount: 900 }, { name: "Other Allowances", amount: 900 }], reason: "Annual Review" },
      { effectiveDate: "2021-03-15", components: [{ name: "Basic Salary", amount: 9000 }, { name: "Housing Allowance", amount: 3750 }, { name: "Travel Allowance", amount: 750 }, { name: "Medical Allowance", amount: 750 }, { name: "Other Allowances", amount: 750 }], reason: "Joining" },
    ],
  },
  "2": {
    gender: "Male", maritalStatus: "Married", religion: "Islam", nationality: "Saudi",
    bankName: "Saudi National Bank", bankCountry: "Saudi Arabia", swiftCode: "NCBKSAJE", bankAddress: "Jeddah Branch", iban: "SA4420000001234567891234", bankCurrency: "SAR", beneficiaryName: "Omar Al-Faisal",
    addressLine1: "456 Tahlia Street", addressLine2: "", city: "Jeddah", state: "Makkah Province", country: "Saudi Arabia", postalCode: "21589",
    personalPhone: "+966 55 234 5678", personalEmail: "omar.faisal@gmail.com",
    emergencyName: "Nadia Al-Faisal", emergencyRelation: "Wife", emergencyPhone: "+966 55 111 2222", emergencyEmail: "nadia.faisal@gmail.com",
    education: [{ degree: "Master of Taxation", institution: "KFUPM", year: "2018", field: "Tax Law" }, { degree: "Bachelor of Business", institution: "King Abdulaziz University", year: "2013", field: "Finance" }],
    dependants: [{ name: "Lina Al-Faisal", relation: "Daughter", dateOfBirth: "2020-05-15" }, { name: "Adam Al-Faisal", relation: "Son", dateOfBirth: "2022-09-20" }],
    reportsTo: "Layla Qasim", workEmail: "omar.alfaisal@cg.com", workLocationCity: "Riyadh", workLocationCountry: "Saudi Arabia", division: "Tax",
    compensationHistory: [
      { effectiveDate: "2024-07-01", components: [{ name: "Basic Salary", amount: 16800 }, { name: "Housing Allowance", amount: 7000 }, { name: "Travel Allowance", amount: 1400 }, { name: "Medical Allowance", amount: 1400 }, { name: "Other Allowances", amount: 1400 }], reason: "Promotion to Manager" },
      { effectiveDate: "2019-06-01", components: [{ name: "Basic Salary", amount: 12000 }, { name: "Housing Allowance", amount: 5000 }, { name: "Travel Allowance", amount: 1000 }, { name: "Medical Allowance", amount: 1000 }, { name: "Other Allowances", amount: 1000 }], reason: "Joining" },
    ],
  },
};

function getExtData(empId: string): ExtendedEmployeeData {
  return extendedData[empId] || {
    gender: "", maritalStatus: "", religion: "", nationality: "",
    bankName: "", bankCountry: "", swiftCode: "", bankAddress: "", iban: "", bankCurrency: "", beneficiaryName: "",
    addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
    personalPhone: "", personalEmail: "",
    emergencyName: "", emergencyRelation: "", emergencyPhone: "", emergencyEmail: "",
    education: [], dependants: [],
    reportsTo: "", workEmail: "", workLocationCity: "", workLocationCountry: "", division: "",
    compensationHistory: [],
  };
}

// Reusable editable field
function EditableField({ label, value, editing, onChange, type = "text" }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editing ? (
        <Input value={value} onChange={e => onChange(e.target.value)} type={type} className="h-8 text-sm" />
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, editing, onEdit, onSave, onCancel }: {
  title: string; icon: any; children: React.ReactNode; editing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" />Save</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onEdit}><Edit2 className="h-4 w-4 mr-1" />Edit</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type SortField = "name" | "empId" | "department" | "designation" | "joiningDate" | "salary";
type SortDir = "asc" | "desc";

function EmployeeDirectoryTable({ employees: empList, onSelect }: { employees: Employee[]; onSelect: (emp: Employee) => void }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const departments = Array.from(new Set(empList.map(e => e.department)));
  const statuses = Array.from(new Set(empList.map(e => e.status)));

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const filtered = empList
    .filter(e => {
      const q = search.toLowerCase();
      const matchesSearch = !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || e.department === deptFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case "empId": return dir * a.empId.localeCompare(b.empId);
        case "department": return dir * a.department.localeCompare(b.department);
        case "designation": return dir * a.designation.localeCompare(b.designation);
        case "joiningDate": return dir * (new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime());
        case "salary": return dir * (a.salary - b.salary);
        default: return 0;
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortHeader field="name">Employee</SortHeader>
                <SortHeader field="empId">ID</SortHeader>
                <SortHeader field="department">Department</SortHeader>
                <SortHeader field="designation">Designation</SortHeader>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Work Location</TableHead>
                <SortHeader field="salary">Salary (SAR)</SortHeader>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onSelect(emp)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{emp.empId}</TableCell>
                  <TableCell className="text-sm">{emp.department}</TableCell>
                  <TableCell className="text-sm">{emp.designation}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${emp.category === "direct" ? "bg-primary/10 text-foreground" : "bg-accent text-accent-foreground"}`}>
                      {emp.category === "direct" ? "Direct" : "Contractor"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {emp.workLocationCountry}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={emp.status} /></TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No employees match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {empList.length} employees</p>
    </div>
  );
}

function PersonalInfoTab({ emp }: { emp: Employee }) {
  const ext = getExtData(emp.id);
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useToast();
  const { addLogs } = useAudit();
  const empName = `${emp.firstName} ${emp.lastName}`;

  const [bio, setBio] = useState({
    firstName: emp.firstName, lastName: emp.lastName, dateOfBirth: emp.dateOfBirth,
    gender: ext.gender, maritalStatus: ext.maritalStatus, religion: ext.religion, nationality: ext.nationality,
  });
  const [prevBio, setPrevBio] = useState({ ...bio });
  const [bank, setBank] = useState({
    bankName: ext.bankName, bankCountry: ext.bankCountry, swiftCode: ext.swiftCode,
    bankAddress: ext.bankAddress, iban: ext.iban, bankCurrency: ext.bankCurrency, beneficiaryName: ext.beneficiaryName,
  });
  const [prevBank, setPrevBank] = useState({ ...bank });
  const [address, setAddress] = useState({
    addressLine1: ext.addressLine1, addressLine2: ext.addressLine2,
    city: ext.city, state: ext.state, country: ext.country, postalCode: ext.postalCode,
  });
  const [prevAddress, setPrevAddress] = useState({ ...address });
  const [contact, setContact] = useState({
    personalPhone: ext.personalPhone, personalEmail: ext.personalEmail,
    emergencyName: ext.emergencyName, emergencyRelation: ext.emergencyRelation,
    emergencyPhone: ext.emergencyPhone, emergencyEmail: ext.emergencyEmail,
  });
  const [prevContact, setPrevContact] = useState({ ...contact });
  const [education, setEducation] = useState(ext.education);
  const [dependants, setDependants] = useState(ext.dependants);

  const diffAndLog = (section: string, prev: Record<string, any>, curr: Record<string, any>) => {
    const changes: Omit<import("@/contexts/AuditContext").AuditLogEntry, "id" | "changedAt" | "changedBy">[] = [];
    for (const key of Object.keys(curr)) {
      if (String(prev[key] || "") !== String(curr[key] || "")) {
        changes.push({ employeeId: emp.id, employeeName: empName, section: `Personal > ${section}`, field: key, oldValue: String(prev[key] || ""), newValue: String(curr[key] || "") });
      }
    }
    if (changes.length > 0) addLogs(changes);
  };

  const save = (section: string) => {
    if (section === "Basic info") { diffAndLog("Basic Information", prevBio, bio); setPrevBio({ ...bio }); }
    else if (section === "Bank details") { diffAndLog("Bank Details", prevBank, bank); setPrevBank({ ...bank }); }
    else if (section === "Address") { diffAndLog("Residential Address", prevAddress, address); setPrevAddress({ ...address }); }
    else if (section === "Contact") { diffAndLog("Contact & Emergency", prevContact, contact); setPrevContact({ ...contact }); }
    else if (section === "Education") { addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Education", field: "education", oldValue: "(previous)", newValue: `${education.length} record(s)` }]); }
    else if (section === "Dependants") { addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Dependants", field: "dependants", oldValue: "(previous)", newValue: `${dependants.length} record(s)` }]); }
    setEditing(null);
    toast({ title: "Saved", description: `${section} updated successfully.` });
  };

  return (
    <div className="space-y-4">
      {/* Bio */}
      <SectionCard title="Basic Information" icon={User} editing={editing === "bio"} onEdit={() => setEditing("bio")} onSave={() => save("Basic info")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EditableField label="First Name" value={bio.firstName} editing={editing === "bio"} onChange={v => setBio({ ...bio, firstName: v })} />
          <EditableField label="Last Name" value={bio.lastName} editing={editing === "bio"} onChange={v => setBio({ ...bio, lastName: v })} />
          <EditableField label="Date of Birth" value={bio.dateOfBirth} editing={editing === "bio"} onChange={v => setBio({ ...bio, dateOfBirth: v })} type="date" />
          <EditableField label="Gender" value={bio.gender} editing={editing === "bio"} onChange={v => setBio({ ...bio, gender: v })} />
          <EditableField label="Marital Status" value={bio.maritalStatus} editing={editing === "bio"} onChange={v => setBio({ ...bio, maritalStatus: v })} />
          <EditableField label="Religion" value={bio.religion} editing={editing === "bio"} onChange={v => setBio({ ...bio, religion: v })} />
          <EditableField label="Nationality" value={bio.nationality} editing={editing === "bio"} onChange={v => setBio({ ...bio, nationality: v })} />
          <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={emp.status} /></div>
        </div>
      </SectionCard>

      {/* Contact & Emergency */}
      <SectionCard title="Contact & Emergency" icon={Phone} editing={editing === "contact"} onEdit={() => setEditing("contact")} onSave={() => save("Contact")} onCancel={() => setEditing(null)}>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField label="Personal Phone" value={contact.personalPhone} editing={editing === "contact"} onChange={v => setContact({ ...contact, personalPhone: v })} />
            <EditableField label="Personal Email" value={contact.personalEmail} editing={editing === "contact"} onChange={v => setContact({ ...contact, personalEmail: v })} />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Name" value={contact.emergencyName} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyName: v })} />
              <EditableField label="Relationship" value={contact.emergencyRelation} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyRelation: v })} />
              <EditableField label="Phone" value={contact.emergencyPhone} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyPhone: v })} />
              <EditableField label="Email" value={contact.emergencyEmail} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyEmail: v })} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Residential Address */}
      <SectionCard title="Residential Address" icon={MapPin} editing={editing === "address"} onEdit={() => setEditing("address")} onSave={() => save("Address")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField label="Address Line 1" value={address.addressLine1} editing={editing === "address"} onChange={v => setAddress({ ...address, addressLine1: v })} />
          <EditableField label="Address Line 2" value={address.addressLine2} editing={editing === "address"} onChange={v => setAddress({ ...address, addressLine2: v })} />
          <EditableField label="City" value={address.city} editing={editing === "address"} onChange={v => setAddress({ ...address, city: v })} />
          <EditableField label="State / Province" value={address.state} editing={editing === "address"} onChange={v => setAddress({ ...address, state: v })} />
          <EditableField label="Country" value={address.country} editing={editing === "address"} onChange={v => setAddress({ ...address, country: v })} />
          <EditableField label="Postal Code" value={address.postalCode} editing={editing === "address"} onChange={v => setAddress({ ...address, postalCode: v })} />
        </div>
      </SectionCard>

      {/* Bank Details */}
      <SectionCard title="Bank Account Details" icon={CreditCard} editing={editing === "bank"} onEdit={() => setEditing("bank")} onSave={() => save("Bank details")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EditableField label="Bank Name" value={bank.bankName} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankName: v })} />
          <EditableField label="Bank Country" value={bank.bankCountry} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankCountry: v })} />
          <EditableField label="SWIFT Code" value={bank.swiftCode} editing={editing === "bank"} onChange={v => setBank({ ...bank, swiftCode: v })} />
          <EditableField label="Bank Address" value={bank.bankAddress} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankAddress: v })} />
          <EditableField label="IBAN" value={bank.iban} editing={editing === "bank"} onChange={v => setBank({ ...bank, iban: v })} />
          <EditableField label="Currency" value={bank.bankCurrency} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankCurrency: v })} />
          <EditableField label="Beneficiary Name" value={bank.beneficiaryName} editing={editing === "bank"} onChange={v => setBank({ ...bank, beneficiaryName: v })} />
        </div>
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education" icon={GraduationCap} editing={editing === "education"} onEdit={() => setEditing("education")} onSave={() => save("Education")} onCancel={() => setEditing(null)}>
        {education.length > 0 ? (
          <div className="space-y-4">
            {education.map((edu, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-3 border-b last:border-0">
                <EditableField label="Degree" value={edu.degree} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], degree: v }; setEducation(u); }} />
                <EditableField label="Field of Study" value={edu.field} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], field: v }; setEducation(u); }} />
                <EditableField label="Institution" value={edu.institution} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], institution: v }; setEducation(u); }} />
                <EditableField label="Year" value={edu.year} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], year: v }; setEducation(u); }} />
              </div>
            ))}
            {editing === "education" && (
              <Button size="sm" variant="outline" onClick={() => setEducation([...education, { degree: "", institution: "", year: "", field: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No education records.</p>
            {editing === "education" && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setEducation([{ degree: "", institution: "", year: "", field: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      {/* Dependants */}
      <SectionCard title="Dependants" icon={Heart} editing={editing === "dependants"} onEdit={() => setEditing("dependants")} onSave={() => save("Dependants")} onCancel={() => setEditing(null)}>
        {dependants.length > 0 ? (
          <div className="space-y-4">
            {dependants.map((dep, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-3 border-b last:border-0">
                <EditableField label="Name" value={dep.name} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], name: v }; setDependants(u); }} />
                <EditableField label="Relationship" value={dep.relation} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], relation: v }; setDependants(u); }} />
                <EditableField label="Date of Birth" value={dep.dateOfBirth} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], dateOfBirth: v }; setDependants(u); }} type="date" />
              </div>
            ))}
            {editing === "dependants" && (
              <Button size="sm" variant="outline" onClick={() => setDependants([...dependants, { name: "", relation: "", dateOfBirth: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Dependant
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No dependants recorded.</p>
            {editing === "dependants" && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setDependants([{ name: "", relation: "", dateOfBirth: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Dependant
              </Button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function WorkInfoTab({ emp }: { emp: Employee }) {
  const ext = getExtData(emp.id);
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { addLogs } = useAudit();
  const { getManagerId, getManagerName, setReportTo } = useReporting();
  const { employees: allEmployees } = useEmployees();
  const activeEmps = allEmployees.filter(e => e.status !== "separated" && e.id !== emp.id);
  const empName = `${emp.firstName} ${emp.lastName}`;

  const currentManagerName = getManagerName(emp.id) || ext.reportsTo || "—";
  const currentManagerId = getManagerId(emp.id) || "";

  const [data, setData] = useState({
    department: emp.department, designation: emp.designation, joiningDate: emp.joiningDate,
    reportsToId: currentManagerId, workEmail: ext.workEmail, empId: emp.empId,
    workLocationCity: ext.workLocationCity, workLocationCountry: ext.workLocationCountry, division: ext.division,
  });
  const [prevData, setPrevData] = useState({ ...data });

  const handleSave = () => {
    const changes: Omit<import("@/contexts/AuditContext").AuditLogEntry, "id" | "changedAt" | "changedBy">[] = [];
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (String(prevData[key] || "") !== String(data[key] || "")) {
        changes.push({ employeeId: emp.id, employeeName: empName, section: "Work Information", field: key, oldValue: String(prevData[key] || ""), newValue: String(data[key] || "") });
      }
    }
    if (changes.length > 0) addLogs(changes);
    setPrevData({ ...data });

    if (data.reportsToId === "__none__") {
      setReportTo(emp.id, null);
    } else if (data.reportsToId) {
      setReportTo(emp.id, data.reportsToId);
    }
    setEditing(false);
    toast({ title: "Saved", description: "Work info updated." });
  };

  // Keep local state in sync with context
  const latestManagerId = getManagerId(emp.id) || "";
  if (!editing && data.reportsToId !== latestManagerId) {
    setData(prev => ({ ...prev, reportsToId: latestManagerId }));
  }

  const reportsToDisplay = getManagerName(emp.id) || "No Manager";

  return (
    <SectionCard title="Work Information" icon={Briefcase} editing={editing} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={() => { setEditing(false); setData(prev => ({ ...prev, reportsToId: latestManagerId })); }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditableField label="Employee ID" value={data.empId} editing={editing} onChange={v => setData({ ...data, empId: v })} />
        <EditableField label="Work Email" value={data.workEmail} editing={editing} onChange={v => setData({ ...data, workEmail: v })} />
        <div>
          <p className="text-xs text-muted-foreground">Employee Category</p>
          <p className="text-sm font-medium">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${emp.category === "direct" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
              {emp.category === "direct" ? "Direct Employee" : "Contractor"}
            </span>
          </p>
        </div>
        <EditableField label="Department" value={data.department} editing={editing} onChange={v => setData({ ...data, department: v })} />
        <EditableField label="Designation" value={data.designation} editing={editing} onChange={v => setData({ ...data, designation: v })} />
        <EditableField label="Division" value={data.division} editing={editing} onChange={v => setData({ ...data, division: v })} />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Reports To</p>
          {editing ? (
            <Select value={data.reportsToId || "__none__"} onValueChange={v => setData({ ...data, reportsToId: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select manager..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Manager (Top Level)</SelectItem>
                {activeEmps.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">{reportsToDisplay}</p>
          )}
        </div>
        <EditableField label="Joining Date" value={data.joiningDate} editing={editing} onChange={v => setData({ ...data, joiningDate: v })} type="date" />
        <div>
          <p className="text-xs text-muted-foreground">Tenure</p>
          <p className="text-sm font-medium">{Math.floor((Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years</p>
        </div>
        <EditableField label="Work Location City" value={data.workLocationCity} editing={editing} onChange={v => setData({ ...data, workLocationCity: v })} />
        <EditableField label="Work Location Country" value={data.workLocationCountry} editing={editing} onChange={v => setData({ ...data, workLocationCountry: v })} />
      </div>
    </SectionCard>
  );
}

function CompensationTab({ emp, onUpdatePayCurrency }: { emp: Employee; onUpdatePayCurrency?: (empId: string, currency: string) => void }) {
  const ext = getExtData(emp.id);
  const { addLogs, addLog } = useAudit();
  const empName = `${emp.firstName} ${emp.lastName}`;
  const activeSettings = compensationSettings.filter(s => s.isActive);
  const existingComponents = emp.compensation || [];
  const initialCompData = activeSettings.map(s => {
    const existing = existingComponents.find(c => c.name === s.name);
    return { name: s.name, type: existing?.type || "other" as const, amount: existing?.amount || 0 };
  });
  const [editing, setEditing] = useState(false);
  const [compData, setCompData] = useState(initialCompData);
  const [prevCompData, setPrevCompData] = useState(initialCompData.map(c => ({ ...c })));
  const [editingPayCurrency, setEditingPayCurrency] = useState(false);
  const [payCurrency, setPayCurrency] = useState(emp.payCurrency || "SAR");
  const [showAddChange, setShowAddChange] = useState(false);
  const [newChange, setNewChange] = useState({ effectiveDate: "", reason: "", components: initialCompData.map(c => ({ name: c.name, amount: c.amount })) });
  const { toast } = useToast();

  // Sync from prop when emp changes (e.g. tab switch)
  const currentPayCurrency = emp.payCurrency || "SAR";

  const currentTotal = compData.reduce((s, c) => s + c.amount, 0);
  const displayCurrency = editingPayCurrency ? payCurrency : currentPayCurrency;
  const currInfo = availableCurrencies.find(c => c.code === displayCurrency);

  return (
    <div className="space-y-4">
      {/* Pay Currency */}
      <SectionCard
        title="Pay Currency"
        icon={DollarSign}
        editing={editingPayCurrency}
        onEdit={() => { setPayCurrency(currentPayCurrency); setEditingPayCurrency(true); }}
        onSave={() => { if (payCurrency !== currentPayCurrency) { addLog({ employeeId: emp.id, employeeName: empName, section: "Compensation > Pay Currency", field: "payCurrency", oldValue: currentPayCurrency, newValue: payCurrency }); } onUpdatePayCurrency?.(emp.id, payCurrency); setEditingPayCurrency(false); toast({ title: "Pay Currency Saved", description: `Pay currency set to ${payCurrency}.` }); }}
        onCancel={() => { setPayCurrency(currentPayCurrency); setEditingPayCurrency(false); }}
      >
        <p className="text-xs text-muted-foreground mb-2">All compensation and payslip values for this employee are in their pay currency.</p>
        {editingPayCurrency ? (
          <div className="max-w-xs">
            <Select value={payCurrency} onValueChange={setPayCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm font-medium">{currInfo ? `${currInfo.symbol} — ${currInfo.name} (${currInfo.code})` : currentPayCurrency}</p>
        )}
      </SectionCard>

      <SectionCard title="Current Compensation" icon={DollarSign} editing={editing} onEdit={() => setEditing(true)} onSave={() => { const changes = compData.filter((c, i) => c.amount !== prevCompData[i]?.amount).map(c => ({ employeeId: emp.id, employeeName: empName, section: "Compensation > Current", field: c.name, oldValue: String(prevCompData.find(p => p.name === c.name)?.amount || 0), newValue: String(c.amount) })); if (changes.length > 0) addLogs(changes); setPrevCompData(compData.map(c => ({ ...c }))); setEditing(false); toast({ title: "Saved", description: "Compensation updated." }); }} onCancel={() => setEditing(false)}>
        <div className="space-y-3">
          {compData.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <p className="text-sm">{c.name}</p>
              {editing ? (
                <Input type="number" value={c.amount} onChange={e => { const u = [...compData]; u[i] = { ...u[i], amount: Number(e.target.value) }; setCompData(u); }} className="w-32 h-8 text-sm text-right" />
              ) : (
                <p className="text-sm font-semibold">{c.amount.toLocaleString()} {displayCurrency}</p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t-2">
            <p className="text-sm font-bold">Total Package</p>
            <p className="text-sm font-bold text-primary">{currentTotal.toLocaleString()} {displayCurrency}</p>
          </div>
        </div>
      </SectionCard>

      {/* Compensation Change */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Compensation History</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddChange(true)}><Plus className="h-4 w-4 mr-1" />New Change</Button>
        </CardHeader>
        <CardContent>
          {ext.compensationHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Total ({displayCurrency})</TableHead>
                  <TableHead>Components</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ext.compensationHistory.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{h.effectiveDate}</TableCell>
                    <TableCell className="text-sm">{h.reason}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{h.components.reduce((s, c) => s + c.amount, 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.components.map(c => `${c.name}: ${c.amount.toLocaleString()}`).join(" · ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No compensation history available.</p>
          )}
        </CardContent>
      </Card>

      {/* New Compensation Change Dialog */}
      <Dialog open={showAddChange} onOpenChange={setShowAddChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Compensation Change</DialogTitle>
            <DialogDescription>Set new compensation effective from a specific date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={newChange.effectiveDate} onChange={e => setNewChange({ ...newChange, effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Reason</Label><Input placeholder="e.g. Promotion" value={newChange.reason} onChange={e => setNewChange({ ...newChange, reason: e.target.value })} /></div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Component Amounts</p>
              {newChange.components.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <Input type="number" value={c.amount} onChange={e => { const u = [...newChange.components]; u[i] = { ...u[i], amount: Number(e.target.value) }; setNewChange({ ...newChange, components: u }); }} className="w-32 h-8 text-sm text-right" />
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-bold">New Total</span>
                <span className="text-sm font-bold text-primary">{newChange.components.reduce((s, c) => s + c.amount, 0).toLocaleString()} {displayCurrency}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChange(false)}>Cancel</Button>
            <Button onClick={() => { addLog({ employeeId: emp.id, employeeName: empName, section: "Compensation > History", field: "New Change", oldValue: "", newValue: `${newChange.reason} effective ${newChange.effectiveDate}, total ${newChange.components.reduce((s, c) => s + c.amount, 0).toLocaleString()}` }); setShowAddChange(false); toast({ title: "Change Scheduled", description: `Compensation change effective ${newChange.effectiveDate} recorded.` }); }}>Save Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimeOffTab({ emp }: { emp: Employee }) {
  const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id);
  const { leaveTypes, getAllocationsForEmployee, setAllocation } = useLeaveTypes();
  const allocations = getAllocationsForEmployee(emp.id);
  const [editing, setEditing] = useState(false);
  const [localAllocs, setLocalAllocs] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const activeTypes = leaveTypes.filter(lt => lt.isActive);

  const getAllocated = (ltId: string) => {
    if (editing && localAllocs[ltId] !== undefined) return localAllocs[ltId];
    const alloc = allocations.find(a => a.leaveTypeId === ltId);
    return alloc ? alloc.allocatedDays : leaveTypes.find(lt => lt.id === ltId)?.defaultDays || 0;
  };

  const getUsed = (ltName: string) => {
    return empLeaves.filter(l => l.status === "approved" && l.type.toLowerCase() === ltName.toLowerCase()).reduce((s, l) => s + l.days, 0);
  };

  const startEditing = () => {
    const allocs: Record<string, number> = {};
    activeTypes.forEach(lt => { allocs[lt.id] = getAllocated(lt.id); });
    setLocalAllocs(allocs);
    setEditing(true);
  };

  const saveEditing = () => {
    Object.entries(localAllocs).forEach(([ltId, days]) => setAllocation(emp.id, ltId, days));
    setEditing(false);
    toast({ title: "Saved", description: "Leave allocations updated." });
  };

  const totalAllocated = activeTypes.reduce((s, lt) => s + getAllocated(lt.id), 0);
  const totalUsed = empLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);

  return (
    <SectionCard title="Time Off & Vacation" icon={Calendar} editing={editing} onEdit={startEditing} onSave={saveEditing} onCancel={() => setEditing(false)}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Entitlement</p>
          <p className="text-xl font-bold">{totalAllocated}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Used</p>
          <p className="text-xl font-bold">{totalUsed}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Remaining</p>
          <p className="text-xl font-bold text-primary">{totalAllocated - totalUsed}</p>
        </div>
      </div>

      {/* Per leave type breakdown */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Leave Type</TableHead>
            <TableHead className="text-center">Allocated</TableHead>
            <TableHead className="text-center">Used</TableHead>
            <TableHead className="text-center">Remaining</TableHead>
            <TableHead className="text-center">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeTypes.map(lt => {
            const allocated = getAllocated(lt.id);
            const used = getUsed(lt.name);
            return (
              <TableRow key={lt.id}>
                <TableCell className="text-sm font-medium">{lt.name}</TableCell>
                <TableCell className="text-center">
                  {editing ? (
                    <Input type="number" min={0} value={localAllocs[lt.id] ?? allocated} onChange={e => setLocalAllocs({ ...localAllocs, [lt.id]: Number(e.target.value) })} className="h-8 w-20 text-center mx-auto" />
                  ) : (
                    <span className="text-sm">{allocated}</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">{used}</TableCell>
                <TableCell className="text-center text-sm font-semibold text-primary">{allocated - used}</TableCell>
                <TableCell className="text-center text-sm">{lt.isPaid ? "Yes" : "No"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Leave history */}
      {empLeaves.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leave History</p>
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {empLeaves.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm capitalize">{l.type}</TableCell>
                  <TableCell className="text-sm">{l.startDate}</TableCell>
                  <TableCell className="text-sm">{l.endDate}</TableCell>
                  <TableCell className="text-sm">{l.days}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

function DocumentsTab({ emp, onUpload, documents, onReupload }: { emp: Employee; onUpload: () => void; documents: EmployeeDoc[]; onReupload: (doc: EmployeeDoc) => void }) {
  const { reminderDays } = useReminderSettings();
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const docsWithStatus = useMemo(() => documents.map(doc => ({
    ...doc,
    expiryStatus: getDocExpiryStatus(doc.expiryDate, reminderDays),
  })), [documents, reminderDays]);

  const expiredCount = docsWithStatus.filter(d => d.expiryStatus === "expired").length;
  const expiringCount = docsWithStatus.filter(d => d.expiryStatus === "expiring-soon").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="flex gap-2">
          {expiredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
              <Bell className="h-3 w-3" />{expiredCount} expired
            </span>
          )}
          {expiringCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning">
              <Bell className="h-3 w-3" />{expiringCount} expiring soon
            </span>
          )}
        </div>
      )}

      {/* Document list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onUpload}><Upload className="h-4 w-4 mr-2" />Upload</Button>
        </CardHeader>
        <CardContent>
          {docsWithStatus.length > 0 ? (
            <div className="space-y-1">
              {docsWithStatus.map((doc) => (
                <div key={doc.id}>
                  <div className={cn(
                    "flex items-center justify-between py-3 px-3 rounded-lg transition-colors",
                    doc.expiryStatus === "expired" && "bg-destructive/5",
                  )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{doc.name}</p>
                          {doc.version > 1 && <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">v{doc.version}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} · {doc.uploadedDate}
                          {doc.expiryDate ? ` · Exp: ${doc.expiryDate}` : " · No Expiry"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={doc.expiryStatus} />
                      <Button variant="ghost" size="sm" onClick={() => onReupload(doc)} className="text-xs">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />Re-upload
                      </Button>
                      {doc.previousVersions.length > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedHistory(expandedHistory === doc.id ? null : doc.id)}>
                          <History className="h-3.5 w-3.5 mr-1" />History
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                  {/* Version history */}
                  {expandedHistory === doc.id && doc.previousVersions.length > 0 && (
                    <div className="ml-12 mb-2 border-l-2 border-muted pl-4 space-y-2 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version History</p>
                      {doc.previousVersions.map((pv, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>v{doc.version - 1 - i} — {pv.name} · {pv.uploadedDate}{pv.expiryDate ? ` · Exp: ${pv.expiryDate}` : ""}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">View</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsTab({ emp }: { emp: Employee }) {
  const { getAssetsForEmployee } = useAssets();
  const empAssets = getAssetsForEmployee(emp.id);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" />Tagged Assets</CardTitle></CardHeader>
      <CardContent>
        {empAssets.length > 0 ? (
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead>Asset</TableHead><TableHead>Category</TableHead><TableHead>Serial No.</TableHead><TableHead>Assigned Date</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {empAssets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell className="text-sm font-mono">{a.serialNumber}</TableCell>
                  <TableCell className="text-sm">{a.assignedDate}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Monitor className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No assets assigned to this employee.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTrailTab({ emp }: { emp: Employee }) {
  const { getLogsForEmployee } = useAudit();
  const logs = getLogsForEmployee(emp.id);
  const [sectionFilter, setSectionFilter] = useState("all");
  const sections = Array.from(new Set(logs.map(l => l.section)));

  const filtered = sectionFilter === "all" ? logs : logs.filter(l => l.section === sectionFilter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Audit Trail</CardTitle>
        {sections.length > 0 && (
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[200px] h-8 text-sm"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Section</TableHead>
                  <TableHead className="font-semibold">Field</TableHead>
                  <TableHead className="font-semibold">Old Value</TableHead>
                  <TableHead className="font-semibold">New Value</TableHead>
                  <TableHead className="font-semibold">Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.changedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-xs"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{log.section}</span></TableCell>
                    <TableCell className="text-sm font-medium">{log.field}</TableCell>
                    <TableCell className="text-sm text-destructive">{log.oldValue || "—"}</TableCell>
                    <TableCell className="text-sm text-primary">{log.newValue || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.changedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No changes recorded yet. Edits to personal info, work info, compensation, and documents will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeparationDialog({ open, onOpenChange, emp, separationData, setSeparationData, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  emp: Employee | null;
  separationData: { lastDate: string; reason: string; noticePeriodDays: number; noticePeriodServed: boolean };
  setSeparationData: (d: any) => void;
  onConfirm: () => void;
}) {
  if (!emp) return null;

  const yearsOfService = emp.joiningDate
    ? (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;
  const basicSalary = emp.compensation?.find(c => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
  const dailySalary = emp.salary / 30;

  // Calculate EOS benefits
  const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo === "all" || c.appliesTo === emp.category));
  const eosBreakdown = applicableEOS.map(config => {
    const basis = config.calculationBasis === "basic_salary" ? basicSalary : emp.salary;
    return { name: config.name, amount: calculateEOSBenefit(config, yearsOfService, basis) };
  });
  const totalEOS = eosBreakdown.reduce((s, e) => s + e.amount, 0);

  // Leave balance (simplified)
  const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id && l.status === "approved");
  const totalUsedLeave = empLeaves.reduce((s, l) => s + l.days, 0);
  const annualEntitlement = 21;
  const remainingLeave = annualEntitlement - totalUsedLeave;
  const leaveEncashment = Math.max(0, remainingLeave) * dailySalary;

  // Unpaid salary (assume current month partial)
  const lastDate = separationData.lastDate ? new Date(separationData.lastDate) : new Date();
  const daysWorkedInMonth = lastDate.getDate();
  const unpaidSalary = Math.round((emp.salary / 30) * daysWorkedInMonth);

  // Notice period
  const noticePeriodPay = separationData.noticePeriodServed ? 0 : Math.round(dailySalary * separationData.noticePeriodDays);

  // Outstanding loans
  const empLoans = loans.filter(l => l.employeeId === emp.id && l.status === "active");
  const totalLoanBalance = empLoans.reduce((s, l) => s + l.remainingBalance, 0);

  const totalSettlement = unpaidSalary + totalEOS + Math.round(leaveEncashment) + noticePeriodPay - totalLoanBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Separation — {emp.firstName} {emp.lastName}</DialogTitle>
          <DialogDescription>Calculate end-of-service settlement and process separation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Separation Reason</Label>
              <Select value={separationData.reason} onValueChange={v => setSeparationData({ ...separationData, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resignation">Resignation</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="end_of_contract">End of Contract</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="mutual">Mutual Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Last Working Date</Label>
              <Input type="date" value={separationData.lastDate} onChange={e => setSeparationData({ ...separationData, lastDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notice Period (Days)</Label>
              <Input type="number" value={separationData.noticePeriodDays} onChange={e => setSeparationData({ ...separationData, noticePeriodDays: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" checked={separationData.noticePeriodServed} onChange={e => setSeparationData({ ...separationData, noticePeriodServed: e.target.checked })} className="h-4 w-4" />
              <Label className="text-sm">Notice period served</Label>
            </div>
          </div>

          <Separator />

          {/* Employee Summary */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Joining Date</p><p className="font-medium">{new Date(emp.joiningDate).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Years of Service</p><p className="font-medium">{yearsOfService.toFixed(1)} years</p></div>
            <div><p className="text-xs text-muted-foreground">Monthly Salary</p><p className="font-medium">SAR {emp.salary.toLocaleString()}</p></div>
          </div>

          <Separator />

          {/* Settlement Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Settlement Calculation</p>
            <div className="bg-muted/30 rounded-lg overflow-hidden text-sm">
              <div className="flex justify-between px-3 py-2 border-b border-border/50">
                <span>Unpaid Salary ({daysWorkedInMonth} days)</span>
                <span className="font-medium">SAR {unpaidSalary.toLocaleString()}</span>
              </div>
              {eosBreakdown.map((eos, i) => (
                <div key={i} className="flex justify-between px-3 py-2 border-b border-border/50">
                  <span>{eos.name}</span>
                  <span className="font-medium">SAR {eos.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 border-b border-border/50">
                <span>Leave Encashment ({Math.max(0, remainingLeave)} days)</span>
                <span className="font-medium">SAR {Math.round(leaveEncashment).toLocaleString()}</span>
              </div>
              {noticePeriodPay > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-border/50">
                  <span>Notice Period Payment ({separationData.noticePeriodDays} days)</span>
                  <span className="font-medium">SAR {noticePeriodPay.toLocaleString()}</span>
                </div>
              )}
              {totalLoanBalance > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                  <span>Outstanding Loan Deduction</span>
                  <span className="font-medium">- SAR {totalLoanBalance.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center bg-primary/10 rounded-lg px-4 py-3 font-bold">
              <span>Total Final Settlement</span>
              <span className="text-primary">SAR {totalSettlement.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!separationData.lastDate}>
            <UserMinus className="h-4 w-4 mr-2" />Process Separation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const { employees: localEmployees, updateEmployee, addEmployee } = useEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [separationOpen, setSeparationOpen] = useState(false);
  const [separationEmp, setSeparationEmp] = useState<Employee | null>(null);
  const [separationData, setSeparationData] = useState({
    lastDate: "",
    reason: "resignation",
    noticePeriodDays: 30,
    noticePeriodServed: true,
  });
  const { toast } = useToast();
  const { addSeparation } = useSeparations();

  // Document state management
  const [allDocs, setAllDocs] = useState<Record<string, EmployeeDoc[]>>(initialEmployeeDocs);
  const [reuploadDoc, setReuploadDoc] = useState<EmployeeDoc | null>(null);
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadExpiryDate, setUploadExpiryDate] = useState<Date | undefined>(undefined);

  const openUploadDialog = () => {
    setReuploadDoc(null);
    setUploadDocName("");
    setUploadDocType("");
    setUploadExpiryDate(undefined);
    setUploadDocOpen(true);
  };

  const openReuploadDialog = (doc: EmployeeDoc) => {
    setReuploadDoc(doc);
    setUploadDocName(doc.name);
    setUploadDocType(doc.type.toLowerCase());
    setUploadExpiryDate(doc.expiryDate ? parseISO(doc.expiryDate) : undefined);
    setUploadDocOpen(true);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newEmp: Employee = {
      id: String(Date.now()),
      empId: `CG-${String(localEmployees.length + 1).padStart(3, "0")}`,
      firstName: (formData.get("firstName") as string) || "New",
      lastName: (formData.get("lastName") as string) || "Employee",
      email: (formData.get("email") as string) || "",
      phone: "",
      department: (formData.get("department") as string) || "Assurance",
      designation: (formData.get("designation") as string) || "Associate",
      joiningDate: (formData.get("joiningDate") as string) || new Date().toISOString().split("T")[0],
      salary: 0,
      status: "active",
      avatar: "",
      dateOfBirth: "",
      category: (formData.get("category") as "direct" | "contractor") || "direct",
      workLocationCountry: (formData.get("workLocationCountry") as string) || "Saudi Arabia",
      compensation: [],
    };
    addEmployee(newEmp);
    setAddEmpOpen(false);
    toast({ title: "Employee Added", description: "The new employee has been added to the directory." });
  };

  const { addLog: auditLog } = useAudit();

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const empId = selectedEmployee.id;
    const today = new Date().toISOString().split("T")[0];
    const expiryStr = uploadExpiryDate ? format(uploadExpiryDate, "yyyy-MM-dd") : undefined;

    if (reuploadDoc) {
      // Re-upload: version increment, push old to history
      setAllDocs(prev => {
        const empDocs = [...(prev[empId] || [])];
        const idx = empDocs.findIndex(d => d.id === reuploadDoc.id);
        if (idx >= 0) {
          const old = empDocs[idx];
          empDocs[idx] = {
            ...old,
            uploadedDate: today,
            expiryDate: expiryStr,
            version: old.version + 1,
            previousVersions: [{ name: old.name, uploadedDate: old.uploadedDate, expiryDate: old.expiryDate }, ...old.previousVersions],
          };
        }
        return { ...prev, [empId]: empDocs };
      });
      auditLog({ employeeId: empId, employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`, section: "Documents", field: "Re-upload", oldValue: `v${reuploadDoc.version}`, newValue: `v${reuploadDoc.version + 1} - ${reuploadDoc.name}` });
      toast({ title: "Document Re-uploaded", description: `${reuploadDoc.name} updated to version ${reuploadDoc.version + 1}.` });
    } else {
      // New upload
      const newDoc: EmployeeDoc = {
        id: `d-${Date.now()}`,
        name: uploadDocName,
        type: uploadDocType.charAt(0).toUpperCase() + uploadDocType.slice(1),
        uploadedDate: today,
        expiryDate: expiryStr,
        version: 1,
        previousVersions: [],
      };
      setAllDocs(prev => ({ ...prev, [empId]: [...(prev[empId] || []), newDoc] }));
      auditLog({ employeeId: empId, employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`, section: "Documents", field: "Upload", oldValue: "", newValue: uploadDocName });
      toast({ title: "Document Uploaded", description: "The document has been uploaded successfully." });
    }
    setUploadDocOpen(false);
  };

  if (selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold text-secondary-foreground">{selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              <p className="text-sm text-muted-foreground">{selectedEmployee.designation} · {selectedEmployee.department} · {selectedEmployee.empId}</p>
            </div>
          </div>
          {selectedEmployee.status !== "separated" && selectedEmployee.status !== "inactive" && (
            <Button variant="destructive" size="sm" onClick={() => { setSeparationEmp(selectedEmployee); setSeparationOpen(true); }}>
              <UserMinus className="h-4 w-4 mr-2" />Initiate Separation
            </Button>
          )}
        </div>

        <Tabs defaultValue="personal">
          <TabsList className="flex-wrap">
            <TabsTrigger value="personal"><User className="h-3.5 w-3.5 mr-1.5" />Personal</TabsTrigger>
            <TabsTrigger value="work"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
            <TabsTrigger value="compensation"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Compensation</TabsTrigger>
            <TabsTrigger value="timeoff"><Calendar className="h-3.5 w-3.5 mr-1.5" />Time Off</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1.5" />Documents</TabsTrigger>
            <TabsTrigger value="assets"><Monitor className="h-3.5 w-3.5 mr-1.5" />Assets</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Audit Trail</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-4"><PersonalInfoTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="work" className="mt-4"><WorkInfoTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="compensation" className="mt-4"><CompensationTab emp={selectedEmployee} onUpdatePayCurrency={(empId, currency) => { updateEmployee(empId, { payCurrency: currency }); setSelectedEmployee(prev => prev && prev.id === empId ? { ...prev, payCurrency: currency } : prev); }} /></TabsContent>
          <TabsContent value="timeoff" className="mt-4"><TimeOffTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="documents" className="mt-4"><DocumentsTab emp={selectedEmployee} onUpload={openUploadDialog} documents={allDocs[selectedEmployee.id] || []} onReupload={openReuploadDialog} /></TabsContent>
          <TabsContent value="assets" className="mt-4"><AssetsTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="audit" className="mt-4"><AuditTrailTab emp={selectedEmployee} /></TabsContent>
        </Tabs>

        <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reuploadDoc ? `Re-upload: ${reuploadDoc.name}` : "Upload Document"}</DialogTitle>
              <DialogDescription>
                {reuploadDoc
                  ? `Updating version ${reuploadDoc.version} to ${reuploadDoc.version + 1} for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`
                  : `Upload a document for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="e.g. Employment Contract" value={uploadDocName} onChange={e => setUploadDocName(e.target.value)} required disabled={!!reuploadDoc} />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType} required disabled={!!reuploadDoc}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identity">Identity</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !uploadExpiryDate && "text-muted-foreground")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {uploadExpiryDate ? format(uploadExpiryDate, "PPP") : "No expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={uploadExpiryDate}
                      onSelect={setUploadExpiryDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {uploadExpiryDate && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setUploadExpiryDate(undefined)}>
                    Clear expiry date
                  </Button>
                )}
              </div>
              <div className="space-y-2"><Label>File</Label><Input type="file" accept=".pdf,.jpg,.png,.doc,.docx" required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUploadDocOpen(false)}>Cancel</Button>
                <Button type="submit">{reuploadDoc ? "Re-upload" : "Upload"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Separation Dialog */}
        <SeparationDialog
          open={separationOpen}
          onOpenChange={setSeparationOpen}
          emp={separationEmp}
          separationData={separationData}
          setSeparationData={setSeparationData}
          onConfirm={() => {
            if (separationEmp) {
              // Calculate settlement for the context record
              const yearsOfService = separationEmp.joiningDate
                ? (Date.now() - new Date(separationEmp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
                : 0;
              const basicSalary = separationEmp.compensation?.find(c => c.type === "base")?.amount || Math.round(separationEmp.salary * 0.6);
              const dailySalary = separationEmp.salary / 30;
              const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo === "all" || c.appliesTo === separationEmp.category));
              const eosBreakdown = applicableEOS.map(config => {
                const basis = config.calculationBasis === "basic_salary" ? basicSalary : separationEmp.salary;
                return { name: config.name, amount: calculateEOSBenefit(config, yearsOfService, basis) };
              });
              const totalEOS = eosBreakdown.reduce((s, e) => s + e.amount, 0);
              const empLeaves = leaveRequests.filter(l => l.employeeId === separationEmp.id && l.status === "approved");
              const remainingLeave = 21 - empLeaves.reduce((s, l) => s + l.days, 0);
              const leaveEncashment = Math.round(Math.max(0, remainingLeave) * dailySalary);
              const lastDate = separationData.lastDate ? new Date(separationData.lastDate) : new Date();
              const unpaidSalary = Math.round(dailySalary * lastDate.getDate());
              const noticePeriodPay = separationData.noticePeriodServed ? 0 : Math.round(dailySalary * separationData.noticePeriodDays);
              const empLoans = loans.filter(l => l.employeeId === separationEmp.id && l.status === "active");
              const loanDeduction = empLoans.reduce((s, l) => s + l.remainingBalance, 0);
              const totalSettlement = unpaidSalary + totalEOS + leaveEncashment + noticePeriodPay - loanDeduction;

              const now = new Date();
              const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

              addSeparation({
                id: `sep-${Date.now()}`,
                employeeId: separationEmp.id,
                employeeName: `${separationEmp.firstName} ${separationEmp.lastName}`,
                empId: separationEmp.empId,
                department: separationEmp.department,
                designation: separationEmp.designation,
                lastDate: separationData.lastDate,
                reason: separationData.reason,
                noticePeriodDays: separationData.noticePeriodDays,
                noticePeriodServed: separationData.noticePeriodServed,
                unpaidSalary,
                eosAmount: totalEOS,
                eosBreakdown,
                leaveEncashment,
                noticePeriodPay,
                loanDeduction,
                totalSettlement,
                processedDate: now.toISOString().split("T")[0],
                payrollMonth: "",
                payrollYear: 0,
                payrollRunId: undefined,
                status: "pending",
              });

              updateEmployee(separationEmp.id, { status: "separated" as const });
              setSelectedEmployee({ ...separationEmp, status: "separated" });
              setSeparationOpen(false);
              toast({ title: "Separation Processed", description: `${separationEmp.firstName} ${separationEmp.lastName} has been separated. Final settlement will be included in the next payroll run.` });
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Directory" description="Manage employee records and documentation.">
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setAddEmpOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Employee
        </Button>
      </PageHeader>

      <EmployeeDirectoryTable employees={localEmployees.filter(e => e.status !== "separated")} onSelect={setSelectedEmployee} />

      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Enter the details of the new employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input name="firstName" placeholder="First name" required /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input name="lastName" placeholder="Last name" required /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" placeholder="employee@cg.com" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <select name="department" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="Assurance">Assurance</option>
                  <option value="Tax">Tax</option>
                  <option value="Advisory">Advisory</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Designation</Label><Input name="designation" placeholder="e.g. Associate" required /></div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select name="category" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select category...</option>
                <option value="direct">Direct Employee</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Joining Date</Label><Input name="joiningDate" type="date" required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddEmpOpen(false)}>Cancel</Button>
              <Button type="submit">Add Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
