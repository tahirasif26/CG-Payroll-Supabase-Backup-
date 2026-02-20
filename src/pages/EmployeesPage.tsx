import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees, leaveRequests, loans, expenses, assets } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload, User, Briefcase, DollarSign, Calendar, Monitor, ChevronLeft } from "lucide-react";
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
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Personal Information</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><p className="text-xs text-muted-foreground">Full Name</p><p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p></div>
            <div><p className="text-xs text-muted-foreground">Employee ID</p><p className="text-sm font-medium font-mono">{emp.empId}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{emp.email}</p></div>
          </div>
          <div className="space-y-4">
            <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{emp.phone}</p></div>
            <div><p className="text-xs text-muted-foreground">Date of Birth</p><p className="text-sm font-medium">{new Date(emp.dateOfBirth).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={emp.status} /></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkInfoTab({ emp }: { emp: Employee }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Work Information</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><p className="text-xs text-muted-foreground">Department</p><p className="text-sm font-medium">{emp.department}</p></div>
            <div><p className="text-xs text-muted-foreground">Designation</p><p className="text-sm font-medium">{emp.designation}</p></div>
          </div>
          <div className="space-y-4">
            <div><p className="text-xs text-muted-foreground">Joining Date</p><p className="text-sm font-medium">{new Date(emp.joiningDate).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Tenure</p><p className="text-sm font-medium">{Math.floor((Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years</p></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompensationTab({ emp }: { emp: Employee }) {
  const components = emp.compensation || [];
  const total = components.reduce((s, c) => s + c.amount, 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Compensation Details</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {components.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <p className="text-sm">{c.name}</p>
              <p className="text-sm font-semibold">{c.amount.toLocaleString()} SAR</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t-2">
            <p className="text-sm font-bold">Total Package</p>
            <p className="text-sm font-bold text-primary">{total.toLocaleString()} SAR</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeOffTab({ emp }: { emp: Employee }) {
  const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id);
  const totalUsed = empLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Time Off & Vacation</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Annual Entitlement</p>
            <p className="text-xl font-bold">21</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Used</p>
            <p className="text-xl font-bold">{totalUsed}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold text-primary">{21 - totalUsed}</p>
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
      </CardContent>
    </Card>
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

        {/* Upload Document Dialog */}
        <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a document for {selectedEmployee.firstName} {selectedEmployee.lastName}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="e.g. Employment Contract" required />
              </div>
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
              <div className="space-y-2">
                <Label>File</Label>
                <Input type="file" accept=".pdf,.jpg,.png,.doc,.docx" required />
              </div>
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

      {/* Add Employee Dialog */}
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
