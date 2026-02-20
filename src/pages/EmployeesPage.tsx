import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees, leaveRequests, assets } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload, User, Briefcase, DollarSign, Calendar, Monitor, ChevronLeft, Edit2, Save, X, GraduationCap, Heart, Phone, MapPin, Building, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/types/hcm";

interface EmployeeDoc {
  name: string;
  type: string;
  uploadedDate: string;
}

const employeeDocs: Record<string, EmployeeDoc[]> = {
  "1": [
    { name: "National ID", type: "Identity", uploadedDate: "2021-03-15" },
    { name: "Employment Contract", type: "Contract", uploadedDate: "2021-03-15" },
  ],
  "2": [
    { name: "National ID", type: "Identity", uploadedDate: "2019-06-01" },
    { name: "Tax Certificate", type: "Tax", uploadedDate: "2024-01-10" },
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

function EmployeeDirectoryTable({ onSelect }: { onSelect: (emp: Employee) => void }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Department</TableHead>
            <TableHead className="font-semibold">Designation</TableHead>
            <TableHead className="font-semibold">Joined</TableHead>
            <TableHead className="font-semibold text-right">Salary (SAR)</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
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
              <TableCell className="text-sm">{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
              <TableCell className="text-sm text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
              <TableCell><StatusBadge status={emp.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PersonalInfoTab({ emp }: { emp: Employee }) {
  const ext = getExtData(emp.id);
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useToast();

  const [bio, setBio] = useState({
    firstName: emp.firstName, lastName: emp.lastName, dateOfBirth: emp.dateOfBirth,
    gender: ext.gender, maritalStatus: ext.maritalStatus, religion: ext.religion, nationality: ext.nationality,
  });
  const [bank, setBank] = useState({
    bankName: ext.bankName, bankCountry: ext.bankCountry, swiftCode: ext.swiftCode,
    bankAddress: ext.bankAddress, iban: ext.iban, bankCurrency: ext.bankCurrency, beneficiaryName: ext.beneficiaryName,
  });
  const [address, setAddress] = useState({
    addressLine1: ext.addressLine1, addressLine2: ext.addressLine2,
    city: ext.city, state: ext.state, country: ext.country, postalCode: ext.postalCode,
  });
  const [contact, setContact] = useState({
    personalPhone: ext.personalPhone, personalEmail: ext.personalEmail,
    emergencyName: ext.emergencyName, emergencyRelation: ext.emergencyRelation,
    emergencyPhone: ext.emergencyPhone, emergencyEmail: ext.emergencyEmail,
  });
  const [education, setEducation] = useState(ext.education);
  const [dependants, setDependants] = useState(ext.dependants);

  const save = (section: string) => {
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
  const [data, setData] = useState({
    department: emp.department, designation: emp.designation, joiningDate: emp.joiningDate,
    reportsTo: ext.reportsTo, workEmail: ext.workEmail, empId: emp.empId,
    workLocationCity: ext.workLocationCity, workLocationCountry: ext.workLocationCountry, division: ext.division,
  });

  return (
    <SectionCard title="Work Information" icon={Briefcase} editing={editing} onEdit={() => setEditing(true)} onSave={() => { setEditing(false); toast({ title: "Saved", description: "Work info updated." }); }} onCancel={() => setEditing(false)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditableField label="Employee ID" value={data.empId} editing={editing} onChange={v => setData({ ...data, empId: v })} />
        <EditableField label="Work Email" value={data.workEmail} editing={editing} onChange={v => setData({ ...data, workEmail: v })} />
        <EditableField label="Department" value={data.department} editing={editing} onChange={v => setData({ ...data, department: v })} />
        <EditableField label="Designation" value={data.designation} editing={editing} onChange={v => setData({ ...data, designation: v })} />
        <EditableField label="Division" value={data.division} editing={editing} onChange={v => setData({ ...data, division: v })} />
        <EditableField label="Reports To" value={data.reportsTo} editing={editing} onChange={v => setData({ ...data, reportsTo: v })} />
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

function CompensationTab({ emp }: { emp: Employee }) {
  const ext = getExtData(emp.id);
  const components = emp.compensation || [];
  const total = components.reduce((s, c) => s + c.amount, 0);
  const [editing, setEditing] = useState(false);
  const [compData, setCompData] = useState(components.map(c => ({ ...c })));
  const [showAddChange, setShowAddChange] = useState(false);
  const [newChange, setNewChange] = useState({ effectiveDate: "", reason: "", components: compData.map(c => ({ name: c.name, amount: c.amount })) });
  const { toast } = useToast();

  const currentTotal = compData.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <SectionCard title="Current Compensation" icon={DollarSign} editing={editing} onEdit={() => setEditing(true)} onSave={() => { setEditing(false); toast({ title: "Saved", description: "Compensation updated." }); }} onCancel={() => setEditing(false)}>
        <div className="space-y-3">
          {compData.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <p className="text-sm">{c.name}</p>
              {editing ? (
                <Input type="number" value={c.amount} onChange={e => { const u = [...compData]; u[i] = { ...u[i], amount: Number(e.target.value) }; setCompData(u); }} className="w-32 h-8 text-sm text-right" />
              ) : (
                <p className="text-sm font-semibold">{c.amount.toLocaleString()} SAR</p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t-2">
            <p className="text-sm font-bold">Total Package</p>
            <p className="text-sm font-bold text-primary">{currentTotal.toLocaleString()} SAR</p>
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
                  <TableHead className="text-right">Total (SAR)</TableHead>
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
                <span className="text-sm font-bold text-primary">{newChange.components.reduce((s, c) => s + c.amount, 0).toLocaleString()} SAR</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChange(false)}>Cancel</Button>
            <Button onClick={() => { setShowAddChange(false); toast({ title: "Change Scheduled", description: `Compensation change effective ${newChange.effectiveDate} recorded.` }); }}>Save Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimeOffTab({ emp }: { emp: Employee }) {
  const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id);
  const totalUsed = empLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);
  const [editing, setEditing] = useState(false);
  const [entitlement, setEntitlement] = useState("21");
  const { toast } = useToast();

  return (
    <SectionCard title="Time Off & Vacation" icon={Calendar} editing={editing} onEdit={() => setEditing(true)} onSave={() => { setEditing(false); toast({ title: "Saved", description: "Time off settings updated." }); }} onCancel={() => setEditing(false)}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Annual Entitlement</p>
          {editing ? <Input type="number" value={entitlement} onChange={e => setEntitlement(e.target.value)} className="h-8 text-center mt-1" /> : <p className="text-xl font-bold">{entitlement}</p>}
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="text-xl font-bold">{totalUsed}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-xl font-bold text-primary">{Number(entitlement) - totalUsed}</p>
        </div>
      </div>
      {empLeaves.length > 0 ? (
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
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No leave records found.</p>
      )}
    </SectionCard>
  );
}

function DocumentsTab({ emp, onUpload }: { emp: Employee; onUpload: () => void }) {
  const docs = employeeDocs[emp.id] || [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Documents</CardTitle>
        <Button size="sm" variant="outline" onClick={onUpload}><Upload className="h-4 w-4 mr-2" />Upload</Button>
      </CardHeader>
      <CardContent>
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type} · {doc.uploadedDate}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
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
  );
}

function AssetsTab({ emp }: { emp: Employee }) {
  const empAssets = assets.filter(a => a.employeeId === emp.id);
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

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const { toast } = useToast();

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setAddEmpOpen(false);
    toast({ title: "Employee Added", description: "The new employee has been added to the directory." });
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadDocOpen(false);
    toast({ title: "Document Uploaded", description: "The document has been uploaded successfully." });
  };

  if (selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-lg font-bold text-secondary-foreground">{selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
            <p className="text-sm text-muted-foreground">{selectedEmployee.designation} · {selectedEmployee.department} · {selectedEmployee.empId}</p>
          </div>
        </div>

        <Tabs defaultValue="personal">
          <TabsList className="flex-wrap">
            <TabsTrigger value="personal"><User className="h-3.5 w-3.5 mr-1.5" />Personal</TabsTrigger>
            <TabsTrigger value="work"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
            <TabsTrigger value="compensation"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Compensation</TabsTrigger>
            <TabsTrigger value="timeoff"><Calendar className="h-3.5 w-3.5 mr-1.5" />Time Off</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1.5" />Documents</TabsTrigger>
            <TabsTrigger value="assets"><Monitor className="h-3.5 w-3.5 mr-1.5" />Assets</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-4"><PersonalInfoTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="work" className="mt-4"><WorkInfoTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="compensation" className="mt-4"><CompensationTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="timeoff" className="mt-4"><TimeOffTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="documents" className="mt-4"><DocumentsTab emp={selectedEmployee} onUpload={() => setUploadDocOpen(true)} /></TabsContent>
          <TabsContent value="assets" className="mt-4"><AssetsTab emp={selectedEmployee} /></TabsContent>
        </Tabs>

        <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a document for {selectedEmployee.firstName} {selectedEmployee.lastName}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div className="space-y-2"><Label>Document Name</Label><Input placeholder="e.g. Employment Contract" required /></div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select required>
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
              <div className="space-y-2"><Label>File</Label><Input type="file" accept=".pdf,.jpg,.png,.doc,.docx" required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUploadDocOpen(false)}>Cancel</Button>
                <Button type="submit">Upload</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      <EmployeeDirectoryTable onSelect={setSelectedEmployee} />

      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Enter the details of the new employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input placeholder="First name" required /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input placeholder="Last name" required /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="employee@cg.com" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select required>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assurance">Assurance</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="advisory">Advisory</SelectItem>
                    <SelectItem value="strategy">Strategy</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Designation</Label><Input placeholder="e.g. Associate" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Joining Date</Label><Input type="date" required /></div>
              <div className="space-y-2"><Label>Salary (SAR)</Label><Input type="number" placeholder="0" required min={1} /></div>
            </div>
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
