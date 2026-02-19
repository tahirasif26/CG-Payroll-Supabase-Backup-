import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<EmployeeDoc | null>(null);
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

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage employee records and documentation.">
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setAddEmpOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Employee
        </Button>
      </PageHeader>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4">
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
                  <TableRow key={emp.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
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
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl border p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Select Employee</p>
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    selectedEmployee === emp.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.empId}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedEmployee ? (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documents — {employees.find(e => e.id === selectedEmployee)?.firstName} {employees.find(e => e.id === selectedEmployee)?.lastName}
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setUploadDocOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Upload Document
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(employeeDocs[selectedEmployee] || []).map((doc, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.type} · Uploaded {doc.uploadedDate}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)}>View</Button>
                        </div>
                      ))}
                      {(!employeeDocs[selectedEmployee] || employeeDocs[selectedEmployee].length === 0) && (
                        <div className="text-center py-8">
                          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Upload employee documents like ID, contracts, certificates.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select an employee to view or manage documents.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Enter the details of the new employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input placeholder="First name" required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input placeholder="Last name" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="employee@cg.com" required />
            </div>
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
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input placeholder="e.g. Associate" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Salary (SAR)</Label>
                <Input type="number" placeholder="0" required min={1} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddEmpOpen(false)}>Cancel</Button>
              <Button type="submit">Add Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document for {employees.find(e => e.id === selectedEmployee)?.firstName} {employees.find(e => e.id === selectedEmployee)?.lastName}.</DialogDescription>
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

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>Viewing document information.</DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <p className="font-semibold">{viewDoc.name}</p>
                  <p className="text-sm text-muted-foreground">{viewDoc.type} · Uploaded {viewDoc.uploadedDate}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Document preview is not available in this demo. In production, the document would be displayed or downloadable here.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
            <Button><Download className="h-4 w-4 mr-2" />Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
